require('dotenv').config();
const mongoose = require('mongoose');
const scrapeAndSyncForm = require('./scraper');

const url = 'https://minimoqpack.com/admin-pricing';

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB connected.');

  // Run every 5 seconds
  setInterval(() => {
    scrapeAndSyncForm(url);
  }, 5000);
})();
