const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
  name: String,
  type: String,
  label: String,
  options: [String]
});

const FormStructureSchema = new mongoose.Schema({
  url: String,
  fields: [FieldSchema],
  scrapedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FormStructure', FormStructureSchema);
