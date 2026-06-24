import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { Pool } = pg;

const pool = new Pool({
  host: 'db.zypbvevdjojianzknuoc.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '&5kYgjNzpmhm7K5',
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  family: 4,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Conectado ao novo Supabase...');
    
    const migrationFiles = [
      '00001_initial_schema.sql',
      '001_users_and_activity_logs.sql',
    ];
    
    for (const file of migrationFiles) {
      const filePath = path.join(__dirname, '..', 'supabase', 'migrations', file);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf-8');
        console.log(`Executando: ${file}`);
        await client.query(sql);
        console.log(`  OK: ${file}`);
      } else {
        console.log(`  Arquivo não encontrado: ${file}`);
      }
    }
    
    console.log('Migração concluída com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
