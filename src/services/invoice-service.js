import { getDb } from '../db/schema.js';

let invoiceCounter = null;

function getNextInvoiceNumber() {
  const db = getDb();
  const year = new Date().getFullYear();
  if (invoiceCounter === null) {
    const last = db.prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1").all(`NF-${year}-%`);
    if (last.length > 0) {
      const num = parseInt(last[0].invoice_number.split('-')[2], 10);
      invoiceCounter = isNaN(num) ? 1 : num + 1;
    } else {
      invoiceCounter = 1;
    }
  } else {
    invoiceCounter++;
  }
  return `NF-${year}-${String(invoiceCounter).padStart(5, '0')}`;
}

export function getAll({ page = 1, limit = 10, status, company_id } = {}) {
  const db = getDb();
  let sql = 'SELECT i.*, c.name as company_name FROM invoices i LEFT JOIN companies c ON c.id = i.company_id WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND i.status = ?'; params.push(status); }
  if (company_id) { sql += ' AND i.company_id = ?'; params.push(Number(company_id)); }
  const countSql = sql.replace('SELECT i.*, c.name as company_name', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  sql += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const invoices = db.prepare(sql).all(...params).map(normalize);
  return { invoices, total, page, totalPages };
}

export function getById(id) {
  const db = getDb();
  return normalize(db.prepare('SELECT i.*, c.name as company_name FROM invoices i LEFT JOIN companies c ON c.id = i.company_id WHERE i.id = ?').get(id));
}

export function create({ company_id, contract_id, value, issue_date, due_date, payment_date, notes }) {
  const db = getDb();
  const invoiceNumber = getNextInvoiceNumber();
  const result = db.prepare(`
    INSERT INTO invoices (company_id, contract_id, invoice_number, value, issue_date, due_date, payment_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(company_id || null, contract_id || null, invoiceNumber, value || 0, issue_date || null, due_date || null, payment_date || null, notes || null);
  return getById(Number(result.lastInsertRowid));
}

export function update(id, { company_id, contract_id, value, issue_date, due_date, payment_date, status, notes }) {
  const db = getDb();
  const fields = [];
  const params = [];
  if (company_id !== undefined) { fields.push('company_id = ?'); params.push(company_id); }
  if (contract_id !== undefined) { fields.push('contract_id = ?'); params.push(contract_id); }
  if (value !== undefined) { fields.push('value = ?'); params.push(value); }
  if (issue_date !== undefined) { fields.push('issue_date = ?'); params.push(issue_date); }
  if (due_date !== undefined) { fields.push('due_date = ?'); params.push(due_date); }
  if (payment_date !== undefined) { fields.push('payment_date = ?'); params.push(payment_date); }
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }
  if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }
  fields.push("updated_at = datetime('now')");
  if (fields.length === 1) return getById(id);
  db.prepare(`UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`).run(...params, id);
  return getById(id);
}

export function delete_(id) {
  const db = getDb();
  return db.prepare('DELETE FROM invoices WHERE id = ?').run(id).changes > 0;
}

export function getSummary() {
  const db = getDb();
  const totalPending = db.prepare("SELECT COALESCE(SUM(value),0) as v FROM invoices WHERE status = 'pending'").get().v;
  const totalOverdue = db.prepare("SELECT COALESCE(SUM(value),0) as v FROM invoices WHERE status = 'pending' AND due_date < date('now')").get().v;
  const totalPaidThisMonth = db.prepare("SELECT COALESCE(SUM(value),0) as v FROM invoices WHERE status = 'paid' AND strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')").get().v;
  return {
    totalPending: parseFloat(totalPending),
    totalOverdue: parseFloat(totalOverdue),
    totalPaidThisMonth: parseFloat(totalPaidThisMonth),
  };
}

export function getOverdue() {
  const db = getDb();
  return db.prepare("SELECT i.*, c.name as company_name FROM invoices i LEFT JOIN companies c ON c.id = i.company_id WHERE i.status = 'pending' AND i.due_date < date('now') ORDER BY i.due_date ASC").all().map(normalize);
}

function normalize(i) {
  if (!i) return null;
  return { ...i, value: parseFloat(i.value || 0) };
}
