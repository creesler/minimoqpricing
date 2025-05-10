const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const Combination = require('./models/Combination'); // Adjust path if needed

async function scrapeGroups(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // 🔧 Replace with actual form field combinations from your logic
  const fullColorCombos = generateCombinations([
    ['A4', 'A5'],
    ['Glossy', 'Matte'],
    ['Single', 'Double']
  ]);

  const blackCombos = generateCombinations([
    ['A4'],
    ['Plain'],
    ['Single']
  ]);

  await syncCombinations('Full Color', fullColorCombos);
  await syncCombinations('Black', blackCombos);

  await browser.close();
}

async function syncCombinations(groupName, newCombinations) {
  const existingCombos = await Combination.find({ group: groupName });

  const existingMap = new Map();
  for (const combo of existingCombos) {
    const key = JSON.stringify(combo.options);
    existingMap.set(key, combo);
  }

  const toInsert = [];
  const toDelete = new Map(existingMap); // Clone

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

module.exports = scrapeGroups;
