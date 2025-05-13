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

router.post('/scrape-multi', async (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ success: false, error: 'Missing URL' });

  try {
    const pageRes = await axios.get(url);
    const $ = cheerio.load(pageRes.data);
    const results = [];

    $('h2, h3').each((_, header) => {
      const $header = $(header);
      const formName = $header.text().trim().toLowerCase().replace(/\s+/g, '_');

      // Search siblings below the header for a nested Forminator form
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
          productTag: formName // ✅ Include productTag
        });
      });

      const { FormModel, CombinationModel } = getModels(formName);

      FormModel.deleteMany({})
        .then(() => FormModel.insertMany(formFields))
        .catch(err => console.error(`❌ Failed to save form_${formName}:`, err.message));

      CombinationModel.deleteMany({}); // init/reset combinations

      results.push({ formName, fieldsCount: formFields.length });
      console.log(`✅ Processed form: ${formName} with ${formFields.length} fields`);
    });

    res.json({ success: true, formsProcessed: results });
  } catch (err) {
    console.error('❌ scrape-multi error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
