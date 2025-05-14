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

    const widgets = Array.from(doc.querySelectorAll('[data-widget_type="shortcode.default"]'));

    widgets.forEach(widget => {
      // Traverse backward to find heading above the form
      let headingText = 'Unknown';
      let prev = widget.previousElementSibling;

      while (prev) {
        const h2 = prev.querySelector('h2.elementor-heading-title');
        if (h2) {
          headingText = h2.textContent.trim();
          break;
        }
        prev = prev.previousElementSibling;
      }

      const form = widget.querySelector('form.forminator-custom-form');
      if (!form) return;

      const labels = form.querySelectorAll('.forminator-label');
      const selects = form.querySelectorAll('select');
      const fields = [];

      labels.forEach((label, i) => {
        const select = selects[i];
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
