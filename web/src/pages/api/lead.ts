import type { APIRoute } from 'astro';
import { leadSchema } from '../../lib/lead-schema';
import { routeLeadForManualReview } from '../../lib/server/lead-routing';
import { scoreLead } from '../../lib/server/scoring/lead-scoring';
import { insertLeadAudit, insertLeadRecord } from '../../lib/server/persistence/lead-repository';
import { enqueueLead } from '../../lib/server/queue/lead-queue';
import { getOrCreateRequestId } from '../../lib/server/request-id';
import { isRateLimited } from '../../lib/server/rate-limit';
import { logger } from '../../lib/observability/logger';
import { captureServerError, initSentry } from '../../lib/observability/sentry';

export const POST: APIRoute = async ({ request, clientAddress }) => {
	initSentry();
	const requestId = getOrCreateRequestId(request);
	const ipHeader = request.headers.get('x-forwarded-for');
	const ip = clientAddress ?? ipHeader?.split(',')[0]?.trim() ?? 'unknown';

	if (await isRateLimited(`lead:${ip}`)) {
		return new Response(JSON.stringify({ ok: false, error: 'Too many requests. Please retry shortly.' }), {
			status: 429,
			headers: { 'Content-Type': 'application/json', 'x-request-id': requestId },
		});
	}

	try {
		const rawBody = await request.json();
		const parsed = leadSchema.safeParse(rawBody);

		if (!parsed.success) {
			return new Response(
				JSON.stringify({
					ok: false,
					error: 'Invalid payload',
					issues: parsed.error.issues.map((issue) => ({
						path: issue.path.join('.'),
						message: issue.message,
					})),
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json', 'x-request-id': requestId },
				},
			);
		}

		const { score, initialStatus } = scoreLead(parsed.data);
		const record = {
			id: crypto.randomUUID(),
			payload: parsed.data,
			score,
			status: initialStatus,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		await insertLeadRecord(record);
		await insertLeadAudit(record.id, `Lead accepted with initial status ${initialStatus} and score ${score}`);
		const queueMode = await enqueueLead(record);

		let destination = 'queue';
		if (queueMode === 'direct') {
			const routing = await routeLeadForManualReview(record);
			destination = routing.destination;
		}

		logger.info({ requestId, leadId: record.id, queueMode, score }, 'Lead captured');

		return new Response(
			JSON.stringify({
				ok: true,
				message: 'Lead submitted for manual review.',
				leadId: record.id,
				status: record.status,
				destination,
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json', 'x-request-id': requestId },
			},
		);
	} catch (error) {
		logger.error({ requestId }, 'Lead submit failed');
		captureServerError(error, { requestId, route: 'api/lead' });
		return new Response(JSON.stringify({ ok: false, error: 'Unexpected server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json', 'x-request-id': requestId },
		});
	}
};
