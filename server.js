const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app = express();
app.use(express.json({ limit: '5mb' }));

// ─── STATE PERSISTENCE ────────────────────────────────────────
const STATE_FILE = path.join(__dirname, 'hms_state.json');
let hmsRooms     = {};
let hmsLastSaved = null;

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      hmsRooms     = data.rooms || {};
      hmsLastSaved = data.ts    || null;
      console.log(`[HMS] Ngarkuar ${Object.keys(hmsRooms).length} dhoma`);
    }
  } catch (e) {
    console.warn('[HMS] Load error:', e.message);
  }
}

function saveState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ rooms: hmsRooms, ts: hmsLastSaved }), 'utf8');
  } catch (e) {
    console.warn('[HMS] Save error:', e.message);
  }
}

// ─── API ──────────────────────────────────────────────────────
app.get('/api/hms/state', (req, res) => {
  res.json({ ok: true, data: hmsRooms, ts: hmsLastSaved });
});

app.post('/api/hms/state', (req, res) => {
  try {
    hmsRooms     = req.body.state || req.body;
    hmsLastSaved = new Date().toISOString();
    saveState();
    console.log(`[HMS] Ruajtur ${Object.keys(hmsRooms).length} dhoma`);
    res.json({ ok: true, ts: hmsLastSaved });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/hms/reset', (req, res) => {
  hmsRooms = {}; hmsLastSaved = new Date().toISOString();
  saveState();
  res.json({ ok: true });
});

app.get('/api/hms/debug', (req, res) => {
  const rs = Object.values(hmsRooms);
  res.json({
    total:    rs.length,
    paster:   rs.filter(r => r.clean === 'paster').length,
    piseet:   rs.filter(r => r.clean === 'piseet').length,
    ardhje:   rs.filter(r => r.status === 'ardhje').length,
    ikje:     rs.filter(r => r.status === 'ikje').length,
    qendrim:  rs.filter(r => r.status === 'qendrim').length,
    lastSaved: hmsLastSaved
  });
});

// ─── FRONTEND ─────────────────────────────────────────────────
// Shërbej index.html për çdo route
app.get('*', (req, res) => {
  const file = path.join(__dirname, 'index.html');
  if (fs.existsSync(file)) {
    res.sendFile(file);
  } else {
    res.status(404).send('index.html not found — check deployment');
  }
});

// ─── START ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[HMS] 🌸 Flower HMS running on port ${PORT}`);
  console.log(`[HMS] index.html exists: ${fs.existsSync(path.join(__dirname, 'index.html'))}`);
  loadState();
});
