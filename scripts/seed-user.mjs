/**
 * Seed script: cria um usuário no banco local.
 * Uso: node scripts/seed-user.mjs <email> <password> [name] [role]
 *
 * Roles válidas: ceo, admin, comercial, developer
 *
 * Exemplo:
 *   node scripts/seed-user.mjs aldeiaupmkt@gmail.com Rebeca15@# "Rebeca" comercial
 */
import 'dotenv/config';
import { getDb } from '../src/db/schema.js';
import bcrypt from 'bcrypt';

const [email, password, name, role] = process.argv.slice(2);

if (!email || !password) {
  console.error('Uso: node scripts/seed-user.mjs <email> <password> [name] [role]');
  console.error('Roles: ceo, admin, comercial, developer');
  process.exit(1);
}

const validRoles = ['ceo', 'admin', 'comercial', 'developer'];
const userRole = role && validRoles.includes(role) ? role : 'comercial';

// Run schema migrations (creates/updates tables including `users`)
const db = getDb();

// Check if user already exists
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  const hash = bcrypt.hashSync(password, 10);
  db.prepare("UPDATE users SET password_hash = ?, role = ?, updated_at = datetime('now') WHERE id = ?").run(hash, userRole, existing.id);
  console.log(`✓  User updated: ${email} (role: ${userRole})`);
} else {
  const hash = bcrypt.hashSync(password, 10);
  const displayName = name || email.split('@')[0];
  db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)').run(email, hash, displayName, userRole);
  console.log(`✓  User created: ${email} (${displayName}, role: ${userRole})`);
}

process.exit(0);
