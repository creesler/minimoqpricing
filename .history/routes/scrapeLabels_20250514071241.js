const express = require('express');
const router = express.Router();
const { JSDOM } = require('jsdom');
const axios = require('axios');

function generateCombinations(optionSets) {
  return optionSets.reduce((acc, set) =>
    acc.flatMap(combo => set.map(option => [...combo, option])), [[]]
  );
}

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

      const fieldElements = form.querySelectorAll('.forminator-field-select');
      const fields = [];

      fieldElements.forEach(fieldEl => {
        const labelEl = fieldEl.querySelector('.forminator-label');
        const select = fieldEl.querySelector('select');

        if (!labelEl || !select || !select.options.length) return;

        const label = labelEl.textContent.trim();
        const options = Array.from(select.options).map(opt => opt.textContent.trim()).filter(Boolean);

        if (options.length > 0) {
          fields.push({
            product: headingText,
            label,
            options
          });
        }
      });

      if (fields.length > 0) {
        forms.push({ product: headingText, fields });
      }
    });

    // 🧠 Generate and print combinations per form
    forms.forEach(form => {
      const optionSets = form.fields.map(f => f.options);
      const combos = generateCombinations(optionSets);
      console.log(`\n🔹 Combinations for "${form.product}" (${combos.length} total):`);
      combos.forEach(c => console.log(c.join(' | ')));
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
