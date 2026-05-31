import db from '../db/adapter.js';

function calcSla(level) {
  const now = new Date();
  switch (level) {
    case 3: return new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();
    case 2: return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    default: return new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  }
}

export async function getAll({ page = 1, limit = 10, status, priority, category } = {}) {
  let sql = 'SELECT t.*, c.name as company_name FROM tickets t LEFT JOIN companies c ON c.id = t.company_id WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (priority) { sql += ' AND t.priority = ?'; params.push(priority); }
  if (category) { sql += ' AND t.category = ?'; params.push(category); }

  const totalRow = await db.row(sql.replace('SELECT t.*, c.name as company_name', 'SELECT COUNT(*) as total'), params);
  const total = totalRow?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const tickets = (await db.raw(sql, params)).map(normalize);
  return { tickets, total, page, totalPages };
}

export async function getById(id) {
  const row = await db.row(
    'SELECT t.*, c.name as company_name FROM tickets t LEFT JOIN companies c ON c.id = t.company_id WHERE t.id = ?',
    [id]
  );
  const ticket = normalize(row);
  if (!ticket) return null;

  const messages = await db.raw('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC', [id]);
  ticket.messages = messages || [];
  return ticket;
}

export async function create({ title, description, company_id, contact_name, contact_email, contact_phone, category, priority, level, notes }) {
  const sla = calcSla(parseInt(level) || 1);
  const result = await db.create('tickets', {
    title, description: description || null, company_id: company_id || null,
    contact_name: contact_name || null, contact_email: contact_email || null,
    contact_phone: contact_phone || null, category: category || 'support',
    priority: priority || 'medium', level: parseInt(level) || 1,
    sla_deadline: sla, notes: notes || null,
  });
  return getById(result.id);
}

export async function update(id, data) {
  const updateData = {};
  for (const key of ['title', 'description', 'company_id', 'contact_name', 'contact_email', 'contact_phone', 'category', 'priority', 'level', 'status', 'assigned_to', 'notes']) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }
  if (data.status === 'resolved') updateData.resolved_at = new Date().toISOString();
  if (data.status === 'closed') updateData.closed_at = new Date().toISOString();
  if (Object.keys(updateData).length === 0) return getById(id);

  await db.update('tickets', id, updateData);
  return getById(id);
}

export async function delete_(id) {
  return db.transaction(async (supabase) => {
    if (supabase) {
      await supabase.from('ticket_messages').delete().eq('ticket_id', id);
      const { error } = await supabase.from('tickets').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    } else {
      const dbSync = await import('../db/schema.js').then(m => m.getDb());
      const tx = dbSync.transaction(() => {
        dbSync.prepare('DELETE FROM ticket_messages WHERE ticket_id = ?').run(id);
        return dbSync.prepare('DELETE FROM tickets WHERE id = ?').run(id).changes > 0;
      });
      return tx();
    }
  });
}

export async function addMessage(ticket_id, { author, message, is_internal }) {
  const result = await db.create('ticket_messages', {
    ticket_id,
    author: author || 'Sistema',
    message,
    is_internal: is_internal ? 1 : 0,
  });
  return result;
}

export async function getSlaStats() {
  const totalRow = await db.row("SELECT COUNT(*) as c FROM tickets WHERE status NOT IN ('closed', 'cancelled')");
  const withinSlaRow = await db.row("SELECT COUNT(*) as c FROM tickets WHERE status NOT IN ('closed', 'cancelled') AND sla_deadline > datetime('now')");
  const total = totalRow?.c || 1;
  const withinSla = withinSlaRow?.c || 0;
  return {
    total,
    withinSla,
    breached: total - withinSla,
    rate: parseFloat(((withinSla / total) * 100).toFixed(1)),
  };
}

function normalize(t) {
  if (!t) return null;
  return { ...t, level: t.level || 1 };
}
