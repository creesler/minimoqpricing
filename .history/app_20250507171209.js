require('dotenv').config();
const mongoose = require('mongoose');
const scrapeGroups = require('./scraper');

const url = 'https://minimoqpack.com/admin-pricing';

async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected.');

    console.log('\n⏳ Scraping started...');
    await scrapeGroups(url);
    console.log('✅ Scraping and combination generation complete.\n');

    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

start();
