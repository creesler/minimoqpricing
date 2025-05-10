const puppeteer = require('puppeteer');
const FormFullColor = require('./models/FormFullColor');
const FormBlack = require('./models/FormBlack');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 🔧 Generate all combinations of select fields
function generateCombinations(fields) {
  const dropdowns = fields.filter(f => f.type === 'select' && f.options.length > 0);
  if (dropdowns.length === 0) return [];

  const cartesian = (arr) =>
    arr.reduce((a, b) => a.flatMap(d => b.map(e => [...d, e])), [[]]);

  const optionsList = dropdowns.map(field =>
    field.options.map(option => ({ [field.name]: option }))
  );

  const rawCombos = cartesian(optionsList);

  return rawCombos.map(comboList => {
    const combo = Object.assign({}, ...comboList);
    combo.price = 0;
    return combo;
  });
}

async function scrapeGroups(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('🌐 Opening page...');
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await delay(1000);

  // 📦 Scrape and group fields by label keywords
  const result = await page.evaluate(() => {
    const fullColorFields = [];
    const blackFields = [];

    const containers = document.querySelectorAll('.forminator-field');

    containers.forEach(container => {
      const el = container.querySelector('input, select, textarea');
      if (!el || !el.name) return;

      const tag = el.tagName.toLowerCase();
      const name = el.name;
      const labelEl = container.querySelector('label');
      const label = labelEl ? labelEl.innerText.trim() : '';
      const type = el.getAttribute('type') || tag;

      let options = [];
      if (tag === 'select') {
        options = Array.from(el.options).map(o => o.text.trim());
      }

      const field = { name, type, label, options };

      // Simple group logic based on label
      const labelText = label.toLowerCase();
      if (labelText.includes('black')) {
        blackFields.push(field);
      } else if (labelText.includes('full color') || labelText.includes('print color')) {
        fullColorFields.push(field);
      } else {
        // if it doesn't mention either, include in both
        blackFields.push(field);
        fullColorFields.push(field);
      }
    });

    return { fullColorFields, blackFields };
  });

  // 💾 Save to MongoDB
  await FormFullColor.deleteMany({});
  await FormFullColor.insertMany(result.fullColorFields);
  console.log('✅ Full Color fields saved.');

  await FormBlack.deleteMany({});
  await FormBlack.insertMany(result.blackFields);
  console.log('✅ Black fields saved.');

  await browser.close();
  console.log('🚪 Browser closed.\n');

  // 🔁 Generate combinations from saved database data
  console.log('🔁 Fetching from DB to generate combinations...');
  const fullColorSaved = await FormFullColor.find({});
  const blackSaved = await FormBlack.find({});

  const fullColorCombos = generateCombinations(fullColorSaved);
  const blackCombos = generateCombinations(blackSaved);

  // 🖨️ Log results
  console.log('🧩 Full Color Combinations with price = 0:');
  console.dir(fullColorCombos, { depth: null });

  console.log('\n🧩 Black Combinations with price = 0:');
  console.dir(blackCombos, { depth: null });
}

module.exports = scrapeGroups;
