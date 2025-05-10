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
  await delay(2000); // Wait for the form to render

  // 🔧 FUTURE-PROOF: Find dropdown by label text and select option
  async function selectPrintColor(optionText) {
    // Find the label and navigate to the .select2-selection span
    const dropdownHandle = await page.evaluateHandle((labelText) => {
      const labels = Array.from(document.querySelectorAll('label'));
      const label = labels.find(l => l.textContent.trim() === 'Print Color');
      if (!label) return null;

      const wrapper = label.closest('.forminator-field');
      if (!wrapper) return null;

      return wrapper.querySelector('.select2-selection');
    }, optionText);

    if (!dropdownHandle) {
      throw new Error(`❌ Could not find the dropdown for 'Print Color'`);
    }

    // Open the dropdown
    await dropdownHandle.click();
    await delay(500);

    // Wait for dropdown options
    await page.waitForSelector('.select2-results__option', { visible: true });

    // Click the correct option
    await page.evaluate((text) => {
      const options = Array.from(document.querySelectorAll('.select2-results__option'));
      const match = options.find(o => o.textContent.trim() === text);
      if (match) match.click();
    }, optionText);

    await delay(1500); // Wait for conditional fields to appear
  }

  // 🧠 Extract visible fields only
  async function getFields() {
    return await page.evaluate(() => {
      const fields = [];
      document.querySelectorAll('form input, form select, form textarea').forEach(el => {
        const tag = el.tagName.toLowerCase();
        const name = el.getAttribute('name');
        if (!name || el.offsetParent === null) return;

        const field = { name, type: tag };
        if (tag === 'select') {
          field.options = Array.from(el.options).map(o => o.text.trim());
        }

        fields.push(field);
      });
      return fields;
    });
  }

  // 🔄 SCRAPE "Full Color"
  await selectPrintColor('Full Color');
  const fullColorFields = await getFields();
  await FormFullColor.deleteMany({});
  await FormFullColor.insertMany(fullColorFields);
  console.log('✅ Full Color group saved.');

  // 🔄 SCRAPE "Black"
  await selectPrintColor('Black');
  const blackFields = await getFields();
  await FormBlack.deleteMany({});
  await FormBlack.insertMany(blackFields);
  console.log('✅ Black group saved.');

  await browser.close();
}

module.exports = scrapeGroups;
