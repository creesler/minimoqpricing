const scrapeForm = require('./scraper');

const url = 'https://minimoqpack.com/admin-pricing';

scrapeForm(url).catch(console.error);
