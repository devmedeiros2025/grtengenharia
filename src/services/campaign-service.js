import db from '../db/adapter.js';

export async function getAll({ page = 1, limit = 10, status, type } = {}) {
  let sql = 'SELECT * FROM campaigns WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  const totalRow = await db.row(sql.replace('SELECT *', 'SELECT COUNT(*) as total'), params);
  const total = totalRow?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const campaigns = (await db.raw(sql, params)).map(normalize);
  return { campaigns, total, page, totalPages };
}

export async function getById(id) {
  const row = await db.row('SELECT * FROM campaigns WHERE id = ?', [id]);
  const campaign = normalize(row);
  if (!campaign) return null;
  const targets = await db.raw('SELECT * FROM campaign_targets WHERE campaign_id = ?', [id]);
  campaign.targets = targets || [];
  return campaign;
}

export async function create({ name, type, status, segment, subject, content, scheduled_at }) {
  const result = await db.create('campaigns', {
    name, type: type || 'email', status: status || 'draft',
    segment: segment || null, subject: subject || null,
    content: content || null, scheduled_at: scheduled_at || null,
  });
  return getById(result.id);
}

export async function update(id, data) {
  const existing = await db.get('campaigns', id);
  if (!existing) return null;
  await db.update('campaigns', id, data);
  return getById(id);
}

export async function delete_(id) {
  await db.exec('DELETE FROM campaign_targets WHERE campaign_id = ?', [id]);
  const result = await db.delete('campaigns', id);
  return result;
}

export async function addTarget(campaign_id, { email, lead_id, company_id }) {
  return db.create('campaign_targets', {
    campaign_id, email: email || null,
    lead_id: lead_id || null, company_id: company_id || null,
  });
}

export async function removeTarget(id) {
  return db.delete('campaign_targets', id);
}

function normalize(c) {
  if (!c) return null;
  return { ...c, budget: parseFloat(c.budget || 0), sent_count: c.sent_count || 0, opened_count: c.opened_count || 0, clicked_count: c.clicked_count || 0, replied_count: c.replied_count || 0 };
}
