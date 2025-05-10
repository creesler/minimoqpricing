require('dotenv').config();
const mongoose = require('mongoose');
const scrapeGroups = require('./scraper');

const url = 'https://minimoqpack.com/admin-pricing';

async function startLoop() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected.');

    while (true) {
      console.log('\n⏳ Starting scrape cycle...');
      await scrapeGroups(url);
      console.log('✅ Scrape and combination complete. Waiting 5 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 5000)); // wait 5 seconds
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected.');
  }
}

startLoop();
