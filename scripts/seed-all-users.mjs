/**
 * Seed script: cria todos os usuários do CRM GRT Engenharia
 * Uso: node scripts/seed-all-users.mjs
 *
 * Usuários:
 *   - ceo@grtengenharia.com.br (CEO - acesso total)
 *   - administracao@grtengenharia.com.br (Admin - BI, Faturamento, Propostas, Obras, Locação)
 *   - processos@grtengenharia.com.br (Marketing/Comercial - Pipeline, Kanban, Leads, Tarefas, Contratos)
 */
import 'dotenv/config';
import { getDb } from '../src/db/schema.js';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  const length = 12;
  let password = '';
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

const users = [
  { email: 'ceo@grtengenharia.com.br', name: 'CEO GRT', role: 'ceo' },
  { email: 'administracao@grtengenharia.com.br', name: 'Administração GRT', role: 'admin' },
  { email: 'processos@grtengenharia.com.br', name: 'Processos GRT', role: 'comercial' },
];

const db = getDb();

console.log('═══════════════════════════════════════════════════════════');
console.log('  GRT Engenharia — Seed de Usuários');
console.log('═══════════════════════════════════════════════════════════\n');

const credentials = [];

for (const user of users) {
  const password = generatePassword();
  const hash = bcrypt.hashSync(password, 10);
  
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(user.email);
  if (existing) {
    db.prepare("UPDATE users SET password_hash = ?, role = ?, name = ?, updated_at = datetime('now') WHERE id = ?").run(hash, user.role, user.name, existing.id);
    console.log(`✓  Atualizado: ${user.email} (${user.role})`);
  } else {
    db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)').run(user.email, hash, user.name, user.role);
    console.log(`✓  Criado: ${user.email} (${user.role})`);
  }
  
  credentials.push({ email: user.email, password, role: user.role, name: user.name });
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  CREDENCIAIS GERADAS');
console.log('═══════════════════════════════════════════════════════════\n');

for (const cred of credentials) {
  console.log(`📧 ${cred.email}`);
  console.log(`   Senha: ${cred.password}`);
  console.log(`   Role:  ${cred.role}`);
  console.log(`   Nome:  ${cred.name}`);
  console.log('');
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  PERMISSÕES POR MÓDULO');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('  Dashboard:        Todos');
console.log('  Pipeline:         CEO, Comercial');
console.log('  Kanban Comercial: CEO, Comercial');
console.log('  Leads:            CEO, Comercial');
console.log('  Tarefas:          CEO, Comercial');
console.log('  Contratos:        CEO, Comercial');
console.log('  BI Analytics:     CEO, Admin');
console.log('  Faturamento:      CEO, Admin');
console.log('  Propostas:        CEO, Admin');
console.log('  Obras:            CEO, Admin');
console.log('  Locação:          CEO, Admin');
console.log('  Dev/Suporte:      CEO, Developer');
console.log('  Hunter:           CEO, Developer (dentro de Dev/Suporte)');
console.log('');

process.exit(0);
