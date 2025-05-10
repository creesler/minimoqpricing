const express = require('express');
const router = express.Router();
const Combination = require('../models/Combination');

// GET combinations for frontend table
router.get('/', async (req, res) => {
  try {
    const combos = await Combination.find({});
    if (!combos.length) return res.json({ headers: [], rows: [] });

    const maxLength = Math.max(...combos.map(c => c.options.length));
    const headers = Array.from({ length: maxLength }, (_, i) => `Option ${i + 1}`);
    headers.push("Price");

    const rows = combos.map(c => [...c.options, c.price || 0]);

    res.json({ headers, rows, ids: combos.map(c => c._id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST update prices
router.post('/update', async (req, res) => {
  try {
    const updates = req.body.rows;

    for (const { _id, price } of updates) {
      await Combination.findByIdAndUpdate(_id, { price: parseFloat(price) });
    }

    res.json({ success: true, updated: updates.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
