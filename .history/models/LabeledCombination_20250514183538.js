const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
  label: String,
  options: [String],
});

const ComboSchema = new mongoose.Schema({
  options: [String],          // array of selected options like ["Size A", "White", "Glossy"]
  price: { type: Number, default: 0 } // editable per combo
});

const LabeledCombinationSchema = new mongoose.Schema({
  product: { type: String, required: true, unique: true },
  fields: [FieldSchema],
  combinations: [ComboSchema]  // each combo has options[] + price
}, {
  timestamps: true
});

module.exports = mongoose.model('LabeledCombination', LabeledCombinationSchema);
