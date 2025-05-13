const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');

const router = express.Router();

function getModels(formName) {
  const FormModel = mongoose.model(`form_${formName}`, new mongoose.Schema({}, { strict: false }));
  const CombinationModel = mongoose.model(`combinations_${formName}`, new mongoose.Schema({}, { strict: false }));
  return { FormModel, CombinationModel };
}

function generateCombinations(optionGroups) {
  if (!optionGroups.length) return [];
  return optionGroups.reduce((a, b) =>
    a.flatMap(d => b.map(e => [...d, e])), [[]]);
}

router.post('/scrape-multi', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'Missing URL' });

  try {
    const pageRes = await axios.get(url);
    const $ = cheerio.load(pageRes.data);
    const results = [];

    const headers = $('h2, h3').toArray(); // convert to array for proper async loop

    for (const header of headers) {
      const $header = $(header);
      const rawText = $header.text().trim();

      const skipList = [
        'combination price matrix',
        'help', 'payment', 'custom', 'our companies', 'minimoqpack',
      ];
      const headerText = rawText.toLowerCase();
      if (!rawText || skipList.some(keyword => headerText.includes(keyword))) continue;

      const formName = headerText.replace(/\s+/g, '_');
      const { FormModel } = getModels(formName);

      const alreadyExists = await FormModel.estimatedDocumentCount();
      if (alreadyExists > 0) {
        console.log(`⏩ Skipped "${formName}" — already scraped`);
        results.push({ product: formName, skipped: true });
        continue;
      }

      const $nextElems = $header.closest('.elementor-element').nextAll();
      let $form = null;

      $nextElems.each((_, el) => {
        const $el = $(el);
        const foundForm = $el.find('form.forminator-custom-form, form.forminator-form');
        if (foundForm.length) {
          $form = foundForm.first();
          return false; // break loop
        }
      });

      if (!$form || !$form.length) {
        console.log(`⚠️ No form found for "${formName}"`);
        continue;
      }

      const selects = $form.find('select');
      if (!selects.length) {
        console.log(`⚠️ No <select> fields in form "${formName}"`);
        continue;
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
          product: formName,
        });
      });

      if (!formFields.length) {
        console.log(`⚠️ Skipping "${formName}" — no valid select fields found.`);
        continue;
      }

      // Save the form fields only
      await FormModel.deleteMany({});
      await FormModel.insertMany(formFields);

      // 🔁 Generate combinations (but don't save them to DB)
      const optionGroups = formFields.map(f => f.options);
      const combinations = generateCombinations(optionGroups);

      console.log(`📊 "${formName}": ${combinations.length} combinations generated.`);
      console.log('🧪 Sample combinations:', combinations.slice(0, 5));

      results.push({ product: formName, fieldsCount: formFields.length, combinations: combinations.length });
    }

    res.json({ success: true, formsProcessed: results });
  } catch (err) {
    console.error('❌ scrape-multi error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Generate combinations manually (unchanged)
router.post('/generate-combinations/:product', async (req, res) => {
  const { product } = req.params;

  if (!product) return res.status(400).json({ success: false, error: 'Missing product name' });

  try {
    const { FormModel, CombinationModel } = getModels(product);
    const fields = await FormModel.find({});
    if (!fields.length) return res.status(404).json({ success: false, error: `No fields found for "${product}"` });

    const optionGroups = fields.map(field => field.options || []);
    const combos = generateCombinations(optionGroups);

    const docs = combos.map(options => ({
      options,
      price: 0,
      group: product,
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
