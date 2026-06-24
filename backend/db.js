require('dotenv').config();
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Allow overriding the DB file location via DB_FILE env var (useful for CI or hosted deployments)
const dbPath = process.env.DB_FILE && process.env.DB_FILE.trim()
  ? path.resolve(process.env.DB_FILE)
  : path.join(dataDir, 'database.db');

let db;
let SQL;

const persist = () => {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
};

const init = async () => {
  SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
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

  persist();
};

const getQueries = () => {
  const stmt = db.prepare('SELECT * FROM queries ORDER BY time DESC');
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
};

const getQueryById = (id) => {
  const stmt = db.prepare('SELECT * FROM queries WHERE id = :id');
  stmt.bind({ ':id': id });
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
};

const createQuery = (query) => {
  const stmt = db.prepare(`
    INSERT INTO queries (id, ref, name, address, mobile, unit, building, description, status, priority, time)
    VALUES (:id, :ref, :name, :address, :mobile, :unit, :building, :description, :status, :priority, :time)
  `);
  stmt.run({
    ':id': query.id,
    ':ref': query.ref,
    ':name': query.name,
    ':address': query.address,
    ':mobile': query.mobile,
    ':unit': query.unit,
    ':building': query.building,
    ':description': query.description,
    ':status': query.status,
    ':priority': query.priority,
    ':time': query.time,
  });
  stmt.free();
  persist();
  return getQueryById(query.id);
};

const updateQueryStatus = (id, status) => {
  const stmt = db.prepare('UPDATE queries SET status = :status WHERE id = :id');
  stmt.run({ ':status': status, ':id': id });
  stmt.free();
  persist();
  return getQueryById(id);
};

const getStats = () => {
  const getCount = (sql) => {
    const stmt = db.prepare(sql);
    const row = stmt.step() ? stmt.getAsObject() : { count: 0 };
    stmt.free();
    return row.count || 0;
  };

  return {
    total: getCount('SELECT COUNT(*) AS count FROM queries'),
    critical: getCount("SELECT COUNT(*) AS count FROM queries WHERE priority = 'critical'"),
    inProgress: getCount("SELECT COUNT(*) AS count FROM queries WHERE status = 'in-progress'"),
    done: getCount("SELECT COUNT(*) AS count FROM queries WHERE status = 'done'"),
  };
};

module.exports = { init, getQueries, getQueryById, createQuery, updateQueryStatus, getStats };

