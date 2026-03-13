import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { leadSchema } from '../lib/lead-schema';
import { trackTelemetryEvent } from '../lib/telemetry/events';

type FormState = {
	companyName: string;
	country: string;
	industry: string;
	painPoints: string[];
	whatTried: string;
	investmentReady90Days: boolean;
	timeline: 'now' | '1-2-months' | '3-plus-months';
	role: 'owner-exec' | 'ops-lead' | 'manager' | 'other';
	workEmail: string;
	website: string;
};

type SubmitResponse = {
	ok: boolean;
	message?: string;
	error?: string;
	leadId?: string;
	status?: 'new' | 'qualified' | 'needs_info' | 'declined';
};

const painOptions = [
	'Disconnected tools',
	'Manual handoffs',
	'Slow reporting',
	'Booking and form chaos',
	'No clear workflow control',
];

const initialForm: FormState = {
	companyName: '',
	country: '',
	industry: '',
	painPoints: [],
	whatTried: '',
	investmentReady90Days: true,
	timeline: '1-2-months',
	role: 'ops-lead',
	workEmail: '',
	website: '',
};

export default function StrategyCallForm() {
	const [form, setForm] = useState<FormState>(initialForm);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [trackedOpen, setTrackedOpen] = useState(false);

	const canSubmit = useMemo(() => {
		const validation = leadSchema.safeParse(form);
		return validation.success;
	}, [form]);

	function togglePainPoint(point: string) {
		setForm((current) => {
			const alreadySelected = current.painPoints.includes(point);
			return {
				...current,
				painPoints: alreadySelected
					? current.painPoints.filter((item) => item !== point)
					: [...current.painPoints, point].slice(0, 5),
			};
		});
	}

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSuccess(null);
		trackTelemetryEvent({
			name: 'lead_form_submit_attempt',
			timestamp: new Date().toISOString(),
			properties: { page: 'home' },
		});

		const validation = leadSchema.safeParse(form);
		if (!validation.success) {
			setError('Please complete all required fields before submitting.');
			trackTelemetryEvent({
				name: 'lead_form_submit_error',
				timestamp: new Date().toISOString(),
				properties: { reason: 'validation' },
			});
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
				trackTelemetryEvent({
					name: 'lead_form_submit_error',
					timestamp: new Date().toISOString(),
					properties: { reason: data.error ?? 'unknown', status: response.status },
				});
				return;
			}

			setSuccess(
				data.leadId
					? `${data.message ?? 'Submitted successfully.'} Reference: ${data.leadId}. Status: ${data.status ?? 'new'}`
					: (data.message ?? 'Submitted successfully.'),
			);
			trackTelemetryEvent({
				name: 'lead_form_submit_success',
				timestamp: new Date().toISOString(),
				properties: { hasLeadId: Boolean(data.leadId) },
			});
			setForm(initialForm);
		} catch {
			setError('Network error. Please try again in a moment.');
			trackTelemetryEvent({
				name: 'lead_form_submit_error',
				timestamp: new Date().toISOString(),
				properties: { reason: 'network' },
			});
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form
			onSubmit={onSubmit}
			onFocus={() => {
				if (trackedOpen) return;
				setTrackedOpen(true);
				trackTelemetryEvent({
					name: 'lead_form_open',
					timestamp: new Date().toISOString(),
					properties: { page: 'home' },
				});
			}}
			className="section-card mt-8 rounded-2xl p-6"
		>
			<div className="grid gap-4 md:grid-cols-2">
				<input
					value={form.website}
					onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
					className="hidden"
					tabIndex={-1}
					autoComplete="off"
					aria-hidden="true"
				/>
				<label className="text-sm">
					Company Name
					<input
						value={form.companyName}
						onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
						className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2"
						required
					/>
				</label>
				<label className="text-sm">
					Work Email
					<input
						type="email"
						value={form.workEmail}
						onChange={(event) => setForm((current) => ({ ...current, workEmail: event.target.value }))}
						className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2"
						required
					/>
				</label>
				<label className="text-sm">
					Country
					<input
						value={form.country}
						onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
						className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2"
						required
					/>
				</label>
				<label className="text-sm">
					Industry
					<input
						value={form.industry}
						onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))}
						className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2"
						required
					/>
				</label>
				<label className="text-sm md:col-span-2">
					What have you already tried?
					<textarea
						value={form.whatTried}
						onChange={(event) => setForm((current) => ({ ...current, whatTried: event.target.value }))}
						className="mt-2 min-h-24 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2"
						required
					/>
				</label>
			</div>

			<div className="mt-5">
				<p className="text-sm">Main pain points</p>
				<div className="mt-2 flex flex-wrap gap-2">
					{painOptions.map((option) => {
						const active = form.painPoints.includes(option);
						return (
							<button
								key={option}
								type="button"
								onClick={() => togglePainPoint(option)}
								className={clsx(
									'rounded-full border px-3 py-1 text-sm transition',
									active
										? 'border-inkblot-cyan bg-inkblot-cyan/10 text-inkblot-cyan-soft'
										: 'border-white/20 text-white hover:border-inkblot-cyan/60',
								)}
							>
								{option}
							</button>
						);
					})}
				</div>
			</div>

			<div className="mt-5 grid gap-4 md:grid-cols-3">
				<label className="text-sm">
					Timeline
					<select
						value={form.timeline}
						onChange={(event) =>
							setForm((current) => ({
								...current,
								timeline: event.target.value as FormState['timeline'],
							}))
						}
						className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2"
					>
						<option value="now">Now</option>
						<option value="1-2-months">1-2 months</option>
						<option value="3-plus-months">3+ months</option>
					</select>
				</label>
				<label className="text-sm">
					Your Role
					<select
						value={form.role}
						onChange={(event) =>
							setForm((current) => ({ ...current, role: event.target.value as FormState['role'] }))
						}
						className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2"
					>
						<option value="owner-exec">Owner / Executive</option>
						<option value="ops-lead">Operations Lead</option>
						<option value="manager">Manager</option>
						<option value="other">Other</option>
					</select>
				</label>
				<label className="flex items-end gap-2 text-sm">
					<input
						type="checkbox"
						checked={form.investmentReady90Days}
						onChange={(event) =>
							setForm((current) => ({ ...current, investmentReady90Days: event.target.checked }))
						}
						className="h-4 w-4"
					/>
					Ready to invest in the next 90 days
				</label>
			</div>

			{error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
			{success ? <p className="mt-4 text-sm text-emerald-300">{success}</p> : null}

			<button
				type="submit"
				disabled={submitting || !canSubmit}
				className={clsx(
					'mt-6 rounded-full px-6 py-3 text-sm font-semibold transition',
					submitting || !canSubmit
						? 'cursor-not-allowed bg-slate-600 text-slate-300'
						: 'bg-inkblot-cyan text-slate-950 hover:bg-inkblot-cyan-soft',
				)}
			>
				{submitting ? 'Submitting...' : 'Request Strategy Review'}
			</button>
		</form>
	);
}
