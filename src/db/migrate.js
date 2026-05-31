import { getDb } from './schema.js';

console.log('Running database setup...');
getDb();
console.log('Database ready at ./data/crm.db');
process.exit(0);
