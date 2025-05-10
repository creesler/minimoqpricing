const scrapeGroups = require('./scraper');

scrapeGroups('https://minimoqpack.com/admin-pricing').catch(console.error);
