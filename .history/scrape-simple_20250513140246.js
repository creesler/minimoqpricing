const axios = require('axios');
const cheerio = require('cheerio');

// Utility: generate cartesian product of options
function generateCombinations(optionGroups) {
  if (!optionGroups.length) return [];
  return optionGroups.reduce((a, b) =>
    a.flatMap(d => b.map(e => [...d, e]))
  , [[]]);
}

// Main scrape + generate
(async () => {
  const url = 'https://minimoqpack.com/admin-pricing/';

  try {
    console.log(`🌐 Fetching: ${url}`);
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);
    const results = [];

    $('h2, h3').each((_, header) => {
      const $header = $(header);
      const rawText = $header.text().trim();
      const skipList = ['combination price matrix', 'help', 'payment', 'custom', 'our companies', 'minimoqpack'];

      if (!rawText || skipList.some(k => rawText.toLowerCase().includes(k))) return;

      const formName = rawText.toLowerCase().replace(/\s+/g, '_');
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
        fields.push({ name, label, options });
      });

      if (!fields.length) {
        console.log(`⚠️ Skipping "${formName}" — no valid fields found.`);
        return;
      }

      const optionGroups = fields.map(f => f.options);
      const combinations = generateCombinations(optionGroups);

      results.push({ product: formName, fields, combinations });

      console.log(`✅ "${formName}": ${fields.length} fields → ${combinations.length} combinations`);
    });

    // Final output
    console.log(`\n🧾 Summary: ${results.length} product(s) scraped\n`);
    for (const result of results) {
      console.log(`🔹 Product: ${result.product}`);
      console.log(`   Fields: ${result.fields.map(f => f.label).join(', ')}`);
      console.log(`   Total combinations: ${result.combinations.length}`);
      console.log('   Sample:', result.combinations.slice(0, 3), '\n');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
