import type { LeadPayload, LeadStatus } from '../../lead-schema';

export type LeadScoreResult = {
	score: number;
	initialStatus: LeadStatus;
};

export function scoreLead(payload: LeadPayload): LeadScoreResult {
	let score = 50;
	if (payload.note && payload.note.length > 20) score += 15;
	const initialStatus: LeadStatus = score >= 60 ? 'qualified' : 'new';
	return { score, initialStatus };
}
