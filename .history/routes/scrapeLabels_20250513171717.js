const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();

// 🔍 Helper: Find the nearest heading above the form, even if wrapped in nested divs
function findNearestHeading($, formElement) {
  let current = $(formElement);
  while (current.length) {
    const heading = current.prevAll('h1,h2,h3,h4,h5,h6').first();
    if (heading.length) return heading.text().trim();
    current = current.parent();
  }
  return null;
}

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

      const product = findNearestHeading($, formElement) || `Form ${formIndex + 1}`;

      $(formElement).find('.forminator-field select').each((_, el) => {
        const $field = $(el).closest('.forminator-field');
        const label = $field.find('label').text().trim();
        const options = $(el).find('option').map((_, opt) => $(opt).text().trim()).get();

        if (label && options.length) {
          fields.push({ product, label, options });
        }
      });

      if (fields.length) {
        allForms.push({ product, fields });

        // Log for dev/debug
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
