const axios = require('axios');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

function generateCombinations(optionSets) {
  return optionSets.reduce((acc, set) =>
    acc.flatMap(combo => set.map(option => [...combo, option])), [[]]
  );
}

(async () => {
  const url = 'https://minimoqpack.com/admin-pricing';

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LocalFormScraper/1.0)'
      }
    });

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const widgets = Array.from(doc.querySelectorAll('[data-widget_type="shortcode.default"]'));

    if (!widgets.length) {
      console.log('❌ No shortcode.default widgets found.');
      return;
    }

    widgets.forEach((widget, index) => {
      // Find heading above this widget
      let headingText = `Form #${index + 1}`;
      let prev = widget.previousElementSibling;
      while (prev) {
        const h2 = prev.querySelector('h2.elementor-heading-title');
        if (h2) {
          headingText = h2.textContent.trim();
          break;
        }
        prev = prev.previousElementSibling;
      }

      const form = widget.querySelector('form.forminator-custom-form');
      if (!form) {
        console.log(`⚠️ No form found under ${headingText}`);
        return;
      }

      const labels = Array.from(form.querySelectorAll('.forminator-label'));
      const selects = Array.from(form.querySelectorAll('select')).filter(select =>
        select.closest('form') === form &&
        select.options.length > 0 &&
        select.getAttribute('aria-hidden') !== 'true'
      );

      const fields = [];
      labels.forEach((label, i) => {
        const select = selects[i];
        if (!select) return;

        const labelText = label.textContent.trim();
        const options = Array.from(select.options).map(opt => opt.textContent.trim()).filter(Boolean);
        if (options.length > 0) {
          fields.push({ product: headingText, label: labelText, options });
        }
      });

      if (!fields.length) {
        console.log(`⚠️ No valid fields in ${headingText}`);
        return;
      }

      // Output field info
      console.log(`\n🔹 ${headingText} — ${fields.length} fields`);
      fields.forEach(f => {
        console.log(`- ${f.label}: [${f.options.join(', ')}]`);
      });

      // Generate and show combinations
      const optionSets = fields.map(f => f.options);
      const combos = generateCombinations(optionSets);
      console.log(`\n🔁 Generated ${combos.length} combinations:`);
      combos.slice(0, 5).forEach(c => console.log('•', c.join(' | ')));
      if (combos.length > 5) console.log(`...and ${combos.length - 5} more.`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
