// models/LabeledCombination.js
const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
  label: String,
  options: [String],
});

const CombinationSchema = new mongoose.Schema({
  product: { type: String, required: true, unique: true },
  fields: [FieldSchema],
  combinations: [[String]], // Array of array of strings
}, {
  timestamps: true,
});

module.exports = mongoose.model('LabeledCombination', CombinationSchema);
