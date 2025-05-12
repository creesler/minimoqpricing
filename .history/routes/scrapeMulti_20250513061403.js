// routes/scrapeMulti.js
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
      const $form = $header.nextAll('.forminator-custom-form, .forminator-form').first();
      if (!$form.length) return;

      const formFields = [];

      $form.find('select').each((_, el) => {
        const $el = $(el);
        const label = $el.closest('.forminator-field').find('label').text().trim();
        const name = $el.attr('name') || '';
        const options = $el.find('option').map((_, o) => $(o).text().trim()).get();

        if (!name) return;
        formFields.push({ name, label, options, type: 'select' });
      });

      const { FormModel, CombinationModel } = getModels(formName);
      FormModel.deleteMany({}).then(() => FormModel.insertMany(formFields));
      CombinationModel.deleteMany({}); // initialize combinations

      results.push({ formName, fieldsCount: formFields.length });
    });

    res.json({ success: true, formsProcessed: results });
  } catch (err) {
    console.error('❌ scrape-multi error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
