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

    widgets.forEach((widget, index) => {
      let headingText = `Form #${index + 1}`;
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

      const labels = Array.from(form.querySelectorAll('.forminator-label'));
      const selects = Array.from(form.querySelectorAll('select')).filter(select =>
        select.closest('form') === form &&
        select.options.length > 0 &&
        select.getAttribute('aria-hidden') !== 'true'
      );

      const fields = [];

      labels.forEach((label, i) => {
        const select = selects[i];
        if (!select) return;

        const labelText = label.textContent.trim();
        const options = Array.from(select.options).map(opt => opt.textContent.trim()).filter(Boolean);

        if (options.length > 0) {
          fields.push({
            product: headingText,
            label: labelText,
            options
          });
        }
      });

      if (fields.length > 0) {
        const optionSets = fields.map(f => f.options);
        const combinations = generateCombinations(optionSets);

        console.log(`\n🔁 Generated ${combinations.length} combinations for "${headingText}":`);
        combinations.slice(0, 5).forEach(c => console.log(`• ${headingText} | ${c.join(' | ')}`));
        if (combinations.length > 5) console.log(`...and ${combinations.length - 5} more.`);

        forms.push({
          product: headingText,
          fields,
          combinations
        });
      }
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
