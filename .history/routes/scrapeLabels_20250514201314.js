const express = require('express');
const router = express.Router();
const { JSDOM } = require('jsdom');
const axios = require('axios');
const mongoose = require('mongoose');
const LabeledCombination = require('../models/LabeledCombination'); // ✅ Mongo model

function generateCombinations(optionSets) {
  return optionSets.reduce((acc, set) =>
    acc.flatMap(combo => set.map(option => [...combo, option])), [[]]
  );
}

router.get('/', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ success: false, error: 'Missing ?url param' });
  }

  try {
    const { data: html } = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
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

        // ✅ Add _id + price
        const combinations = generateCombinations(optionSets).map(c => ({
          _id: new mongoose.Types.ObjectId(),
          options: c,
          price: 0
        }));

        console.log(`\n🔁 Generated ${combinations.length} combinations for "${headingText}":`);
        combinations.slice(0, 5).forEach(c => console.log(`• ${headingText} | ${c.options.join(' | ')}`));
        if (combinations.length > 5) {
          console.log(`...and ${combinations.length - 5} more.`);
        }

        forms.push({
          product: headingText,
          fields,
          combinations
        });
      }
    });

    // ✅ Save to DB
    for (const form of forms) {
      await LabeledCombination.findOneAndUpdate(
        { product: form.product },
        {
          product: form.product,
          fields: form.fields,
          combinations: form.combinations
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`✅ Saved to DB: ${form.product}`);
    }

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
