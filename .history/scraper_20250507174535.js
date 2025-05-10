const puppeteer = require('puppeteer');
const FormFullColor = require('./models/FormFullColor');
const FormBlack = require('./models/FormBlack');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ✅ Generate readable combinations excluding Print Color field
function generateCombinations(fields, groupName) {
  const dropdowns = fields.filter(f => {
    const isSelect = f.type === 'select' && f.options.length > 0;
    const isPrintColor = f.name === 'select-3' || (f.label || '').toLowerCase().includes('print color');
    return isSelect && !isPrintColor;
  });

  if (dropdowns.length === 0) {
    console.warn(`⚠️ No valid dropdowns found for ${groupName}`);
    return [];
  }

  const cartesian = (arr) =>
    arr.reduce((a, b) => a.flatMap(d => b.map(e => [...d, e])), [[]]);

  const optionsList = dropdowns.map(field =>
    field.options.map(option => ({ [field.label || field.name]: option }))
  );

  const rawCombos = cartesian(optionsList);

  return rawCombos.map(comboList => {
    const combo = Object.assign({}, ...comboList);
    combo['Print Color'] = groupName;
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

  const result = await page.evaluate(() => {
    const fullColorFields = [];
    const blackFields = [];

    const containers = document.querySelectorAll('.forminator-field');

    containers.forEach(container => {
      const el = container.querySelector('input, select, textarea');
      if (!el || !el.name) return;
      if (el.name === 'select-3') return; // ⛔ skip Print Color

      const tag = el.tagName.toLowerCase();
      const name = el.name;
      const labelEl = container.querySelector('label');
      const label = labelEl ? labelEl.innerText.trim() : '';
      const type = el.getAttribute('type') || tag;

      let options = [];
      if (tag === 'select') {
        options = Array.from(el.options).map(o => o.text.trim());
      }

      const field = { name, label, type, options };

      const labelText = label.toLowerCase();
      if (labelText.includes('black')) {
        blackFields.push(field);
      } else if (labelText.includes('full color') || labelText.includes('print color')) {
        fullColorFields.push(field);
      } else {
        // shared dropdowns go to both
        blackFields.push(field);
        fullColorFields.push(field);
      }
    });

    return { fullColorFields, blackFields };
  });

  // ✅ Show scraped fields
  console.log('\n🧾 Scraped Full Color Fields:');
  console.dir(result.fullColorFields, { depth: null });

  console.log('\n🧾 Scraped Black Fields:');
  console.dir(result.blackFields, { depth: null });

  // 💾 Save to MongoDB
  await FormFullColor.deleteMany({});
  await FormFullColor.insertMany(result.fullColorFields);
  console.log('✅ Full Color fields saved.');

  await FormBlack.deleteMany({});
  await FormBlack.insertMany(result.blackFields);
  console.log('✅ Black fields saved.');

  await browser.close();
  console.log('🚪 Browser closed.');

  // 🔁 Generate combinations from DB
  console.log('\n📦 Retrieving from DB to generate combinations...');
  const fullColorSaved = await FormFullColor.find({});
  const blackSaved = await FormBlack.find({});

  const fullColorCombos = generateCombinations(
    fullColorSaved.map(doc => doc.toObject()),
    'Full Color'
  );
  const blackCombos = generateCombinations(
    blackSaved.map(doc => doc.toObject()),
    'Black'
  );

  console.log(`\n🧩 Full Color Combinations (Total: ${fullColorCombos.length}):`);
  console.dir(fullColorCombos, { depth: null });

  console.log(`\n🧩 Black Combinations (Total: ${blackCombos.length}):`);
  console.dir(blackCombos, { depth: null });
}

module.exports = scrapeGroups;
