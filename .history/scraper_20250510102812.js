const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const FormFullColor = require('./models/FormFullColor');
const FormBlack = require('./models/FormBlack');
const Combination = require('./models/Combination');

async function scrapeGroups(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--ignore-certificate-errors'
    ]
  });

  const page = await browser.newPage();

  console.log('🔍 Navigating to:', url);
  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
  } catch (err) {
    console.error('❌ Failed to open page:', err.message);
    await browser.close();
    throw err;
  }

  // Scrape form fields and classify them
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
        options = Array.from(el.options).map(o => o.text.trim());
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

  // Save updated form field definitions (overwrite only FormBlack/FormFullColor)
  await FormFullColor.deleteMany({});
  await FormFullColor.insertMany(fullColorFields);
  console.log('✅ Saved Full Color fields:', fullColorFields.length);

  await FormBlack.deleteMany({});
  await FormBlack.insertMany(blackFields);
  console.log('✅ Saved Black fields:', blackFields.length);

  // Load saved data
  const savedFullColorFields = await FormFullColor.find({});
  const savedBlackFields = await FormBlack.find({});

  const fullColorOptions = extractOptions(savedFullColorFields);
  const blackOptions = extractOptions(savedBlackFields);

  console.log('\n🧩 fullColorOptions:', fullColorOptions);
  console.log('🧩 blackOptions:', blackOptions);

  const fullColorCombos = generateCombinations(fullColorOptions);
  const blackCombos = generateCombinations(blackOptions);

  // ✅ Do NOT delete combinations — preserve existing prices
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

// ✅ This will only insert new combinations without touching existing prices
async function syncCombinations(groupName, newCombinations, batchSize = 100) {
  console.log(`\n⏳ [${groupName}] Preparing to sync combinations...`);

  // Fetch all current combinations for the group
  const existingCombos = await Combination.find({ group: groupName });

  // Compare to find new ones
  const toInsert = newCombinations
    .filter(combo => !existingCombos.some(ec =>
      JSON.stringify(ec.options) === JSON.stringify(combo)
    ))
    .map(combo => ({
      group: groupName,
      options: combo,
      price: 0 // new combos start with price 0, admin will set
    }));

  // Insert new combos only
  if (toInsert.length > 0) {
    console.log(`📦 [${groupName}] Inserting ${toInsert.length} new combinations in batches...`);
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      console.log(`   🔄 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toInsert.length / batchSize)}...`);
      await Combination.insertMany(batch);
    }
    console.log(`✅ [${groupName}] Insertion complete.`);
  } else {
    console.log(`📭 [${groupName}] No new combinations to insert.`);
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
