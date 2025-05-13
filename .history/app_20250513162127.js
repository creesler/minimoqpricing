require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const scrapeGroups = require('./scraper');
const combinationRoutes = require('./routes/combinations');
const cors = require('cors');
const path = require('path');

// Import the models
const FormFullColor = require('./models/FormFullColor');
const FormBlack = require('./models/FormBlack');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve index.html statically
app.use(express.static(path.join(__dirname)));

// ✅ CORS fix: allow frontend domain only
app.use(cors({
  origin: 'https://minimoqpack.com',
  methods: ['GET', 'POST', 'PUT'],
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/combinations', combinationRoutes);

const scrapeLabelsRoute = require('./routes/scrapeLabels');
app.use('/api', scrapeLabelsRoute);



// Mongo + Scraper URL
const url = 'https://minimoqpack.com/admin-pricing';

// New API Route to fetch form configuration data (labels and options)
app.get('/api/configuration', async (req, res) => {
  try {
    // Fetch form configuration fields from the database
    const fullColorFields = await FormFullColor.find({});
    const blackFields = await FormBlack.find({});

    // Return the fields data as JSON
    res.json({ fullColorFields, blackFields });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function startServices() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected.');

    // ✅ Manual scraper endpoint
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

    // ❌ Background scraper loop disabled to preserve manual price edits
    // const loop = async () => {
    //   while (true) {
    //     try {
    //       console.log('\n⏳ Starting scrape cycle...');
    //       await scrapeGroups(url);
    //       console.log('✅ Scrape and combination complete. Waiting 5 seconds...\n');
    //       await new Promise(resolve => setTimeout(resolve, 5000));
    //     } catch (err) {
    //       console.error('❌ Error during scrape cycle:', err);
    //     }
    //   }
    // };
    // loop();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
  }
}

startServices();
