const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

router.get('/scrape-headers', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing ?url=' });

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const headers = [];

    $('.forminator-field label').each((_, el) => {
      const label = $(el).text().trim();
      if (label) headers.push(label);
    });

    res.json(headers);
  } catch (err) {
    console.error('Scraping failed:', err.message);
    res.status(500).json({ error: 'Scraping failed' });
  }
});

module.exports = router;
