const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const FormFullColor = require('./models/FormFullColor');
const FormBlack = require('./models/FormBlack');
const Combination = require('./models/Combination');

async function scrapeGroups(url) {
  console.log('🌍 Fetching:', url);

  let html;
  try {
    const res = await axios.get(url);
    html = res.data;
    console.log('✅ Page fetched');
  } catch (err) {
    console.error('❌ Failed to fetch page:', err.message);
    throw err;
  }

  const $ = cheerio.load(html);
  const fullColorFields = [];
  const blackFields = [];

  $('.forminator-field select').each((_, el) => {
    const $el = $(el);
    const label = $el.closest('.forminator-field').find('label').text().trim();
    const name = $el.attr('name') || '';
    const options = $el.find('option').map((_, o) => $(o).text().trim()).get();

    if (!name || name === 'select-3') return;

    const field = { name, label, type: 'select', options };

    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('black')) {
      blackFields.push(field);
    } else if (lowerLabel.includes('full color') || lowerLabel.includes('print color')) {
      fullColorFields.push(field);
    } else {
      fullColorFields.push(field);
      blackFields.push(field);
    }
  });

  // Save
  await FormFullColor.deleteMany({});
  await FormFullColor.insertMany(fullColorFields);
  console.log('✅ Full Color fields saved:', fullColorFields.length);

  await FormBlack.deleteMany({});
  await FormBlack.insertMany(blackFields);
  console.log('✅ Black fields saved:', blackFields.length);

  const savedFull = await FormFullColor.find({});
  const savedBlack = await FormBlack.find({});

  const fullColorOptions = extractOptions(savedFull);
  const blackOptions = extractOptions(savedBlack);

  const fullColorCombos = generateCombinations(fullColorOptions);
  const blackCombos = generateCombinations(blackOptions);

  await syncCombinations('Full Color', fullColorCombos);
  await syncCombinations('Black', blackCombos);
  await logCombinationSummary();
}

function extractOptions(fields) {
  return fields
    .filter(f => f.type === 'select' && Array.isArray(f.options))
    .map(f =>
      f.options
        .map(o => o.trim())
        .filter(Boolean)
    );
}

function generateCombinations(fields) {
  const cartesian = arr =>
    arr.reduce((a, b) => a.flatMap(d => b.map(e => [...d, e])), [[]]);
  return cartesian(fields);
}

async function syncCombinations(group, newCombos, batchSize = 100) {
  console.log(`\n⏳ Syncing [${group}] combos...`);
  const existing = await Combination.find({ group });

  const existingMap = new Map(
    existing.map(e => [JSON.stringify(e.options), e])
  );

  const newMap = new Map(
    newCombos.map(combo => [JSON.stringify(combo), combo])
  );

  const toInsert = [];
  for (const [key, combo] of newMap.entries()) {
    if (!existingMap.has(key)) {
      toInsert.push({
        group,
        options: combo,
        price: 0
      });
    }
  }

  const toDelete = [];
  for (const [key, comboDoc] of existingMap.entries()) {
    if (!newMap.has(key)) {
      toDelete.push(comboDoc._id);
    }
  }

  if (toInsert.length) {
    console.log(`📦 Inserting ${toInsert.length} new combos...`);
    for (let i = 0; i < toInsert.length; i += batchSize) {
      await Combination.insertMany(toInsert.slice(i, i + batchSize));
    }
  }

  if (toDelete.length) {
    console.log(`🗑️ Removing ${toDelete.length} outdated combos...`);
    await Combination.deleteMany({ _id: { $in: toDelete } });
  }

  if (!toInsert.length && !toDelete.length) {
    console.log(`📭 No changes for ${group}.`);
  } else {
    console.log(`✅ Sync complete for ${group}`);
  }
}

async function logCombinationSummary() {
  const all = await Combination.find({});
  if (!all.length) return console.log('⚠️ No combinations in DB');

  const grouped = all.reduce((acc, c) => {
    acc[c.group] = acc[c.group] || [];
    acc[c.group].push(c);
    return acc;
  }, {});

  console.log('\n📊 Combination Summary:');
  for (const [group, items] of Object.entries(grouped)) {
    console.log(`🔸 ${group}: ${items.length} combinations`);
  }
}

module.exports = scrapeGroups;
