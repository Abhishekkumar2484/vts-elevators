const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const UNITS = [
  { name: 'Elevator Car B — North Wing', id: 'VTS-9921-X' },
  { name: 'Freight Lift — Block C',      id: 'VTS-3312-F' },
  { name: 'Elevator Car A — South Wing', id: 'VTS-7741-A' },
  { name: 'Passenger Lift — Tower 2',    id: 'VTS-5582-P' },
];

app.get('/api/queries', (req, res) => {
  const queries = db.getQueries();
  res.json(queries);
});

app.get('/api/queries/:id', (req, res) => {
  const query = db.getQueryById(req.params.id);
  if (!query) return res.status(404).json({ error: 'Query not found' });
  res.json(query);
});

app.post('/api/queries', (req, res) => {
  const { name, address, mobile, unit, building, description, priority } = req.body;
  if (!name || !address || !mobile || !unit || !building || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const newQuery = {
    id: uuidv4(),
    ref: 'QY-' + Math.floor(Math.random() * 9000 + 1000),
    name,
    address,
    mobile,
    unit,
    building,
    description,
    status: 'not-started',
    priority: priority || 'normal',
    time: Date.now(),
  };

  const created = db.createQuery(newQuery);
  res.status(201).json(created);
});

app.post('/api/google-form', (req, res) => {
  // Accept either `unit` (name) or `unitId` (scanned from QR). Be tolerant with missing user fields.
  let { name, address, mobile, unit, unitId, building, description, priority } = req.body || {};

  // Map unitId to unit name when provided
  if (!unit && unitId) {
    const found = UNITS.find(u => u.id === unitId || u.id === unitId.trim());
    unit = found ? found.name : unitId; // fallback to raw id
  }

  // Minimal requirement: description and unit (from form or QR). Fill defaults for others.
  if (!description || !unit) {
    return res.status(400).json({ error: 'Missing required fields from Google Form: unit and description are required' });
  }

  name = name && name.trim() ? name.trim() : 'Anonymous';
  address = address && address.trim() ? address.trim() : '';
  mobile = mobile && mobile.trim() ? mobile.trim() : '';
  building = building && building.trim() ? building.trim() : 'Submitted via Google Form';

  const newQuery = {
    id: uuidv4(),
    ref: 'QY-' + Math.floor(Math.random() * 9000 + 1000),
    name,
    address,
    mobile,
    unit,
    building,
    description,
    status: 'not-started',
    priority: priority || 'normal',
    time: Date.now(),
  };

  const created = db.createQuery(newQuery);
  res.status(201).json(created);
});

app.patch('/api/queries/:id', (req, res) => {
  const { status, priority } = req.body;
  const query = db.getQueryById(req.params.id);
  if (!query) return res.status(404).json({ error: 'Query not found' });

  if (status) db.updateQueryStatus(req.params.id, status);
  const updated = db.getQueryById(req.params.id);
  res.json(updated);
});

app.get('/api/stats', (req, res) => {
  res.json(db.getStats());
});

app.get('/api/units', (req, res) => {
  res.json([
    { name: 'Elevator Car B — North Wing', id: 'VTS-9921-X' },
    { name: 'Freight Lift — Block C',      id: 'VTS-3312-F' },
    { name: 'Elevator Car A — South Wing', id: 'VTS-7741-A' },
    { name: 'Passenger Lift — Tower 2',    id: 'VTS-5582-P' },
  ]);
});

// simple health endpoint for external services to check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

(async () => {
  await db.init();
  app.listen(PORT, () => {
    console.log(`Express server listening on http://localhost:${PORT}`);
  });
})();
