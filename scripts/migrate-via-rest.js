import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = 'https://zypbvevdjojianzknuoc.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5cGJ2ZXZkam9qaWFuemtudW9jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjA0NDY2NywiZXhwIjoyMDk3NjIwNjY3fQ.OUas1yZAZVBnpWY14DfYL3cMM3MTGSuh9qycg75weg0';

const supabase = createClient(supabaseUrl, serviceKey);

const migrationFiles = [
  '00001_initial_schema.sql',
  '001_users_and_activity_logs.sql',
];

async function runMigration() {
  console.log('Conectado ao Supabase via REST API...');
  
  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, '..', 'supabase', 'migrations', file);
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`Executando: ${file}`);
      
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        console.error(`  Erro: ${error.message}`);
      } else {
        console.log(`  OK: ${file}`);
      }
    } else {
      console.log(`  Arquivo não encontrado: ${file}`);
    }
  }
  
  console.log('Migração concluída!');
}

runMigration();
