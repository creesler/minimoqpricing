const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');

const router = express.Router();

// Utility: dynamic model setup
function getModels(productName) {
  const FormModel = mongoose.model(`form_${productName}`, new mongoose.Schema({}, { strict: false }));
  const CombinationModel = mongoose.model(`combinations_${productName}`, new mongoose.Schema({}, { strict: false }));
  return { FormModel, CombinationModel };
}

// Utility: generate all combinations
function generateCombinations(optionGroups) {
  if (optionGroups.length === 0) return [];
  if (optionGroups.length === 1) return optionGroups[0].map(opt => [opt]);

  const rest = generateCombinations(optionGroups.slice(1));
  return optionGroups[0].flatMap(opt => rest.map(r => [opt, ...r]));
}

// ✅ Scrape real forms and pair with nearest header
router.post('/scrape-multi', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'Missing URL' });

  try {
    const pageRes = await axios.get(url);
    const $ = cheerio.load(pageRes.data);
    const results = [];

    $('form.forminator-custom-form, form.forminator-form').each(async (_, formEl) => {
      const $form = $(formEl);

      // Look upward for closest heading
      const $wrapper = $form.closest('.elementor-element');
      const $header = $wrapper.prevAll('h2,h3').first();

      if (!$header.length) {
        console.log('⏭️ Skipping form — no valid header found.');
        return;
      }

      const rawText = $header.text().trim();
      if (!rawText) return;

      const productName = rawText.toLowerCase().replace(/\s+/g, '_');
      const { FormModel, CombinationModel } = getModels(productName);

      // Skip if already scraped
      const existing = await FormModel.estimatedDocumentCount();
      if (existing > 0) {
        console.log(`⏩ Skipped "${productName}" — already exists with ${existing} fields.`);
        results.push({ product: productName, skipped: true });
        return;
      }

      const selects = $form.find('select');
      if (!selects.length) {
        console.log(`⚠️ No <select> fields in form "${productName}"`);
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
          product: productName  // ✅ Consistently saved for filtering
        });
      });

      if (!formFields.length) {
        console.log(`⚠️ Skipping "${productName}" — no valid select fields found.`);
        return;
      }

      await FormModel.deleteMany({});
      await FormModel.insertMany(formFields);
      await CombinationModel.deleteMany({}); // prepare for generation

      results.push({ product: productName, fieldsCount: formFields.length });
      console.log(`✅ Scraped and saved: ${productName} (${formFields.length} fields)`);
    });

    // Allow async .each() to finish
    setTimeout(() => {
      res.json({ success: true, formsProcessed: results });
    }, 500);
  } catch (err) {
    console.error('❌ scrape-multi error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Generate combinations for any scraped product
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
    const combos = generateCombinations(optionGroups);

    const docs = combos.map(options => ({
      options,
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
