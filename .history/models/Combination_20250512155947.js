const mongoose = require('mongoose');

const combinationSchema = new mongoose.Schema({
  product: String, // ← NEW: e.g. "mailer", "cardstock"
  group: String,
  options: [String],
  price: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Combination', combinationSchema);
