const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const FormFullColor = require('./models/FormFullColor');
const FormBlack = require('./models/FormBlack');
const Combination = require('./models/Combination');

async function scrapeGroups(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Scrape Full Color
  await page.select('select[name="select-3"]', 'Full Color');
  await page.waitForTimeout(1000);
  const fullColorFields = await page.evaluate(scrapeFormFields);
  await FormFullColor.deleteMany({});
  await FormFullColor.insertMany(fullColorFields);
  console.log('✅ Saved Full Color fields:', fullColorFields.length);

  // Scrape Black
  await page.select('select[name="select-3"]', 'Black');
  await page.waitForTimeout(1000);
  const blackFields = await page.evaluate(scrapeFormFields);
  await FormBlack.deleteMany({});
  await FormBlack.insertMany(blackFields);
  console.log('✅ Saved Black fields:', blackFields.length);

  // Extract options for combinations
  const fullColorOptions = extractOptions(fullColorFields);
  const blackOptions = extractOptions(blackFields);

  console.log('\n🧩 fullColorOptions:', fullColorOptions);
  console.log('🧩 blackOptions:', blackOptions);

  const fullColorCombos = generateCombinations(fullColorOptions);
  const blackCombos = generateCombinations(blackOptions);

  await syncCombinations('Full Color', fullColorCombos);
  await syncCombinations('Black', blackCombos);

  await browser.close();
  await logCombinationSummary();
}

function scrapeFormFields() {
  const fields = [];
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
      options = Array.from(el.options).map(o => o.text.trim());
    }

    fields.push({ name, label, type, options });
  });

  return fields;
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
  console.log(`\n⏳ [${groupName}] Preparing to sync combinations...`);

  const existingCombos = await Combination.find({ group: groupName });

  const existingMap = new Map();
  for (const combo of existingCombos) {
    const key = JSON.stringify(combo.options);
    existingMap.set(key, combo);
  }

  const toInsert = [];
  const toDelete = new Map(existingMap);

  for (const newCombo of newCombinations) {
    const key = JSON.stringify(newCombo);
    if (!existingMap.has(key)) {
      toInsert.push({ group: groupName, options: newCombo });
    } else {
      toDelete.delete(key);
    }
  }

  console.log(`🔍 [${groupName}] Changes detected:`);
  console.log(`   ➕ To Insert: ${toInsert.length}`);
  console.log(`   ➖ To Delete: ${toDelete.size}`);

  if (toDelete.size > 0) {
    const deleteIds = Array.from(toDelete.values()).map(c => c._id);
    console.log(`🧹 [${groupName}] Deleting ${deleteIds.length} outdated combinations...`);
    await Combination.deleteMany({ _id: { $in: deleteIds } });
    console.log(`✅ [${groupName}] Deletion complete.`);
  }

  if (toInsert.length > 0) {
    console.log(`📦 [${groupName}] Inserting ${toInsert.length} new combinations in batches...`);
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      console.log(`   🔄 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toInsert.length / batchSize)}...`);
      await Combination.insertMany(batch);
    }
    console.log(`✅ [${groupName}] Insertion complete.`);
  }

  if (toInsert.length === 0 && toDelete.size === 0) {
    console.log(`📭 [${groupName}] No changes to apply.`);
  }

  console.log(`🎉 [${groupName}] Sync complete.\n`);
}

async function logCombinationSummary() {
  try {
    const allCombos = await Combination.find({});
    if (!allCombos.length) {
      console.log('\n⚠️ No combinations found in the database.\n');
      return;
    }

    const grouped = allCombos.reduce((acc, combo) => {
      if (!acc[combo.group]) acc[combo.group] = [];
      acc[combo.group].push(combo);
      return acc;
    }, {});

    console.log('\n📊 Current Combinations Summary:');

    for (const [group, combos] of Object.entries(grouped)) {
      console.log(`\n🔹 ${group}: ${combos.length} combinations`);
      combos.forEach(c => {
        console.log(`  • ${c.options.join(' | ')}`);
      });
    }

    console.log('\n✅ End of combinations summary.\n');
  } catch (err) {
    console.error('❌ Failed to fetch combinations:', err.message);
  }
}

module.exports = scrapeGroups;
