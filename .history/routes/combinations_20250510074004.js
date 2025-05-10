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
    const ids = combos.map(c => c._id);

    res.json({ headers, rows, ids });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST update prices in bulk
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

// ✅ PUT /api/combinations/:id — update one price
router.put('/:id', async (req, res) => {
  try {
    const { price } = req.body;
    const updated = await Combination.findByIdAndUpdate(
      req.params.id,
      { price: parseFloat(price) },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Combination not found' });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
