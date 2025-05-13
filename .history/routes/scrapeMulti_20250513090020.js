const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');

const router = express.Router();

// Utility: generate dynamic models per form name
function getModels(formName) {
  const FormModel = mongoose.model(`form_${formName}`, new mongoose.Schema({}, { strict: false }));
  const CombinationModel = mongoose.model(`combinations_${formName}`, new mongoose.Schema({}, { strict: false }));
  return { FormModel, CombinationModel };
}

// 🧠 Combination generator utility
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

// ✅ SCRAPE MULTI-FORMS
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

      if (!rawText || rawText.toLowerCase().includes('combination price matrix')) return;

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

        if (!name) return;

        formFields.push({
          name,
          label,
          options,
          type: 'select',
          product: formName // ✅ Use `product`
        });
      });

      FormModel.deleteMany({})
        .then(() => FormModel.insertMany(formFields))
        .catch(err => console.error(`❌ Failed to save form_${formName}:`, err.message));

      CombinationModel.deleteMany({}); // reset

      results.push({ formName, fieldsCount: formFields.length });
      console.log(`✅ Processed form: ${formName} with ${formFields.length} fields`);
    });

    res.json({ success: true, formsProcessed: results });
  } catch (err) {
    console.error('❌ scrape-multi error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ GENERATE COMBINATIONS
router.post('/generate-combinations/:product', async (req, res) => {
  const { product } = req.params;

  if (!product) return res.status(400).json({ success: false, error: 'Missing product name' });

  try {
    const { FormModel, CombinationModel } = getModels(product);

    const fields = await FormModel.find({});
    if (!fields.length) {
      return res.status(404).json({ success: false, error: `No fields found for form_${product}` });
    }

    // Extract just the option arrays for each select
    const optionGroups = fields.map(field => field.options || []);

    const combinations = generateCombinations(optionGroups);

    const combinationDocs = combinations.map(combo => ({
      options: combo,
      price: 0,
      group: product
    }));

    await CombinationModel.deleteMany({});
    await CombinationModel.insertMany(combinationDocs);

    console.log(`✅ Generated ${combinationDocs.length} combinations for "${product}"`);
    res.json({ success: true, total: combinationDocs.length });
  } catch (err) {
    console.error(`❌ Failed to generate combinations for "${product}":`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
