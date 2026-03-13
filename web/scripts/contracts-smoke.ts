import { leadSchema } from '../src/lib/lead-schema';
import { scoreLead } from '../src/lib/server/scoring/lead-scoring';

const fixture = {
	companyName: 'Inkblot Test',
	country: 'Bulgaria',
	industry: 'Professional Services',
	painPoints: ['Disconnected tools', 'Manual handoffs'],
	whatTried: 'We have tried multiple tools and integrations with limited success.',
	investmentReady90Days: true,
	timeline: '1-2-months',
	role: 'ops-lead',
	workEmail: 'ops@example.com',
	website: '',
} as const;

const parsed = leadSchema.safeParse(fixture);
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
