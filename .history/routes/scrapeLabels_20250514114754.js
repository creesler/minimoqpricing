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

    const widgets = Array.from(doc.querySelectorAll('[data-widget_type="shortcode.default"]'));

    const widget = widgets[0]; // 👉 Only the first one
    if (!widget) {
      return res.json({ success: true, formCount: 0, forms: [] });
    }

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
    if (!form) {
      return res.json({ success: true, formCount: 0, forms: [] });
    }

    const labels = Array.from(form.querySelectorAll('.forminator-label'));
    const selects = Array.from(form.querySelectorAll('select')).filter(select => {
      return (
        select.closest('form') === form &&
        select.options.length > 0 &&
        select.getAttribute('aria-hidden') !== 'true'
      );
    });

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

    const formData = { product: headingText, fields };

    // 🧠 Generate and print combinations
    const optionSets = formData.fields.map(f => f.options);
    const combos = generateCombinations(optionSets);
    console.log(`\n🔹 Combinations for "${formData.product}" (${combos.length} total):`);
    combos.forEach(c => console.log(c.join(' | ')));
