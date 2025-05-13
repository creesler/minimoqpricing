const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();

router.get('/scrape-labels', async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: 'Missing ?url=' });
  }

  try {
    console.log('🌍 Fetching:', url);
    const resHtml = await axios.get(url);
    const $ = cheerio.load(resHtml.data);

    const allForms = [];

    $('.forminator-custom-form').each((formIndex, formElement) => {
      const fields = [];

      // Try to get the heading directly before this form
      let product = `Form ${formIndex + 1}`;
      const headingEl = $(formElement).prev();

      if (headingEl.is('h1,h2,h3,h4,h5,h6')) {
        const headingText = headingEl.text().trim();
        if (headingText) {
          product = headingText;
        }
      }

      $(formElement).find('.forminator-field select').each((_, el) => {
        const $field = $(el).closest('.forminator-field');
        const label = $field.find('label').text().trim();
        const options = $(el).find('option').map((_, opt) => $(opt).text().trim()).get();

        if (label && options.length) {
          fields.push({ label, options });
        }
      });

      if (fields.length) {
        allForms.push({ product, fields });

        // Logging
        console.log(`🧾 Product: ${product}`);
        fields.forEach(f => {
          console.log(`🔸 ${f.label}: [${f.options.join(', ')}]`);
        });
      }
    });

    if (!allForms.length) {
      console.warn('⚠️ No forms with <select> fields found.');
    }

    res.json({ success: true, formCount: allForms.length, forms: allForms });

  } catch (err) {
    console.error('❌ Scrape failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
