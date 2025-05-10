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
  await delay(2000);

  async function selectPrintColor(optionText) {
    console.log(`🔽 Selecting "${optionText}" from dropdown...`);
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

    await dropdownHandle.click();
    await delay(500);

    await page.waitForSelector('.select2-results__option', { visible: true });

    await page.evaluate((text) => {
      const options = Array.from(document.querySelectorAll('.select2-results__option'));
      const match = options.find(o => o.textContent.trim() === text);
      if (match) match.click();
    }, optionText);

    await delay(1500);
  }

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

  // 🔄 FULL COLOR
  console.log('\n🎯 Scraping Full Color group...');
  await selectPrintColor('Full Color');
  const fullColorFields = await getFields();
  console.log('📦 Captured Full Color Fields:', fullColorFields);

  await FormFullColor.deleteMany({});
  await FormFullColor.insertMany(fullColorFields);
  console.log('✅ Saved Full Color group to DB.');

  const fullColorFromDb = await FormFullColor.find({});
  console.log('🗃️ Full Color Data in MongoDB:', fullColorFromDb);

  // 🔄 BLACK
  console.log('\n🎯 Scraping Black group...');
  await selectPrintColor('Black');
  const blackFields = await getFields();
  console.log('📦 Captured Black Fields:', blackFields);

  await FormBlack.deleteMany({});
  await FormBlack.insertMany(blackFields);
  console.log('✅ Saved Black group to DB.');

  const blackFromDb = await FormBlack.find({});
  console.log('🗃️ Black Data in MongoDB:', blackFromDb);

  await browser.close();
  console.log('🚪 Browser closed.\n');
}

module.exports = scrapeGroups;
