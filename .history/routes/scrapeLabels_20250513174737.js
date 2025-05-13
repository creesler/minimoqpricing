const express = require('express');
const router = express.Router();
const { JSDOM } = require('jsdom');
const axios = require('axios');

router.get('/', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ success: false, error: 'Missing ?url param' });

  try {
    const { data: html } = await axios.get(url);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const formHeadings = Array.from(doc.querySelectorAll('.elementor-widget-heading h2'))
      .map(el => el.textContent.trim());

    const formElements = Array.from(doc.querySelectorAll('.forminator-custom-form'));
    const forms = [];

    formElements.forEach((form, index) => {
      const product = formHeadings[index] || `Form ${index + 1}`;
      const fields = [];

      const labels = form.querySelectorAll('.forminator-label');
      const selects = form.querySelectorAll('select');

      labels.forEach((label, i) => {
        const select = selects[i];
        if (!select) return;

        const optionValues = Array.from(select.options).map(opt => opt.textContent.trim());
        const labelText = label.textContent.trim();

        fields.push({
          product,
          label: labelText,
          options: optionValues
        });
      });

      forms.push({ product, fields });
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
