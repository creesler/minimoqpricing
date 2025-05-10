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
  await delay(1000);

  // Scrape all form fields regardless of visibility
  const { fullColorFields, blackFields } = await page.evaluate(() => {
    const allFields = Array.from(document.querySelectorAll('form .forminator-field-select'));
    const extract = (container) => {
      const select = container.querySelector('select');
      const name = select?.name || null;
      const tag = select?.tagName.toLowerCase() || null;
      const options = select
        ? Array.from(select.options).map(o => o.text.trim())
        : [];
      return name && tag ? { name, type: tag, options } : null;
    };

    const fullColor = [];
    const black = [];

    allFields.forEach(container => {
      const labelText = container.querySelector('label')?.innerText || '';
      const field = extract(container);
      if (!field) return;

      if (labelText.includes('Full Color')) {
        fullColor.push(field);
      } else if (labelText.includes('Black')) {
        black.push(field);
      }
    });

    return { fullColorFields: fullColor, blackFields: black };
  });

  console.log('📦 Full Color Fields:', fullColorFields);
  console.log('📦 Black Fields:', blackFields);

  await FormFullColor.deleteMany({});
  await FormFullColor.insertMany(fullColorFields);
  console.log('✅ Full Color group saved.');

  await FormBlack.deleteMany({});
  await FormBlack.insertMany(blackFields);
  console.log('✅ Black group saved.');

  await browser.close();
  console.log('🚪 Browser closed.\n');
}

module.exports = scrapeGroups;
