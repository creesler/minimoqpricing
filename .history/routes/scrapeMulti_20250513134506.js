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
  if (optionGroups.length === 0) return [];
  if (optionGroups.length === 1) return optionGroups[0].map(opt => [opt]);

  const rest = generateCombinations(optionGroups.slice(1));
  return optionGroups[0].flatMap(opt => rest.map(r => [opt, ...r]));
}

router.post('/scrape-multi', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'Missing URL' });

  try {
    const pageRes = await axios.get(url);
    const $ = cheerio.load(pageRes.data);
    const results = [];

    $('h2, h3').each(async (_, header) => {
      const $header = $(header);
      const rawText = $header.text().trim();

      // ✅ Skip non-product headers
      const skipList = [
        'combination price matrix',
        'help', 'payment', 'custom', 'our companies', 'minimoqpack',
      ];
      const headerText = rawText.toLowerCase();
      if (!rawText || skipList.some(keyword => headerText.includes(keyword))) return;

      const formName = headerText.replace(/\s+/g, '_');
      const { FormModel, CombinationModel } = getModels(formName);

      // ✅ Skip if already exists
      const alreadyExists = await FormModel.estimatedDocumentCount();
      if (alreadyExists > 0) {
        console.log(`⏩ Skipped "${formName}" — already scraped (${alreadyExists} fields)`);
        results.push({ product: formName, skipped: true });
        return;
      }

      // ✅ Find form after header
      const $nextElems = $header.closest('.elementor-element').nextAll();
      let $form = null;

      $nextElems.each((_, el) => {
        const $el = $(el);
        const foundForm = $el.find('form.forminator-custom-form, form.forminator-form');
        if (foundForm.length) {
          $form = foundForm.first();
          return false; // break
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
          product: formName,
        });
      });

      if (!formFields.length) {
        console.log(`⚠️ Skipping "${formName}" — no valid select fields found.`);
        return;
      }

      await FormModel.deleteMany({});
      await FormModel.insertMany(formFields);
      await CombinationModel.deleteMany({}); // ready for generation

      results.push({ product: formName, fieldsCount: formFields.length });
      console.log(`✅ Processed "${formName}" with ${formFields.length} fields`);
    });

    // Allow async each to complete
    setTimeout(() => {
      res.json({ success: true, formsProcessed: results });
    }, 500);
  } catch (err) {
    console.error('❌ scrape-multi error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Generate combinations
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
