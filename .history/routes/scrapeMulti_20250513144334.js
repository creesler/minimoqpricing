const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// ✅ Define schema once
const formCardstockSchema = new mongoose.Schema({
  name: String,
  value: String,
  // Add other fields as needed
}, { timestamps: true });

// ✅ Safe model definition
const FormCardstock = mongoose.models.form_cardstock || mongoose.model('form_cardstock', formCardstockSchema);

// 📦 Multi-scraper endpoint
router.post('/api/scrape-multi', async (req, res) => {
  try {
    const formDataArray = req.body.forms; // assume forms is an array of parsed fields

    if (!Array.isArray(formDataArray)) {
      return res.status(400).json({ error: 'Invalid form data' });
    }

    const results = await Promise.all(
      formDataArray.map(async (formData) => {
        const entry = new FormCardstock(formData);
        return await entry.save();
      })
    );

    res.json({ message: 'Forms saved successfully', data: results });
  } catch (error) {
    console.error('Scrape-multi failed:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

module.exports = router;
