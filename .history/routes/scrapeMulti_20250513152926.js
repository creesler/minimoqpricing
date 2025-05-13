const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();

router.get('/scrape-multi', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing ?url=' });

  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    const results = [];

    $('.forminator-field select').each((_, el) => {
      const $el = $(el);
      const container = $el.closest('.forminator-field');

      // Look for nearest heading before this select
      const header = container.prevAll('h1,h2,h3,h4,h5,h6').first().text().trim();
      if (!header) return;

      const label = container.find('label').text().trim();
      const name = $el.attr('name') || '';
      const options = $el.find('option').map((_, o) => $(o).text().trim()).get();

      if (!name || options.length === 0) return;

      results.push({ header, name, label, options });
    });

    console.log(`🔍 Scraped fields with headers (${results.length} total):\n`, results);
    res.json({ success: true, fields: results });

  } catch (err) {
    console.error('❌ Scrape failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
