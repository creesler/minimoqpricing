// routes/labeledCombinations.js
const express = require('express');
const router = express.Router();
const LabeledCombination = require('../models/LabeledCombination');

// GET /api/labeled-combinations/:product
router.get('/:product', async (req, res) => {
  try {
    const product = req.params.product;
    const entry = await LabeledCombination.findOne({ product });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json(entry);
  } catch (err) {
    console.error('❌ Error fetching labeled combination:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
