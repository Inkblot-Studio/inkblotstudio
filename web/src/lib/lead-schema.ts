import { z } from 'zod';

export const leadSchema = z.object({
	name: z.string().trim().min(2).max(120),
	email: z.string().email().max(200),
	note: z.string().trim().max(1000).optional().default(''),
});

export type LeadPayload = z.infer<typeof leadSchema>;

export const leadStatusSchema = z.enum(['new', 'qualified', 'needs_info', 'declined']);
export type LeadStatus = z.infer<typeof leadStatusSchema>;

export type LeadRecord = {
	id: string;
	payload: LeadPayload;
	score: number;
	status: LeadStatus;
	createdAt: string;
	updatedAt: string;
};
