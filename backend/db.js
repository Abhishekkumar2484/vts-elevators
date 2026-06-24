require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Allow overriding the DB file location via DB_FILE env var (useful for CI or hosted deployments)
const dbPath = process.env.DB_FILE && process.env.DB_FILE.trim()
  ? path.resolve(process.env.DB_FILE)
  : path.join(dataDir, 'database.db');
const db = new Database(dbPath);

const init = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS queries (
      id TEXT PRIMARY KEY,
      ref TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      mobile TEXT NOT NULL,
      unit TEXT NOT NULL,
      building TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      time INTEGER NOT NULL
    );
  `);
};

const getQueries = () => {
  return db.prepare('SELECT * FROM queries ORDER BY time DESC').all();
};

const getQueryById = (id) => {
  return db.prepare('SELECT * FROM queries WHERE id = ?').get(id);
};

const createQuery = (query) => {
  const stmt = db.prepare(`
    INSERT INTO queries (id, ref, name, address, mobile, unit, building, description, status, priority, time)
    VALUES (@id, @ref, @name, @address, @mobile, @unit, @building, @description, @status, @priority, @time)
  `);
  stmt.run(query);
  return getQueryById(query.id);
};

const updateQueryStatus = (id, status) => {
  const stmt = db.prepare('UPDATE queries SET status = ? WHERE id = ?');
  stmt.run(status, id);
  return getQueryById(id);
};

const getStats = () => {
  const total = db.prepare('SELECT COUNT(*) AS count FROM queries').get().count;
  const critical = db.prepare("SELECT COUNT(*) AS count FROM queries WHERE priority = 'critical'").get().count;
  const inProgress = db.prepare("SELECT COUNT(*) AS count FROM queries WHERE status = 'in-progress'").get().count;
  const done = db.prepare("SELECT COUNT(*) AS count FROM queries WHERE status = 'done'").get().count;
  return { total, critical, inProgress, done };
};

module.exports = { init, getQueries, getQueryById, createQuery, updateQueryStatus, getStats };
