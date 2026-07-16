const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bodyParser = require('body-parser');

const DATA_FILE = path.join(__dirname, 'feedbacks.json');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';

async function readData() {
  try {
    const txt = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(txt || '[]');
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    console.error('readData error', e);
    return [];
  }
}

async function writeData(data) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('writeData error', e);
  }
}

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

app.get('/api/feedbacks', async (req, res) => {
  const data = await readData();
  res.json(data);
});

app.post('/api/feedback', async (req, res) => {
  const fb = req.body || {};
  fb.id = String(Date.now()) + Math.floor(Math.random() * 1000);
  fb.time = new Date().toLocaleString();
  const data = await readData();
  data.push(fb);
  await writeData(data);
  res.json(fb);
});

app.delete('/api/feedback/:id', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  const id = req.params.id;
  let data = await readData();
  const len = data.length;
  data = data.filter((d) => d.id !== id);
  if (data.length === len) return res.status(404).json({ error: 'Not found' });
  await writeData(data);
  res.json({ ok: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}. Admin token: ${ADMIN_TOKEN}`));
