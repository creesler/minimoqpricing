const puppeteer = require('puppeteer');
const FormFullColor = require('./models/FormFullColor');
const FormBlack = require('./models/FormBlack');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeGroups(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('🌐 Opening page...');
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await delay(1000); // minimal wait

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

      if (label.toLowerCase().includes('black')) {
        blackFields.push(field);
      } else if (label.toLowerCase().includes('full color') || label.toLowerCase().includes('print color')) {
        fullColorFields.push(field);
      }
    });

    return { fullColorFields, blackFields };
  });

  console.log('📦 Full Color Fields:', result.fullColorFields);
  console.log('📦 Black Fields:', result.blackFields);

  await FormFullColor.deleteMany({});
  await FormFullColor.insertMany(result.fullColorFields);
  console.log('✅ Full Color group saved.');

  await FormBlack.deleteMany({});
  await FormBlack.insertMany(result.blackFields);
  console.log('✅ Black group saved.');

  await browser.close();
  console.log('🚪 Browser closed.\n');
}

module.exports = scrapeGroups;
