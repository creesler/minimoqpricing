const puppeteer = require('puppeteer');
const FormStructure = require('./models/FormStructure');

async function scrapeAndSyncForm(url) {
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

  // Check existing data
  const existing = await FormStructure.findOne({ url });

  if (!existing) {
    await FormStructure.create({ url, fields });
    console.log('First-time scrape saved.');
    return;
  }

  // Compare and update (basic logic)
  const hasChanged = JSON.stringify(existing.fields) !== JSON.stringify(fields);
  if (hasChanged) {
    existing.fields = fields;
    existing.scrapedAt = new Date();
    await existing.save();
    console.log('Form structure updated.');
  } else {
    console.log('No changes detected.');
  }
}

module.exports = scrapeAndSyncForm;
