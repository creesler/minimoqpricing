const puppeteer = require('puppeteer');
const FormFullColor = require('./models/FormFullColor');
const FormBlack = require('./models/FormBlack');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeGroups(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await delay(2000); // wait for JavaScript to render the form

  // Helper to click and select from the Print Color dropdown
  async function selectPrintColor(value) {
    await page.click('[aria-label="Print Color"]'); // opens dropdown
    await page.waitForSelector(`.forminator-option[data-value="${value}"]`, { visible: true });
    await page.click(`.forminator-option[data-value="${value}"]`);
    await delay(1500); // wait for conditional fields to load
  }

  // Helper to get visible fields only
  async function getFields() {
    return await page.evaluate(() => {
      const fields = [];
      document.querySelectorAll('form input, form select, form textarea').forEach(el => {
        const tag = el.tagName.toLowerCase();
        const name = el.getAttribute('name');
        if (!name || el.offsetParent === null) return; // skip hidden or unnamed

        const field = { name, type: tag };

        if (tag === 'select') {
          field.options = Array.from(el.options).map(o => o.text.trim());
        }

        fields.push(field);
      });
      return fields;
    });
  }

  // ➤ FULL COLOR
  await selectPrintColor('Full Color');
  const fullColorFields = await getFields();
  await FormFullColor.deleteMany({});
  await FormFullColor.insertMany(fullColorFields);
  console.log('✅ Full Color group saved.');

  // ➤ BLACK
  await selectPrintColor('Black');
  const blackFields = await getFields();
  await FormBlack.deleteMany({});
  await FormBlack.insertMany(blackFields);
  console.log('✅ Black group saved.');

  await browser.close();
}

module.exports = scrapeGroups;
