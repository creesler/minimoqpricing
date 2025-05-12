const mongoose = require('mongoose');

const combinationSchema = new mongoose.Schema({
  group: String,
  options: [String],
  price: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Combination', combinationSchema);
