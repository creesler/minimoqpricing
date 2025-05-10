const express = require('express');
const router = express.Router();
const Combination = require('../models/Combination');

router.get('/', async (req, res) => {
  try {
    const combos = await Combination.find({});
    if (!combos.length) return res.json({ headers: [], rows: [] });

    // Infer headers from the longest combination
    const maxLength = Math.max(...combos.map(c => c.options.length));
    const headers = Array.from({ length: maxLength }, (_, i) => `Option ${i + 1}`);
    const rows = combos.map(c => c.options);

    res.json({ headers, rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
