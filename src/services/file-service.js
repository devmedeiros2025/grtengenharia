import { mkdirSync, existsSync, unlinkSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { getDb } from '../db/schema.js';
import { config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = join(__dirname, '..', '..', 'uploads');

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function saveFile(buffer, originalName, mimeType, { leadId, companyId, dealId, contractId } = {}) {
  const ext = originalName.split('.').pop() || 'bin';
  const filename = `${randomUUID()}.${ext}`;
  const filepath = join(UPLOAD_DIR, filename);

  writeFileSync(filepath, buffer);

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO attachments (lead_id, company_id, deal_id, contract_id, filename, original_name, mime_type, size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(leadId || null, companyId || null, dealId || null, contractId || null, filename, originalName, mimeType, buffer.length);

  return {
    id: result.lastInsertRowid,
    filename,
    original_name: originalName,
    mime_type: mimeType,
    size: buffer.length,
  };
}

export function getFile(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM attachments WHERE id = ?').get(id);
}

export function getFileBuffer(filename) {
  const filepath = join(UPLOAD_DIR, filename);
  if (!existsSync(filepath)) return null;
  return readFileSync(filepath);
}

export function listFiles({ leadId, companyId, dealId, contractId } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (leadId) { conditions.push('lead_id = ?'); params.push(leadId); }
  if (companyId) { conditions.push('company_id = ?'); params.push(companyId); }
  if (dealId) { conditions.push('deal_id = ?'); params.push(dealId); }
  if (contractId) { conditions.push('contract_id = ?'); params.push(contractId); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : '';
  return db.prepare(`SELECT * FROM attachments ${where} ORDER BY created_at DESC`).all(...params);
}

export function deleteFile(id) {
  const file = getFile(id);
  if (!file) return false;

  const filepath = join(UPLOAD_DIR, file.filename);
  try { unlinkSync(filepath); } catch {}

  const db = getDb();
  db.prepare('DELETE FROM attachments WHERE id = ?').run(id);
  return true;
}
