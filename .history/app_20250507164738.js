require('dotenv').config();
const mongoose = require('mongoose');
const scrapeGroups = require('./scraper');

const url = 'https://minimoqpack.com/admin-pricing';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startLoop() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB connected.');

  while (true) {
    try {
      console.log('\n⏳ Scraping started...');
      await scrapeGroups(url);
      console.log('✅ Scraping finished. Waiting 2 seconds...\n');
    } catch (err) {
      console.error('❌ Scrape failed:', err.message);
    }

    await delay(2000); // wait before next scrape
  }
}

startLoop();
