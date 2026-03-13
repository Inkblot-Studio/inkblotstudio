export const telemetryEventNames = [
	'lead_form_open',
	'lead_form_submit_attempt',
	'lead_form_submit_success',
	'lead_form_submit_error',
	'immersive_world_chapter_change',
	'immersive_world_quality_degrade',
] as const;

export type TelemetryEventName = (typeof telemetryEventNames)[number];

export type TelemetryEvent = {
	name: TelemetryEventName;
	timestamp: string;
	properties?: Record<string, string | number | boolean>;
};

export async function trackTelemetryEvent(event: TelemetryEvent): Promise<void> {
	const endpoint = import.meta.env.PUBLIC_ANALYTICS_ENDPOINT;
	if (!endpoint) return;

	await fetch(endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(event),
	}).catch(() => undefined);
}
