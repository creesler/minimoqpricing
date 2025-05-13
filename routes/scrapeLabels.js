const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();

// GET /api/scrape-labels?url=https://...
router.get('/scrape-labels', async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: 'Missing ?url=' });
  }

  console.log('🌍 Fetching:', url);

  try {
    const resHtml = await axios.get(url);
    const $ = cheerio.load(resHtml.data);

    const labels = [];

    $('.forminator-field select').each((_, el) => {
      const label = $(el).closest('.forminator-field').find('label').text().trim();
      if (label) labels.push(label);
    });

    console.log('\n📋 Forminator Select Field Labels:');
    labels.forEach((label, i) => console.log(`${i + 1}. ${label}`));

    return res.json({ success: true, count: labels.length, labels });
  } catch (err) {
    console.error('❌ Scrape failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
