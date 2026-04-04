const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'etymology-net-secret-' + Date.now();

// ============================================================
//  DATABASE
// ============================================================
const db = new Database(path.join(__dirname, 'data', 'etymology.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    node_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    note TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, node_id)
  );
  CREATE TABLE IF NOT EXISTS study_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    node_id TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_fav_user ON favorites(user_id);
  CREATE INDEX IF NOT EXISTS idx_hist_user ON study_history(user_id);
`);

// Prepared statements
const stmts = {
  createUser: db.prepare('INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)'),
  findUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  findUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  findUserById: db.prepare('SELECT id, username, email, display_name, created_at FROM users WHERE id = ?'),
  addFavorite: db.prepare('INSERT OR IGNORE INTO favorites (user_id, node_id, node_type, note) VALUES (?, ?, ?, ?)'),
  removeFavorite: db.prepare('DELETE FROM favorites WHERE user_id = ? AND node_id = ?'),
  getFavorites: db.prepare('SELECT node_id, node_type, note, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC'),
  isFavorite: db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND node_id = ?'),
  updateNote: db.prepare('UPDATE favorites SET note = ? WHERE user_id = ? AND node_id = ?'),
  addHistory: db.prepare('INSERT INTO study_history (user_id, node_id, action) VALUES (?, ?, ?)'),
  getHistory: db.prepare('SELECT node_id, action, created_at FROM study_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'),
  getStats: db.prepare(`SELECT
    (SELECT COUNT(*) FROM favorites WHERE user_id = ?) as fav_count,
    (SELECT COUNT(DISTINCT node_id) FROM study_history WHERE user_id = ?) as explored_count,
    (SELECT COUNT(*) FROM study_history WHERE user_id = ?) as total_actions`),
};

// ============================================================
//  MIDDLEWARE
// ============================================================
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware (optional — sets req.user if valid token)
function authOptional(req, res, next) {
  const token = req.cookies.token || (req.headers.authorization || '').replace('Bearer ', '');
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      req.user = null;
    }
  }
  next();
}

// Auth middleware (required)
function authRequired(req, res, next) {
  const token = req.cookies.token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Please log in' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

// ============================================================
//  AUTH ROUTES
// ============================================================
app.post('/api/register', (req, res) => {
  const { username, email, password, displayName } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (username.length < 2 || username.length > 30) return res.status(400).json({ error: 'Username must be 2-30 characters' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });

  try {
    if (stmts.findUserByUsername.get(username)) return res.status(409).json({ error: 'Username already taken' });
    if (stmts.findUserByEmail.get(email)) return res.status(409).json({ error: 'Email already registered' });

    const hash = bcrypt.hashSync(password, 10);
    const result = stmts.createUser.run(username, email, hash, displayName || username);
    const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '30d' });

    res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
    res.json({ user: { id: result.lastInsertRowid, username, email, displayName: displayName || username } });
  } catch (e) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = stmts.findUserByUsername.get(username) || stmts.findUserByEmail.get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
  res.json({ user: { id: user.id, username: user.username, email: user.email, displayName: user.display_name } });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

app.get('/api/me', authRequired, (req, res) => {
  const user = stmts.findUserById.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const stats = stmts.getStats.get(req.user.id, req.user.id, req.user.id);
  res.json({ user, stats });
});

// ============================================================
//  FAVORITES ROUTES
// ============================================================
app.get('/api/favorites', authRequired, (req, res) => {
  const favs = stmts.getFavorites.all(req.user.id);
  res.json({ favorites: favs });
});

app.post('/api/favorites', authRequired, (req, res) => {
  const { nodeId, nodeType, note } = req.body;
  if (!nodeId) return res.status(400).json({ error: 'nodeId required' });
  stmts.addFavorite.run(req.user.id, nodeId, nodeType || 'w', note || '');
  stmts.addHistory.run(req.user.id, nodeId, 'favorite');
  res.json({ ok: true });
});

app.delete('/api/favorites/:nodeId', authRequired, (req, res) => {
  stmts.removeFavorite.run(req.user.id, req.params.nodeId);
  res.json({ ok: true });
});

app.patch('/api/favorites/:nodeId', authRequired, (req, res) => {
  const { note } = req.body;
  stmts.updateNote.run(note || '', req.user.id, req.params.nodeId);
  res.json({ ok: true });
});

// ============================================================
//  STUDY HISTORY
// ============================================================
app.post('/api/history', authRequired, (req, res) => {
  const { nodeId, action } = req.body;
  if (!nodeId || !action) return res.status(400).json({ error: 'nodeId and action required' });
  stmts.addHistory.run(req.user.id, nodeId, action);
  res.json({ ok: true });
});

app.get('/api/history', authRequired, (req, res) => {
  const history = stmts.getHistory.all(req.user.id);
  res.json({ history });
});

// ============================================================
//  VOCABULARY DATA API (from scraped database)
// ============================================================
// Check if vocabulary tables exist
const hasVocabTables = (() => {
  try {
    db.prepare("SELECT 1 FROM morphemes LIMIT 1").get();
    return true;
  } catch(e) { return false; }
})();

if (hasVocabTables) {
  // Get word details with IPA, definition, audio
  app.get('/api/word/:word', (req, res) => {
    const word = db.prepare(`
      SELECT w.*, GROUP_CONCAT(wm.morpheme_id) as morpheme_ids
      FROM words w
      LEFT JOIN word_morphemes wm ON w.id = wm.word_id
      WHERE w.word = ?
      GROUP BY w.id
    `).get(req.params.word.toLowerCase());
    if (!word) return res.status(404).json({ error: 'Word not found' });
    word.morpheme_ids = word.morpheme_ids ? word.morpheme_ids.split(',') : [];
    res.json({ word });
  });

  // Search words in database
  app.get('/api/words/search', (req, res) => {
    const q = req.query.q;
    if (!q || q.length < 1) return res.json({ words: [] });
    const words = db.prepare(`
      SELECT word, meaning_cn, ipa FROM words
      WHERE word LIKE ? OR meaning_cn LIKE ?
      ORDER BY length(word) LIMIT 20
    `).all(q + '%', '%' + q + '%');
    res.json({ words });
  });

  // Get all morphemes from DB
  app.get('/api/morphemes', (req, res) => {
    const morphemes = db.prepare('SELECT * FROM morphemes ORDER BY type, id').all();
    res.json({ morphemes });
  });

  // Get words for a morpheme
  app.get('/api/morpheme/:id/words', (req, res) => {
    const words = db.prepare(`
      SELECT w.word, w.meaning_cn, w.ipa, w.definition, w.cet4, w.cet6
      FROM words w
      JOIN word_morphemes wm ON w.id = wm.word_id
      WHERE wm.morpheme_id = ?
      ORDER BY w.word
    `).all(req.params.id);
    res.json({ words });
  });

  // Stats
  app.get('/api/vocab/stats', (req, res) => {
    const stats = {
      morphemes: db.prepare('SELECT COUNT(*) as c FROM morphemes').get().c,
      words: db.prepare('SELECT COUNT(*) as c FROM words').get().c,
      withIPA: db.prepare("SELECT COUNT(*) as c FROM words WHERE ipa IS NOT NULL AND ipa != ''").get().c,
      links: db.prepare('SELECT COUNT(*) as c FROM word_morphemes').get().c,
    };
    res.json({ stats });
  });
}

// ============================================================
//  START
// ============================================================
app.listen(PORT, () => {
  console.log(`\n  Etymology Network 词源星图`);
  console.log(`  ─────────────────────────`);
  console.log(`  Server running at http://localhost:${PORT}`);
  console.log(`  Database: data/etymology.db\n`);
});
