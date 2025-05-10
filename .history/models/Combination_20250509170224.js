const mongoose = require('mongoose');

const combinationSchema = new mongoose.Schema({
  group: String,
  options: [String]
});

module.exports = mongoose.model('Combination', combinationSchema);
