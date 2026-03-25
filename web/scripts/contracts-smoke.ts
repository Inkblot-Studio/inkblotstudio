import { z } from 'zod';
import { leadSchema } from '../src/lib/lead-schema';
import { scoreLead } from '../src/lib/server/scoring/lead-scoring';

const fixture = {
	name: 'Inkblot Test',
	email: 'ops@example.com',
	note: 'We have tried multiple tools and integrations with limited success.',
} as const;

const parsed = z.safeParse(leadSchema, fixture);
if (!parsed.success) {
	console.error('Contract smoke failed: leadSchema rejected valid fixture.');
	process.exit(1);
}

const score = scoreLead(parsed.data);
if (typeof score.score !== 'number' || score.score <= 0) {
	console.error('Contract smoke failed: scoring did not return a positive score.');
	process.exit(1);
}

console.log('Contract smoke passed:', score);
