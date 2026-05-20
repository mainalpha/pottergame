'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    multipleStatements: true
  });
  await conn.query(sql);
  await conn.end();
  console.log('Database initialized: potters_duel');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
