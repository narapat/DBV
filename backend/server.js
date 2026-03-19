const express = require('express');
const cors = require('cors');
const { getSchema, testConnection } = require('./db');
require('dotenv').config();

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

// API Endpoints
app.post('/api/schema', async (req, res) => {
  try {
    const config = req.body.dbConfig;
    const schema = await getSchema(config);
    res.json(schema);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/test-connection', async (req, res) => {
  try {
    const config = req.body;
    const result = await testConnection(config);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
