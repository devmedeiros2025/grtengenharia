import { mkdirSync, existsSync, unlinkSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import db from '../db/adapter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = join(__dirname, '..', '..', 'uploads');

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function saveFile(buffer, originalName, mimeType, { leadId, companyId, dealId, contractId } = {}) {
  const ext = originalName.split('.').pop() || 'bin';
  const filename = `${randomUUID()}.${ext}`;
  const filepath = join(UPLOAD_DIR, filename);

  writeFileSync(filepath, buffer);

  const result = await db.create('attachments', {
    lead_id: leadId || null, company_id: companyId || null, deal_id: dealId || null,
    contract_id: contractId || null, filename, original_name: originalName,
    mime_type: mimeType, size: buffer.length,
  });

  return {
    id: result.id,
    filename,
    original_name: originalName,
    mime_type: mimeType,
    size: buffer.length,
  };
}

export async function getFile(id) {
  return db.get('attachments', id);
}

export function getFileBuffer(filename) {
  const filepath = join(UPLOAD_DIR, filename);
  if (!existsSync(filepath)) return null;
  return readFileSync(filepath);
}

export async function listFiles({ leadId, companyId, dealId, contractId } = {}) {
  const conditions = [];
  const params = [];

  if (leadId) { conditions.push('lead_id = ?'); params.push(leadId); }
  if (companyId) { conditions.push('company_id = ?'); params.push(companyId); }
  if (dealId) { conditions.push('deal_id = ?'); params.push(dealId); }
  if (contractId) { conditions.push('contract_id = ?'); params.push(contractId); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : '';
  return db.raw(`SELECT * FROM attachments ${where} ORDER BY created_at DESC`, params);
}

export async function deleteFile(id) {
  const file = await getFile(id);
  if (!file) return false;

  const filepath = join(UPLOAD_DIR, file.filename);
  try { unlinkSync(filepath); } catch {}

  await db.delete('attachments', id);
  return true;
}
