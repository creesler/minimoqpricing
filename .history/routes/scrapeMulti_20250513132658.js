const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');

const router = express.Router();

// Utility: dynamic model generator
function getModels(formName) {
  const FormModel = mongoose.model(`form_${formName}`, new mongoose.Schema({}, { strict: false }));
  const CombinationModel = mongoose.model(`combinations_${formName}`, new mongoose.Schema({}, { strict: false }));
  return { FormModel, CombinationModel };
}

// Utility: generate all possible combinations
function generateCombinations(optionGroups) {
  if (optionGroups.length === 0) return [];
  if (optionGroups.length === 1) return optionGroups[0].map(opt => [opt]);

  const rest = generateCombinations(optionGroups.slice(1));
  const result = [];

  optionGroups[0].forEach(opt => {
    rest.forEach(r => {
      result.push([opt, ...r]);
    });
  });

  return result;
}

// ✅ Scrape all forms from the page
router.post('/scrape-multi', async (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ success: false, error: 'Missing URL' });

  try {
    const pageRes = await axios.get(url);
    const $ = cheerio.load(pageRes.data);
    const results = [];

    $('h2, h3').each((_, header) => {
      const $header = $(header);
      const rawText = $header.text().trim();

      // Skip generic headers
      if (
        !rawText ||
        rawText.toLowerCase().includes('combination price matrix') ||
        rawText.toLowerCase().includes('help') ||
        rawText.toLowerCase().includes('payment') ||
        rawText.toLowerCase().includes('custom') ||
        rawText.toLowerCase().includes('our companies') ||
        rawText.toLowerCase().includes('minimoqpack')
      ) {
        return;
      }

      const formName = rawText.toLowerCase().replace(/\s+/g, '_');
      const { FormModel, CombinationModel } = getModels(formName);

      const $nextElems = $header.closest('.elementor-element').nextAll();
      let $form = null;

      $nextElems.each((_, el) => {
        const $el = $(el);
        const foundForm = $el.find('form.forminator-custom-form, form.forminator-form');
        if (foundForm.length) {
          $form = foundForm.first();
          return false;
        }
      });

      if (!$form || !$form.length) {
        console.log(`⚠️ No form found for "${formName}"`);
        return;
      }

      const selects = $form.find('select');
      if (!selects.length) {
        console.log(`⚠️ No <select> fields in form "${formName}"`);
        return;
      }

      const formFields = [];

      selects.each((_, el) => {
        const $el = $(el);
        const label = $el.closest('.forminator-field').find('label').text().trim();
        const name = $el.attr('name') || '';
        const options = $el.find('option').map((_, o) => $(o).text().trim()).get();

        if (!name || !options.length) return;

        formFields.push({
          name,
          label,
          options,
          type: 'select',
          product: formName
        });
      });

      if (!formFields.length) {
        console.log(`⚠️ Skipping "${formName}" — no valid select fields found.`);
        return;
      }

      FormModel.deleteMany({})
        .then(() => FormModel.insertMany(formFields))
        .catch(err => console.error(`❌ Failed to save form_${formName}:`, err.message));

      CombinationModel.deleteMany({}); // prepare for combinations later

      results.push({ formName, fieldsCount: formFields.length });
      console.log(`✅ Processed form: ${formName} with ${formFields.length} fields`);
    });

    res.json({ success: true, formsProcessed: results });
  } catch (err) {
    console.error('❌ scrape-multi error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Generate combinations dynamically
router.post('/generate-combinations/:product', async (req, res) => {
  const { product } = req.params;

  if (!product) return res.status(400).json({ success: false, error: 'Missing product name' });

  try {
    const { FormModel, CombinationModel } = getModels(product);
    const fields = await FormModel.find({});

    if (!fields.length) {
      return res.status(404).json({ success: false, error: `No fields found for form_${product}` });
    }

    const optionGroups = fields.map(field => field.options || []);
    const combinations = generateCombinations(optionGroups);

    const docs = combinations.map(combo => ({
      options: combo,
      price: 0,
      group: product
    }));

    await CombinationModel.deleteMany({});
    await CombinationModel.insertMany(docs);

    console.log(`✅ Generated ${docs.length} combinations for "${product}"`);
    res.json({ success: true, total: docs.length });
  } catch (err) {
    console.error(`❌ generate-combinations error:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
