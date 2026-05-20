'use strict';

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'potters_duel',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

async function ping() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    return true;
  } finally {
    conn.release();
  }
}

async function getUserByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT id, username, email, password_hash, avatar_url, house, wins, losses, points FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

async function getUserByUsername(username) {
  const [rows] = await pool.execute(
    'SELECT id, username, email, password_hash, avatar_url, house, wins, losses, points FROM users WHERE username = ? LIMIT 1',
    [username]
  );
  return rows[0] || null;
}

async function getUserById(userId) {
  const [rows] = await pool.execute(
    'SELECT id, username, email, avatar_url, house, wins, losses, points FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows[0] || null;
}

async function createUser(username, email, passwordHash, house) {
  const [result] = await pool.execute(
    'INSERT INTO users (username, email, password_hash, house) VALUES (?, ?, ?, ?)',
    [username, email, passwordHash, house || 'gryffindor']
  );
  return result.insertId;
}

async function updateUserPassword(userId, newHashedPassword) {
  const [result] = await pool.execute(
    'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
    [newHashedPassword, userId]
  );
  return result.affectedRows > 0;
}

async function setResetToken(userId, token, expiresAt) {
  const [result] = await pool.execute(
    'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
    [token, expiresAt, userId]
  );
  return result.affectedRows > 0;
}

/**
 * Card IDs used in the user's last N completed matches (cooldown lock).
 */
async function getAllCards() {
  const baseSql = `SELECT id, name, power, attack, defense, cost, side, description, image_url
     FROM cards
     WHERE side IN ('good', 'evil')
     ORDER BY id`;
  const sqlWithAlias = `SELECT id, name, alias, power, attack, defense, cost, side, description, image_url
     FROM cards
     WHERE side IN ('good', 'evil')
     ORDER BY id`;

  try {
    const [rows] = await pool.execute(sqlWithAlias);
    return rows;
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    const [rows] = await pool.execute(baseSql);
    return rows.map((row) => ({ ...row, alias: null }));
  }
}

let gameRoundsInitialized = false;
async function ensureGameRoundsTable() {
  if (gameRoundsInitialized) return;

  await pool.execute(
    `CREATE TABLE IF NOT EXISTS game_rounds (
      id INT AUTO_INCREMENT PRIMARY KEY,
      match_id INT NOT NULL,
      round_number INT NOT NULL,
      player_id INT NOT NULL,
      card_id INT NOT NULL,
      power INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
      INDEX idx_match_id (match_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  gameRoundsInitialized = true;
}

async function getLockedCardIds(userId, matchCount = 3) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return [];

  await ensureGameRoundsTable();

  const [rows] = await pool.execute(
    `SELECT DISTINCT gr.card_id
     FROM game_rounds gr
     INNER JOIN matches m ON m.id = gr.match_id
     WHERE gr.player_id = ?
       AND m.status = 'completed'
       AND m.id IN (
         SELECT id FROM (
           SELECT id FROM matches
           WHERE status = 'completed'
             AND (player1_id = ? OR player2_id = ? OR player3_id = ? OR player4_id = ?)
           ORDER BY COALESCE(completed_at, created_at) DESC
           LIMIT ?
         ) AS recent_matches
       )`,
    [uid, uid, uid, uid, uid, matchCount]
  );

  return rows.map((r) => String(r.card_id));
}

async function recordCardUsage(userId, cardId, matchId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return;

  const numericCardId = parseInt(String(cardId).replace(/\D/g, ''), 10) || null;
  if (!numericCardId) return;

  let dbMatchId = null;
  if (String(matchId).startsWith('db_')) {
    dbMatchId = parseInt(String(matchId).slice(3), 10);
  }

  if (!dbMatchId) return;

  await ensureGameRoundsTable();

  await pool.execute(
    'INSERT INTO game_rounds (match_id, round_number, player_id, card_id, power) VALUES (?, 1, ?, ?, 0)',
    [dbMatchId, uid, numericCardId]
  );
}

async function createMatchRecord({ mode, playerIds, status = 'active' }) {
  const ids = playerIds
    .filter((p) => p !== 'BOT_WIZARD')
    .map((p) => Number(p))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (ids.length < 2) return null;

  const [p1, p2, p3, p4] = [ids[0], ids[1], ids[2] || null, ids[3] || null];

  const [result] = await pool.execute(
    `INSERT INTO matches (game_mode, player1_id, player2_id, player3_id, player4_id, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [mode, p1, p2, p3, p4, status]
  );

  return result.insertId;
}

async function isUsernameTaken(username, excludeUserId) {
  const user = await getUserByUsername(username);
  if (!user) return false;
  return Number(user.id) !== Number(excludeUserId);
}

async function updateUserProfile(userId, { username, avatarUrl }) {
  const fields = [];
  const values = [];

  if (username !== undefined) {
    fields.push('username = ?');
    values.push(username);
  }
  if (avatarUrl !== undefined) {
    fields.push('avatar_url = ?');
    values.push(avatarUrl);
  }

  if (fields.length === 0) return false;

  values.push(userId);
  const [result] = await pool.execute(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return result.affectedRows > 0;
}

function parseDbUserId(userId) {
  if (userId == null || userId === 'BOT_WIZARD') return null;
  const n = Number(userId);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function awardMatchStats(winnerId, loserId) {
  const winner = parseDbUserId(winnerId);
  const loser = parseDbUserId(loserId);

  if (winner) {
    await pool.execute(
      'UPDATE users SET wins = wins + 1, points = points + 10 WHERE id = ?',
      [winner]
    );
  }
  if (loser) {
    await pool.execute('UPDATE users SET losses = losses + 1 WHERE id = ?', [loser]);
  }

  return { winner, loser };
}

async function completeMatch(dbMatchId, winnerId, loserId, finalHp = {}) {
  if (!dbMatchId) return false;

  const winner = parseDbUserId(winnerId);
  const loser = parseDbUserId(loserId);

  const hpValues = Object.values(finalHp);
  const p1Hp = hpValues[0] ?? null;
  const p2Hp = hpValues[1] ?? null;

  await pool.execute(
    `UPDATE matches
     SET status = 'completed', winner_id = ?, completed_at = NOW(),
         player1_final_hp = ?, player2_final_hp = ?
     WHERE id = ?`,
    [winner, p1Hp, p2Hp, dbMatchId]
  );

  await awardMatchStats(winnerId, loserId);

  return true;
}

module.exports = {
  pool,
  ping,
  getUserByEmail,
  getUserByUsername,
  getUserById,
  createUser,
  updateUserPassword,
  setResetToken,
  getAllCards,
  getLockedCardIds,
  recordCardUsage,
  createMatchRecord,
  completeMatch,
  awardMatchStats,
  parseDbUserId,
  isUsernameTaken,
  updateUserProfile
};
