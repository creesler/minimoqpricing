require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const scrapeGroups = require('./scraper');
const combinationRoutes = require('./routes/combinations');
const scrapeLabels = require('./routes/scrapeLabels');
const labeledCombinationsRoute = require('./routes/labeledCombinations'); // ✅ New route for per-product labeled combos

// MongoDB models
const FormFullColor = require('./models/FormFullColor');
const FormBlack = require('./models/FormBlack');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve index.html and static assets
app.use(express.static(path.join(__dirname)));


app.use(express.json());

// ✅ Routes
app.use('/api/combinations', combinationRoutes);                // existing combinations route
app.use('/api/scrape-labels', scrapeLabels);                    // new scraping and saving per-product
app.use('/api/labeled-combinations', labeledCombinationsRoute); // ✅ per-product get from DB

// ✅ Optional: legacy full/black field config endpoint
app.get('/api/configuration', async (req, res) => {
  try {
    const fullColorFields = await FormFullColor.find({});
    const blackFields = await FormBlack.find({});
    res.json({ fullColorFields, blackFields });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Manual scraper endpoint (triggered by admin pages)
app.get('/api/scrape', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing ?url=' });

  try {
    console.log(`🔍 Manual scrape triggered: ${url}`);
    await scrapeGroups(url);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Manual scrape failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Connect and start server
async function startServices() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected.');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
  }
}

startServices();
