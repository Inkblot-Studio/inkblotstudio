import { Pool } from 'pg';
import type { LeadRecord, LeadStatus } from '../../lead-schema';

const memoryStore = new Map<string, LeadRecord>();
let poolInstance: Pool | null = null;

function getPool(): Pool | null {
	const connectionString = import.meta.env.DATABASE_URL;
	if (!connectionString) return null;
	if (poolInstance) return poolInstance;
	poolInstance = new Pool({ connectionString, max: 10, idleTimeoutMillis: 10_000 });
	return poolInstance;
}

export async function insertLeadRecord(record: LeadRecord): Promise<void> {
	const pool = getPool();
	if (!pool) {
		memoryStore.set(record.id, record);
		return;
	}

	await pool.query(
		`INSERT INTO leads (id, payload, score, status, created_at, updated_at)
		 VALUES ($1, $2::jsonb, $3, $4, $5, $6)`,
		[record.id, JSON.stringify(record.payload), record.score, record.status, record.createdAt, record.updatedAt],
	);
}

export async function updateLeadStatusRecord(leadId: string, status: LeadStatus): Promise<void> {
	const pool = getPool();
	if (!pool) {
		const current = memoryStore.get(leadId);
		if (!current) return;
		memoryStore.set(leadId, { ...current, status, updatedAt: new Date().toISOString() });
		return;
	}

	await pool.query(`UPDATE leads SET status = $2, updated_at = NOW() WHERE id = $1`, [leadId, status]);
}

export async function insertLeadAudit(leadId: string, message: string): Promise<void> {
	const pool = getPool();
	if (!pool) return;

	await pool.query(
		`INSERT INTO lead_audit (id, lead_id, message, created_at)
		 VALUES ($1, $2, $3, $4)`,
		[crypto.randomUUID(), leadId, message, new Date().toISOString()],
	);
}
