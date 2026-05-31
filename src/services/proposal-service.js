import db from '../db/adapter.js';

export async function getAll({ page = 1, limit = 10, status, company_id } = {}) {
  let sql = 'SELECT p.*, c.name as company_name FROM proposals p LEFT JOIN companies c ON c.id = p.company_id WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND p.status = ?'; params.push(status); }
  if (company_id) { sql += ' AND p.company_id = ?'; params.push(Number(company_id)); }

  const totalRow = await db.row(sql.replace('SELECT p.*, c.name as company_name', 'SELECT COUNT(*) as total'), params);
  const total = totalRow?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const proposals = (await db.raw(sql, params)).map(normalize);
  return { proposals, total, page, totalPages };
}

export async function getById(id) {
  const row = await db.row(
    'SELECT p.*, c.name as company_name FROM proposals p LEFT JOIN companies c ON c.id = p.company_id WHERE p.id = ?',
    [id]
  );
  const proposal = normalize(row);
  if (!proposal) return null;

  const items = await db.raw('SELECT * FROM proposal_items WHERE proposal_id = ?', [id]);
  proposal.items = items.map(item => ({
    ...item,
    quantity: parseFloat(item.quantity || 0),
    unit_price: parseFloat(item.unit_price || 0),
    total: parseFloat((item.quantity || 0) * (item.unit_price || 0)),
  }));
  return proposal;
}

export async function create({ title, company_id, contact_name, valid_until, notes, items = [] }) {
  const total = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);

  // Use transaction
  return db.transaction(async (supabase) => {
    const { data: prop, error } = await supabase
      .from('proposals')
      .insert({ title, company_id: company_id || null, contact_name: contact_name || null, value: total, valid_until: valid_until || null, notes: notes || null })
      .select()
      .single();
    if (error) throw new Error(error.message);

    for (const item of items) {
      const { error: itemError } = await supabase
        .from('proposal_items')
        .insert({ proposal_id: prop.id, description: item.description, quantity: parseFloat(item.quantity) || 1, unit_price: parseFloat(item.unit_price) || 0 });
      if (itemError) throw new Error(itemError.message);
    }
    return prop;
  });
}

export async function update(id, { title, company_id, contact_name, valid_until, status, notes, items }) {
  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (company_id !== undefined) updateData.company_id = company_id;
  if (contact_name !== undefined) updateData.contact_name = contact_name;
  if (valid_until !== undefined) updateData.valid_until = valid_until;
  if (status !== undefined) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  if (items !== undefined) {
    const total = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);
    updateData.value = total;
  }

  // Use transaction for atomic update
  return db.transaction(async (supabase) => {
    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase.from('proposals').update(updateData).eq('id', id);
      if (error) throw new Error(error.message);
    }
    if (items) {
      await supabase.from('proposal_items').delete().eq('proposal_id', id);
      for (const item of items) {
        const { error } = await supabase
          .from('proposal_items')
          .insert({ proposal_id: id, description: item.description, quantity: parseFloat(item.quantity) || 1, unit_price: parseFloat(item.unit_price) || 0 });
        if (error) throw new Error(error.message);
      }
    }
    return getById(id);
  });
}

export async function delete_(id) {
  return db.transaction(async (supabase) => {
    await supabase.from('proposal_items').delete().eq('proposal_id', id);
    const { error } = await supabase.from('proposals').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  });
}

function normalize(p) {
  if (!p) return null;
  return { ...p, value: parseFloat(p.value || 0) };
}
