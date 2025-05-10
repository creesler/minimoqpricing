const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const FormFullColor = require('./models/FormFullColor');
const FormBlack = require('./models/FormBlack');
const Combination = require('./models/Combination');

async function scrapeGroups(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

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

  // Save form structure only (safe)
  await FormFullColor.deleteMany({});
  await FormFullColor.insertMany(fullColorFields);

  await FormBlack.deleteMany({});
  await FormBlack.insertMany(blackFields);

  const savedFullColorFields = await FormFullColor.find({});
  const savedBlackFields = await FormBlack.find({});

  const fullColorOptions = extractOptions(savedFullColorFields);
  const blackOptions = extractOptions(savedBlackFields);

  const fullColorCombos = generateCombinations(fullColorOptions);
  const blackCombos = generateCombinations(blackOptions);

  const addedFull = await syncCombinations('Full Color', fullColorCombos);
  const addedBlack = await syncCombinations('Black', blackCombos);

  await browser.close();

  return {
    fullColorFields,
    blackFields,
    added: addedFull + addedBlack
  };
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

async function syncCombinations(groupName, newCombinations) {
  const existing = await Combination.find({ group: groupName });

  const toInsert = newCombinations
    .filter(combo =>
      !existing.some(e => JSON.stringify(e.options) === JSON.stringify(combo))
    )
    .map(combo => ({
      group: groupName,
      options: combo,
      price: 0
    }));

  if (toInsert.length) {
    await Combination.insertMany(toInsert);
  }

  return toInsert.length;
}

module.exports = scrapeGroups;
