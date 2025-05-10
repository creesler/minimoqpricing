const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const FormFullColor = require('./models/FormFullColor');
const FormBlack = require('./models/FormBlack');
const Combination = require('./models/Combination');

async function scrapeGroups(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('🌍 Navigating to:', url);
  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log('✅ Page loaded');
  } catch (err) {
    console.error('❌ Failed to open page:', err.message);
    await browser.close();
    throw err;
  }

  const { fullColorFields, blackFields } = await page.evaluate(() => {
    const fullColorFields = [];
    const blackFields = [];
    const containers = document.querySelectorAll('.forminator-field');

    containers.forEach(container => {
      const el = container.querySelector('input, select, textarea');
      if (!el || !el.name || el.name === 'select-3') return;

      const tag = el.tagName.toLowerCase();
      const name = el.name;
      const labelEl = container.querySelector('label');
      const label = labelEl ? labelEl.innerText.trim() : '';
      const type = el.getAttribute('type') || tag;

      let options = [];
      if (tag === 'select') {
        options = el.options
          ? Array.from(el.options).map(o => o.text?.trim()).filter(Boolean)
          : [];
      }

      const field = { name, label, type, options };

      const labelText = label.toLowerCase();
      if (labelText.includes('black')) {
        blackFields.push(field);
      } else if (labelText.includes('full color') || labelText.includes('print color')) {
        fullColorFields.push(field);
      } else {
        blackFields.push(field);
        fullColorFields.push(field);
      }
    });

    return { fullColorFields, blackFields };
  });

  await FormFullColor.deleteMany({});
  await FormFullColor.insertMany(fullColorFields);
  console.log('✅ Saved Full Color fields:', fullColorFields.length);

  await FormBlack.deleteMany({});
  await FormBlack.insertMany(blackFields);
  console.log('✅ Saved Black fields:', blackFields.length);

  const savedFullColorFields = await FormFullColor.find({});
  const savedBlackFields = await FormBlack.find({});

  const fullColorOptions = extractOptions(savedFullColorFields);
  const blackOptions = extractOptions(savedBlackFields);

  console.log('\n🧩 Full Color options:', fullColorOptions);
  console.log('🧩 Black options:', blackOptions);

  const fullColorCombos = generateCombinations(fullColorOptions);
  const blackCombos = generateCombinations(blackOptions);

  await syncCombinations('Full Color', fullColorCombos);
  await syncCombinations('Black', blackCombos);

  await browser.close();
  await logCombinationSummary();
}

function extractOptions(fields) {
  return fields
    .filter(f => f.type === 'select' && Array.isArray(f.options))
    .map(f =>
      f.options
        .map(o => (typeof o === 'string' ? o.trim() : o.label?.trim()))
        .filter(Boolean)
    );
}

function generateCombinations(fields) {
  const cartesian = arr =>
    arr.reduce((a, b) => a.flatMap(d => b.map(e => [...d, e])), [[]]);
  return cartesian(fields);
}

async function syncCombinations(groupName, newCombinations, batchSize = 100) {
  console.log(`\n⏳ [${groupName}] Syncing combinations...`);
  const existingCombos = await Combination.find({ group: groupName });

  const existingSet = new Set(existingCombos.map(c => JSON.stringify(c.options)));
  const newSet = new Set(newCombinations.map(c => JSON.stringify(c)));

  // 🔻 Delete combinations no longer valid
  const toDelete = existingCombos.filter(c => !newSet.has(JSON.stringify(c.options)));
  if (toDelete.length > 0) {
    console.log(`🗑️ [${groupName}] Deleting ${toDelete.length} outdated combinations...`);
    const deleteIds = toDelete.map(c => c._id);
    await Combination.deleteMany({ _id: { $in: deleteIds } });
  }

  // 🔼 Insert new combinations
  const toInsert = newCombinations
    .filter(c => !existingSet.has(JSON.stringify(c)))
    .map(c => ({
      group: groupName,
      options: c,
      price: 0
    }));

  if (toInsert.length > 0) {
    console.log(`📦 [${groupName}] Inserting ${toInsert.length} new combinations...`);
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      console.log(`   🔄 Batch ${Math.floor(i / batchSize) + 1}`);
      await Combination.insertMany(batch);
    }
  } else {
    console.log(`📭 [${groupName}] No new combinations.`);
  }

  console.log(`✅ [${groupName}] Sync complete.`);
}

async function logCombinationSummary() {
  try {
    const allCombos = await Combination.find({});
    if (!allCombos.length) {
      console.log('⚠️ No combinations found.');
      return;
    }

    const grouped = allCombos.reduce((acc, combo) => {
      if (!acc[combo.group]) acc[combo.group] = [];
      acc[combo.group].push(combo);
      return acc;
    }, {});

    console.log('\n📊 Current Combination Summary:');
    for (const [group, combos] of Object.entries(grouped)) {
      console.log(`🔹 ${group}: ${combos.length} combos`);
      combos.forEach(c => console.log('  •', c.options.join(' | ')));
    }
  } catch (err) {
    console.error('❌ Summary failed:', err.message);
  }
}

module.exports = scrapeGroups;
