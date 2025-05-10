const mongoose = require('mongoose');

const combinationSchema = new mongoose.Schema({
  group: { type: String, required: true },
  options: [String],
  price: { type: Number, default: 0 } // ✅ NEW
});

module.exports = mongoose.model('Combination', combinationSchema);
