import db from '../db/adapter.js';

let invoiceCounter = null;

async function getNextInvoiceNumber() {
  const year = new Date().getFullYear();
  if (invoiceCounter === null) {
    const rows = await db.raw(
      "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1",
      [`NF-${year}-%`]
    );
    if (rows.length > 0) {
      const num = parseInt(rows[0].invoice_number.split('-')[2], 10);
      invoiceCounter = isNaN(num) ? 1 : num + 1;
    } else {
      invoiceCounter = 1;
    }
  } else {
    invoiceCounter++;
  }
  return `NF-${year}-${String(invoiceCounter).padStart(5, '0')}`;
}

export async function getAll({ page = 1, limit = 10, status, company_id } = {}) {
  let sql = 'SELECT i.*, c.name as company_name FROM invoices i LEFT JOIN companies c ON c.id = i.company_id WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND i.status = ?'; params.push(status); }
  if (company_id) { sql += ' AND i.company_id = ?'; params.push(Number(company_id)); }

  const countSql = sql.replace('SELECT i.*, c.name as company_name', 'SELECT COUNT(*) as total');
  const totalRow = await db.row(countSql, params);
  const total = totalRow?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  sql += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const invoices = (await db.raw(sql, params)).map(normalize);
  return { invoices, total, page, totalPages };
}

export async function getById(id) {
  const row = await db.row(
    'SELECT i.*, c.name as company_name FROM invoices i LEFT JOIN companies c ON c.id = i.company_id WHERE i.id = ?',
    [id]
  );
  return normalize(row);
}

export async function create({ company_id, contract_id, value, issue_date, due_date, payment_date, notes }) {
  const invoiceNumber = await getNextInvoiceNumber();
  const result = await db.create('invoices', {
    company_id: company_id || null,
    contract_id: contract_id || null,
    invoice_number: invoiceNumber,
    value: value || 0,
    issue_date: issue_date || null,
    due_date: due_date || null,
    payment_date: payment_date || null,
    notes: notes || null,
  });
  return getById(result.id);
}

export async function update(id, { company_id, contract_id, value, issue_date, due_date, payment_date, status, notes }) {
  const existing = await db.get('invoices', id);
  if (!existing) return null;

  const updateData = {};
  if (company_id !== undefined) updateData.company_id = company_id;
  if (contract_id !== undefined) updateData.contract_id = contract_id;
  if (value !== undefined) updateData.value = value;
  if (issue_date !== undefined) updateData.issue_date = issue_date;
  if (due_date !== undefined) updateData.due_date = due_date;
  if (payment_date !== undefined) updateData.payment_date = payment_date;
  if (status !== undefined) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  if (Object.keys(updateData).length === 0) return getById(id);

  await db.update('invoices', id, updateData);
  return getById(id);
}

export async function delete_(id) {
  return db.delete('invoices', id);
}

export async function getSummary() {
  const [pending, overdue, paidThisMonth] = await Promise.all([
    db.row("SELECT COALESCE(SUM(value),0) as v FROM invoices WHERE status = 'pending'"),
    db.row("SELECT COALESCE(SUM(value),0) as v FROM invoices WHERE status = 'pending' AND due_date < date('now')"),
    db.row("SELECT COALESCE(SUM(value),0) as v FROM invoices WHERE status = 'paid' AND strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')"),
  ]);

  return {
    totalPending: parseFloat(pending?.v || 0),
    totalOverdue: parseFloat(overdue?.v || 0),
    totalPaidThisMonth: parseFloat(paidThisMonth?.v || 0),
  };
}

export async function getOverdue() {
  const rows = await db.raw(
    "SELECT i.*, c.name as company_name FROM invoices i LEFT JOIN companies c ON c.id = i.company_id WHERE i.status = 'pending' AND i.due_date < date('now') ORDER BY i.due_date ASC"
  );
  return rows.map(normalize);
}

function normalize(i) {
  if (!i) return null;
  return { ...i, value: parseFloat(i.value || 0) };
}
