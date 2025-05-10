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
  await delay(2000); // Wait for full form to render

  // 🧠 Function to click the Select2 dropdown and choose an option
  async function selectPrintColor(label) {
    // Click the visible dropdown to open options
    await page.click('#select2-forminator-form-563__field--select-3_681b05d2794ab-container');
    await delay(500);

    // Wait for dropdown options to be visible
    await page.waitForSelector('.select2-results__option', { visible: true });

    // Click the desired label from the dropdown
    await page.evaluate((label) => {
      const options = Array.from(document.querySelectorAll('.select2-results__option'));
      const match = options.find(el => el.textContent.trim() === label);
      if (match) match.click();
    }, label);

    await delay(1500); // Wait for conditional fields to update
  }

  // 🧠 Function to extract currently visible fields
  async function getFields() {
    return await page.evaluate(() => {
      const fields = [];
      document.querySelectorAll('form input, form select, form textarea').forEach(el => {
        const tag = el.tagName.toLowerCase();
        const name = el.getAttribute('name');
        if (!name || el.offsetParent === null) return; // skip hidden/unnamed

        const field = { name, type: tag };

        if (tag === 'select') {
          field.options = Array.from(el.options).map(o => o.text.trim());
        }

        fields.push(field);
      });
      return fields;
    });
  }

  // 🔄 SCRAPE FULL COLOR GROUP
  await selectPrintColor('Full Color');
  const fullColorFields = await getFields();
  await FormFullColor.deleteMany({});
  await FormFullColor.insertMany(fullColorFields);
  console.log('✅ Full Color group saved.');

  // 🔄 SCRAPE BLACK GROUP
  await selectPrintColor('Black');
  const blackFields = await getFields();
  await FormBlack.deleteMany({});
  await FormBlack.insertMany(blackFields);
  console.log('✅ Black group saved.');

  await browser.close();
}

module.exports = scrapeGroups;
