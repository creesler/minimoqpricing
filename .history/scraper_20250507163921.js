const puppeteer = require('puppeteer');
const FormFullColor = require('./models/FormFullColor');
const FormBlack = require('./models/FormBlack');

async function scrapeGroups(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  async function getFields() {
    return await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('form input, form select, form textarea').forEach(el => {
        const tag = el.tagName.toLowerCase();
        const name = el.getAttribute('name');
        if (!name) return;

        const field = { name, type: tag };

        if (tag === 'select') {
          field.options = Array.from(el.options).map(o => o.text.trim());
        }

        results.push(field);
      });
      return results;
    });
  }

  async function selectDropdown(selector, value) {
    await page.select(selector, value);
    await page.waitForTimeout(1000); // wait for the group to load
  }

  const selector = 'select[name="color_mode"]'; // adjust this if needed

  // FULL COLOR
  await selectDropdown(selector, 'Full Color'); // must match exact <option> value
  const fullColorFields = await getFields();
  await FormFullColor.deleteMany({});
  await FormFullColor.insertMany(fullColorFields);
  console.log('✅ Full Color group updated.');

  // BLACK
  await selectDropdown(selector, 'Black');
  const blackFields = await getFields();
  await FormBlack.deleteMany({});
  await FormBlack.insertMany(blackFields);
  console.log('✅ Black group updated.');

  await browser.close();
}

module.exports = scrapeGroups;
