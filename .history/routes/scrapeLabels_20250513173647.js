const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { JSDOM } = require('jsdom');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;

app.get('/api/scrape-labels', async (req, res) => {
  const url = req.query.url;

  try {
    const { data: html } = await axios.get(url);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const forms = Array.from(document.querySelectorAll('form'));
    const results = [];

    for (const form of forms) {
      const product = findHeadingNearForm(form);
      const fields = [];

      const selects = Array.from(form.querySelectorAll('select'));
      for (const select of selects) {
        const label = findLabelForSelect(select, form);
        const options = Array.from(select.querySelectorAll('option'))
          .map(opt => opt.textContent.trim())
          .filter(opt => opt !== '');
        if (label && options.length > 0) {
          fields.push({ product, label, options });
        }
      }

      if (fields.length > 0) {
        results.push({ product, fields });
      }
    }

    res.json({ success: true, formCount: results.length, forms: results });
  } catch (error) {
    console.error('Scraping error:', error.message);
    res.status(500).json({ success: false, message: 'Scraping failed' });
  }
});

// Helper to find label text for a select
function findLabelForSelect(select, form) {
  const id = select.id;
  if (id) {
    const label = form.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent.trim();
  }
  // Fallback: try parent label tag
  const parentLabel = select.closest('label');
  if (parentLabel) return parentLabel.textContent.trim();
  return null;
}

// Helper to find nearest heading above form
function findHeadingNearForm(form) {
  let el = form.previousElementSibling;
  while (el) {
    if (['H1', 'H2', 'H3'].includes(el.tagName)) {
      return el.textContent.trim();
    }
    el = el.previousElementSibling;
  }
  return 'Unknown Product';
}

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
