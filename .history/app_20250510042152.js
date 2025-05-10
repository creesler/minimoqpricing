require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const scrapeGroups = require('./scraper');
const combinationRoutes = require('./routes/combinations');
const cors = require('cors'); // ✅ added

const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path');


app.use(cors()); // ✅ added
app.use(express.json());

// Routes
app.use('/api/combinations', combinationRoutes);

// Mongo + Scraper Loop
const url = 'https://minimoqpack.com/admin-pricing';

async function startServices() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected.');

    // Start scraper loop (optional: run in background)
    const loop = async () => {
      while (true) {
        try {
          console.log('\n⏳ Starting scrape cycle...');
          await scrapeGroups(url);
          console.log('✅ Scrape and combination complete. Waiting 5 seconds...\n');
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (err) {
          console.error('❌ Error during scrape cycle:', err);
        }
      }
    };
    loop(); // kick off the loop

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
  }
}

startServices();
