const combinationRoutes = require('./routes/combinations');

require('dotenv').config();
const mongoose = require('mongoose');
const scrapeGroups = require('./scraper');

const url = 'https://minimoqpack.com/admin-pricing';

async function startLoop() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected.');

    while (true) {
      try {
        console.log('\n⏳ Starting scrape cycle...');
        await scrapeGroups(url);
        console.log('✅ Scrape and combination complete. Waiting 5 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (innerErr) {
        console.error('❌ Error during scrape cycle:', innerErr);
        if (innerErr instanceof AggregateError) {
          console.error('📛 AggregateError details:', innerErr.errors || '[empty]');
        }
      }
    }
  } catch (err) {
    console.error('❌ Error connecting to MongoDB or during initialization:', err);
  } finally {
    try {
      await mongoose.disconnect();
      console.log('🔌 MongoDB disconnected.');
    } catch (disconnectErr) {
      console.error('❌ Error while disconnecting MongoDB:', disconnectErr);
    }
  }
}

startLoop();
