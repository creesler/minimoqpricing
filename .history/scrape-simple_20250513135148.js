const axios = require('axios');
const cheerio = require('cheerio');

const TARGET_URL = 'https://minimoqpack.com/admin-pricing/';

(async () => {
  try {
    console.log(`🔍 Fetching: ${TARGET_URL}`);
    const { data: html } = await axios.get(TARGET_URL);
    const $ = cheerio.load(html);

    const results = [];

    $('h2, h3').each((_, header) => {
      const $header = $(header);
      const title = $header.text().trim();

      // Skip irrelevant headers
      const skip = ['combination price matrix', 'help', 'payment', 'custom', 'our companies', 'minimoqpack'];
      if (!title || skip.some(k => title.toLowerCase().includes(k))) return;

      const formName = title.toLowerCase().replace(/\s+/g, '_');

      const $nextElems = $header.closest('.elementor-element').nextAll();
      let $form = null;

      $nextElems.each((_, el) => {
        const foundForm = $(el).find('form.forminator-custom-form, form.forminator-form');
        if (foundForm.length) {
          $form = foundForm.first();
          return false; // break loop
        }
      });

      if (!$form?.length) {
        console.log(`⚠️ No form found under "${formName}"`);
        return;
      }

      const selects = $form.find('select');
      if (!selects.length) {
        console.log(`⚠️ No <select> fields in "${formName}"`);
        return;
      }

      const fields = [];

      selects.each((_, el) => {
        const $el = $(el);
        const label = $el.closest('.forminator-field').find('label').text().trim();
        const name = $el.attr('name') || '';
        const options = $el.find('option').map((_, o) => $(o).text().trim()).get();

        if (!name || !options.length) return;

        fields.push({ name, label, options, type: 'select', product: formName });
      });

      if (fields.length) {
        results.push({ formName, fields });
        console.log(`✅ Scraped "${formName}" with ${fields.length} fields`);
      }
    });

    console.log('\n🧾 Final Result:', JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('❌ Scraping failed:', err.message);
  }
})();
