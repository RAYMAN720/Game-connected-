const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'connected_games',
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDatabase(maxRetries = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      console.log('Connessione MySQL pronta');
      return;
    } catch (error) {
      console.log(`Waiting for MySQL (${attempt}/${maxRetries})...`);
      if (attempt === maxRetries) {
        throw error;
      }
      await sleep(delayMs);
    }
  }
}

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function pingDatabase() {
  await pool.query('SELECT 1');
}

module.exports = {
  pool,
  pingDatabase,
  query,
  waitForDatabase
};
