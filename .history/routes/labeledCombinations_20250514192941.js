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

// ✅ PUT /api/labeled-combinations/:id (update one combination's price)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { price } = req.body;

    // Find the document that contains the combination with the given ID
    const entry = await LabeledCombination.findOne({ 'combinations._id': id });
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Combination not found' });
    }

    const combo = entry.combinations.id(id);
    if (!combo) {
      return res.status(404).json({ success: false, error: 'Combination not found inside document' });
    }

    combo.price = price;
    await entry.save();

    res.json({ success: true, _id: combo._id, price });
  } catch (err) {
    console.error('❌ PUT save error:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
