const mongoose = require('mongoose');

const CombinationSchema = new mongoose.Schema({
  group: {
    type: String,
    required: true
  },
  options: {
    type: [String],
    required: true
  },
  price: {
    type: Number,
    default: null
  }
});

module.exports = mongoose.model('Combination', CombinationSchema);
