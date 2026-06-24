import bcrypt from 'bcrypt';
import { getSupabase, hasSupabase } from '../db/supabase.js';

async function logActivity(userId, userName, action, entityType, entityId, entityName, details) {
  if (!hasSupabase()) return;
  try {
    const supabase = getSupabase();
    await supabase.from('activity_logs').insert({
      user_id: String(userId),
      user_name: userName,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      entity_name: entityName || null,
      details: details || null,
    });
  } catch {}
}

export { logActivity };

export async function userRoutes(app) {
  app.get('/api/users', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Users'], summary: 'Listar colaboradores' },
  }, async () => {
    const supabase = getSupabase();
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, role, cargo, funcao, active, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { users: users || [] };
  });

  app.get('/api/users/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Users'], summary: 'Obter colaborador por ID' },
  }, async (request, reply) => {
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, cargo, funcao, active, created_at, updated_at')
      .eq('id', request.params.id)
      .single();
    if (error || !user) return reply.code(404).send({ error: 'Colaborador não encontrado' });
    return { user };
  });

  app.post('/api/users', {
    preHandler: [app.requireAuth],
    schema: {
      tags: ['Users'],
      summary: 'Criar colaborador',
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' },
          cargo: { type: 'string' },
          funcao: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password, name, role, cargo, funcao } = request.body || {};
    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    if (existing) return reply.code(409).send({ error: 'Email já cadastrado' });

    const password_hash = bcrypt.hashSync(password, 10);
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash,
        name,
        role: role || 'comercial',
        cargo: cargo || null,
        funcao: funcao || null,
      })
      .select('id, email, name, role, cargo, funcao, active, created_at')
      .single();
    if (error) throw error;

    const reqUser = request.user || {};
    await logActivity(reqUser.sub || 'admin', reqUser.name || 'admin', 'create', 'user', user.id, user.name, `Criou colaborador ${user.name} (${user.email})`);

    return reply.code(201).send({ user });
  });

  app.patch('/api/users/:id', {
    preHandler: [app.requireAuth],
    schema: {
      tags: ['Users'],
      summary: 'Atualizar colaborador',
      body: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' },
          cargo: { type: 'string' },
          funcao: { type: 'string' },
          active: { type: 'integer' },
        },
      },
    },
  }, async (request, reply) => {
    const supabase = getSupabase();
    const updates = request.body || {};
    const updateData = {};

    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.cargo !== undefined) updateData.cargo = updates.cargo;
    if (updates.funcao !== undefined) updateData.funcao = updates.funcao;
    if (updates.active !== undefined) updateData.active = updates.active;
    if (updates.password) updateData.password_hash = bcrypt.hashSync(updates.password, 10);

    if (Object.keys(updateData).length === 0) return reply.code(400).send({ error: 'Nenhum campo para atualizar' });

    updateData.updated_at = new Date().toISOString();

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', request.params.id)
      .select('id, email, name, role, cargo, funcao, active, created_at, updated_at')
      .single();
    if (error || !user) return reply.code(404).send({ error: 'Colaborador não encontrado' });

    const reqUser = request.user || {};
    await logActivity(reqUser.sub || 'admin', reqUser.name || 'admin', 'update', 'user', user.id, user.name, `Atualizou colaborador ${user.name}`);

    return { user };
  });

  app.delete('/api/users/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Users'], summary: 'Remover colaborador' },
  }, async (request, reply) => {
    const supabase = getSupabase();
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', request.params.id)
      .single();
    if (!user) return reply.code(404).send({ error: 'Colaborador não encontrado' });

    if (String(request.params.id) === String((request.user || {}).sub)) {
      return reply.code(400).send({ error: 'Não é possível remover seu próprio usuário' });
    }

    const { error } = await supabase.from('users').delete().eq('id', request.params.id);
    if (error) throw error;

    const reqUser = request.user || {};
    await logActivity(reqUser.sub || 'admin', reqUser.name || 'admin', 'delete', 'user', user.id, user.name, `Removeu colaborador ${user.name} (${user.email})`);

    return { success: true };
  });
}
