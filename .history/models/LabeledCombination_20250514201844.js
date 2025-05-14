const mongoose = require('mongoose');

// Field schema: for each dropdown in the form
const FieldSchema = new mongoose.Schema({
  label: String,
  options: [String],
});

// Combination schema: each combination will get its own ObjectId automatically
const ComboSchema = new mongoose.Schema({
  options: [String],                    // Example: ["Size A", "White", "Glossy"]
  price: { type: Number, default: 0 }   // Editable price
}, { _id: true }); // ✅ Ensures each combo has an _id (Mongo creates it if missing)

// Main schema for the labeled form
const LabeledCombinationSchema = new mongoose.Schema({
  product: { type: String, required: true, unique: true },
  fields: [FieldSchema],
  combinations: [ComboSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('LabeledCombination', LabeledCombinationSchema);
