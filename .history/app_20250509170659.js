const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const Combination = require('./models/Combination');
const scrapeGroups = require('./scraper');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// ✅ MongoDB connection
mongoose.connect('mongodb://localhost:27017/test');
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected.');
});
mongoose.connection.on('error', err => {
  console.error('❌ MongoDB connection error:', err);
});

// ✅ API ROUTES

// Get combinations grouped by group
app.get('/api/combinations', async (req, res) => {
  try {
    const all = await Combination.find({});
    const grouped = all.reduce((acc, combo) => {
      if (!acc[combo.group]) acc[combo.group] = [];
      acc[combo.group].push(combo);
      return acc;
    }, {});
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new combination
app.post('/api/combinations', async (req, res) => {
  try {
    const { group, options } = req.body;
    const created = await Combination.create({ group, options });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update existing combination
app.put('/api/combinations/:id', async (req, res) => {
  try {
    const updated = await Combination.findByIdAndUpdate(
      req.params.id,
      { options: req.body.options },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a combination
app.delete('/api/combinations/:id', async (req, res) => {
  try {
    await Combination.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Manual scrape trigger (optional)
app.post('/api/scrape', async (req, res) => {
  try {
    await scrapeGroups('https://your-forminator-url.com'); // replace with your real Forminator form URL
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Run scraper on startup
scrapeGroups('https://your-forminator-url.com') // replace with your actual form URL
  .then(() => console.log('✅ Initial scrape complete.'))
  .catch(err => console.error('❌ Scrape error:', err));

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
