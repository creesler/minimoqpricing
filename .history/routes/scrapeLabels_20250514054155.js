const express = require('express');
const router = express.Router();
const { JSDOM } = require('jsdom');
const axios = require('axios');

router.get('/', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ success: false, error: 'Missing ?url param' });

  try {
    const { data: html } = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FormScraperBot/1.0)'
      }
    });

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const forms = [];

    const headings = Array.from(doc.querySelectorAll('.elementor-widget-heading h2'));

    headings.forEach(h2 => {
      const headingText = h2.textContent.trim();

      // Navigate to the form via sibling structure
      const container = h2.closest('.elementor-widget-heading')?.parentElement;
      if (!container) return;

      const nextForm = container.nextElementSibling?.querySelector('.forminator-custom-form');
      if (!nextForm) return;

      const labels = nextForm.querySelectorAll('.forminator-label');
      const selects = nextForm.querySelectorAll('select');
      const fields = [];

      labels.forEach((label, idx) => {
        const select = selects[idx];
        if (!select) return;

        fields.push({
          product: headingText,
          label: label.textContent.trim(),
          options: Array.from(select.options).map(opt => opt.textContent.trim())
        });
      });

      forms.push({ product: headingText, fields });
    });

    res.json({
      success: true,
      formCount: forms.length,
      forms
    });

  } catch (err) {
    console.error('Scraping failed:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch or parse the form.' });
  }
});

module.exports = router;
