/**
 * Seed dos usuários no Supabase (PostgreSQL)
 * 
 * Uso: node scripts/seed-supabase.mjs
 * 
 * Pré-requisito: .env com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY configurados
 * 
 * NOTA: O admin bypass (admin/grt@admin2024) NÃO fica no banco — é uma
 * verificação direta no .env (src/config.js) que sobrescreve qualquer
 * consulta ao banco. Por isso não está incluído aqui.
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios. Configure no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  db: { schema: 'public' },
});

const users = [
  {
    email: 'vendas@grtengenharia.com.br',
    password: 'grt@vendas2024',
    name: 'Vendas GRT',
    role: 'comercial',
  },
  {
    email: 'ceo@grtengenharia.com.br',
    password: 'ceo@grt2024',
    name: 'CEO GRT',
    role: 'ceo',
  },
  {
    email: 'administracao@grtengenharia.com.br',
    password: 'adm@grt2024',
    name: 'Administração GRT',
    role: 'admin',
  },
  {
    email: 'processos@grtengenharia.com.br',
    password: 'processos@grt2024',
    name: 'Processos GRT',
    role: 'comercial',
  },
];

console.log('═══════════════════════════════════════════════════════════');
console.log('  GRT Engenharia — Seed Supabase');
console.log('═══════════════════════════════════════════════════════════\n');

for (const user of users) {
  // Verificar se já existe
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', user.email)
    .maybeSingle();

  const password_hash = bcrypt.hashSync(user.password, 10);

  if (existing) {
    // Atualizar
    const { error } = await supabase
      .from('users')
      .update({
        password_hash,
        name: user.name,
        role: user.role,
        active: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) {
      console.error(`✗  Erro ao atualizar ${user.email}: ${error.message}`);
    } else {
      console.log(`✓  Atualizado: ${user.email} (${user.role})`);
    }
  } else {
    // Inserir
    const { error } = await supabase
      .from('users')
      .insert({
        email: user.email,
        password_hash,
        name: user.name,
        role: user.role,
        active: 1,
      });

    if (error) {
      console.error(`✗  Erro ao criar ${user.email}: ${error.message}`);
    } else {
      console.log(`✓  Criado: ${user.email} (${user.role})`);
    }
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  CREDENCIAIS');
console.log('═══════════════════════════════════════════════════════════\n');

for (const user of users) {
  console.log(`📧 ${user.email}`);
  console.log(`   Senha: ${user.password}`);
  console.log(`   Role:  ${user.role}`);
  console.log(`   Nome:  ${user.name}`);
  console.log('');
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  Admin bypass (NÃO está no banco — direto do .env)');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('📧 admin');
console.log('   Senha: grt@admin2024');
console.log('   Role:  ceo (acesso total — bypassa o banco)\n');

console.log('✅ Seed concluído.');
process.exit(0);
