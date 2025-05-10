const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const FormFullColor = require('./models/FormFullColor');
const FormBlack = require('./models/FormBlack');
const Combination = require('./models/Combination');

async function scrapeGroups(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // ✅ Get field data from MongoDB (from earlier scraping)
  const fullColorFields = await FormFullColor.find({});
  const blackFields = await FormBlack.find({});

  // ✅ Extract select options for each dropdown
  function extractOptions(fields) {
    return fields
      .filter(f => f.type === 'select' && f.options?.length)
      .map(f => f.options.map(o => o.label?.trim()).filter(Boolean));
  }

  const fullColorOptions = extractOptions(fullColorFields);
  const blackOptions = extractOptions(blackFields);

  // ✅ Generate cartesian combinations
  const fullColorCombos = generateCombinations(fullColorOptions);
  const blackCombos = generateCombinations(blackOptions);

  // ✅ Update only affected records
  await syncCombinations('Full Color', fullColorCombos);
  await syncCombinations('Black', blackCombos);

  await browser.close();

  // ✅ Print combination summary to console
  await logCombinationSummary();
}

async function syncCombinations(groupName, newCombinations) {
  const existingCombos = await Combination.find({ group: groupName });

  const existingMap = new Map();
  for (const combo of existingCombos) {
    const key = JSON.stringify(combo.options);
    existingMap.set(key, combo);
  }

  const toInsert = [];
  const toDelete = new Map(existingMap); // Clone map for deletion

  for (const newCombo of newCombinations) {
    const key = JSON.stringify(newCombo);
    if (!existingMap.has(key)) {
      toInsert.push({ group: groupName, options: newCombo });
    } else {
      toDelete.delete(key);
    }
  }

  console.log(`\n🧪 Syncing combinations for group: ${groupName}`);
  console.log(`🔼 To Insert:`, toInsert);
  console.log(`❌ To Delete:`, Array.from(toDelete.values()));

  if (toInsert.length > 0) {
    await Combination.insertMany(toInsert);
  }

  if (toDelete.size > 0) {
    const deleteIds = Array.from(toDelete.values()).map(c => c._id);
    await Combination.deleteMany({ _id: { $in: deleteIds } });
  }

  console.log(`✅ Combination sync complete for group: ${groupName}`);
}

function generateCombinations(fields) {
  const cartesian = arr =>
    arr.reduce((a, b) => a.flatMap(d => b.map(e => [...d, e])), [[]]);

  return cartesian(fields);
}

async function logCombinationSummary() {
  const allCombos = await Combination.find({});

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
}

module.exports = scrapeGroups;
