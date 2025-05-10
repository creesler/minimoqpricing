const puppeteer = require('puppeteer');

async function scrapeForm(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Extract form fields
  const fields = await page.evaluate(() => {
    const elements = document.querySelectorAll('form input, form select, form textarea');
    const results = [];

    elements.forEach(el => {
      const tag = el.tagName.toLowerCase();
      const type = el.getAttribute('type') || tag;
      const name = el.getAttribute('name');
      const labelEl = el.closest('label') || el.previousElementSibling;
      const label = labelEl ? labelEl.innerText.trim() : '';

      let options = [];
      if (tag === 'select') {
        options = Array.from(el.options).map(o => o.text);
      }

      if (name) {
        results.push({ name, type, label, options });
      }
    });

    return results;
  });

  await browser.close();

  console.log('\n🎯 Scraped Fields:');
  console.dir(fields, { depth: null });

  return fields;
}

module.exports = scrapeForm;
