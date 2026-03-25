import { useState } from 'react';
import { z } from 'zod';
import { leadSchema } from '../lib/lead-schema';
import { trackTelemetryEvent } from '../lib/telemetry/events';

type FormState = {
	name: string;
	email: string;
	note: string;
};

type SubmitResponse = {
	ok: boolean;
	message?: string;
	error?: string;
	leadId?: string;
	status?: string;
};

export default function StrategyCallForm() {
	const [form, setForm] = useState<FormState>({ name: '', email: '', note: '' });
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const canSubmit = form.name.trim().length >= 2 && form.email.includes('@');

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSuccess(null);
		trackTelemetryEvent({
			name: 'lead_form_submit_attempt',
			timestamp: new Date().toISOString(),
			properties: { page: 'home' },
		});

		const validation = z.safeParse(leadSchema, form);
		if (!validation.success) {
			setError('Please complete all required fields.');
			return;
		}

		try {
			setSubmitting(true);
			const response = await fetch('/api/lead', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(validation.data),
			});

			const data = (await response.json()) as SubmitResponse;
			if (!response.ok || !data.ok) {
				setError(data.error ?? 'We could not submit your request. Please try again.');
				return;
			}

			setSuccess(data.message ?? 'Submitted successfully.');
			setForm({ name: '', email: '', note: '' });
		} catch {
			setError('Network error. Please try again.');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form onSubmit={onSubmit} className="section-card mt-8 rounded-2xl p-6">
			<div className="flex flex-col gap-4">
				<label className="text-sm">
					Name
					<input
						value={form.name}
						onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
						className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2"
						required
						minLength={2}
					/>
				</label>
				<label className="text-sm">
					Email
					<input
						type="email"
						value={form.email}
						onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
						className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2"
						required
					/>
				</label>
				<label className="text-sm">
					Note
					<textarea
						value={form.note}
						onChange={(e) => setForm((c) => ({ ...c, note: e.target.value }))}
						className="mt-2 min-h-20 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2"
						placeholder="Optional"
						rows={3}
					/>
				</label>
			</div>

			{error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
			{success ? <p className="mt-4 text-sm text-emerald-300">{success}</p> : null}

			<button
				type="submit"
				disabled={submitting || !canSubmit}
				className={
					submitting || !canSubmit
						? 'mt-6 cursor-not-allowed rounded-full bg-slate-600 px-6 py-3 text-sm font-semibold text-slate-300'
						: 'mt-6 rounded-full bg-inkblot-cyan px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-inkblot-cyan-soft'
				}
			>
				{submitting ? 'Submitting...' : 'Submit'}
			</button>
		</form>
	);
}
