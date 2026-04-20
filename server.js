const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

// ─── STATE PERSISTENCE ───────────────────────────────────────────────────────
// Ruhet në skedar JSON — mbijetoi restarteve gjatë ditës (Render container live)
const STATE_FILE = path.join(__dirname, 'hms_state.json');
let hmsRooms     = {};
let hmsLastSaved = null;

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw  = fs.readFileSync(STATE_FILE, 'utf8');
      const data = JSON.parse(raw);
      hmsRooms     = data.rooms || {};
      hmsLastSaved = data.ts    || null;
      console.log(`[HMS] Ngarkuar ${Object.keys(hmsRooms).length} dhoma · ${hmsLastSaved}`);
    }
  } catch (e) {
    console.warn('[HMS] Nuk u ngarkua skedari i gjendjes:', e.message);
  }
}

function saveState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ rooms: hmsRooms, ts: hmsLastSaved }), 'utf8');
  } catch (e) {
    console.warn('[HMS] Nuk u ruajt skedari:', e.message);
  }
}

// ─── API ROUTES ───────────────────────────────────────────────────────────────

// GET /api/hms/state → kthep gjendjen aktuale
app.get('/api/hms/state', (req, res) => {
  res.json({ ok: true, data: hmsRooms, ts: hmsLastSaved });
});

// POST /api/hms/state → ruan gjendjen e re
app.post('/api/hms/state', (req, res) => {
  try {
    const body   = req.body;
    hmsRooms     = body.state || body;
    hmsLastSaved = new Date().toISOString();
    saveState();
    console.log(`[HMS] Ruajtur ${Object.keys(hmsRooms).length} dhoma · ${hmsLastSaved}`);
    res.json({ ok: true, ts: hmsLastSaved });
  } catch (e) {
    console.error('[HMS] Gabim ruajtje:', e.message);
    res.status(400).json({ error: e.message });
  }
});

// POST /api/hms/reset → rivendos gjendjen bosh (për fillim të ditës)
app.post('/api/hms/reset', (req, res) => {
  hmsRooms     = {};
  hmsLastSaved = new Date().toISOString();
  saveState();
  console.log('[HMS] Reset i plotë i gjendjes');
  res.json({ ok: true });
});

// GET /api/hms/debug → shfaq statistika
app.get('/api/hms/debug', (req, res) => {
  const total   = Object.keys(hmsRooms).length;
  const paster  = Object.values(hmsRooms).filter(r => r.clean === 'paster').length;
  const piseet  = Object.values(hmsRooms).filter(r => r.clean === 'piseet').length;
  const ardhje  = Object.values(hmsRooms).filter(r => r.status === 'ardhje').length;
  const ikje    = Object.values(hmsRooms).filter(r => r.status === 'ikje').length;
  const qendrim = Object.values(hmsRooms).filter(r => r.status === 'qendrim').length;
  res.json({ total, paster, piseet, ardhje, ikje, qendrim, lastSaved: hmsLastSaved });
});

// Çdo route tjetër → index.html (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[HMS] 🌸 Flower HMS server port ${PORT}`);
  loadState();
});
