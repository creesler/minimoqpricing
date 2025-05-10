require('dotenv').config();
const mongoose = require('mongoose');
const scrapeGroups = require('./scraper');

const url = 'https://minimoqpack.com/admin-pricing';

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected.');
    setInterval(() => {
      scrapeGroups(url).catch(err => console.error('Scrape failed:', err.message));
    }, 5000);
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
  });
