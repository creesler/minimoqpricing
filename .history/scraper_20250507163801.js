const puppeteer = require('puppeteer');

async function scrapeGroups(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Helper to extract fields
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

  // Function to select an option by value
  async function selectDropdown(selector, value) {
    await page.select(selector, value);
    await page.waitForTimeout(1000); // wait for conditional group to render
  }

  const selector = 'select[name="color_mode"]'; // adjust this to match your dropdown name

  // --- Scrape for "Full Color"
  await selectDropdown(selector, 'full-color'); // adjust to actual option value
  const fullColorFields = await getFields();

  // --- Scrape for "Black"
  await selectDropdown(selector, 'black'); // adjust to actual option value
  const blackFields = await getFields();

  await browser.close();

  console.log('\n🎯 Full Color Fields:');
  console.dir(fullColorFields, { depth: null });

  console.log('\n🎯 Black Fields:');
  console.dir(blackFields, { depth: null });

  return {
    fullColor: fullColorFields,
    black: blackFields
  };
}

module.exports = scrapeGroups;
