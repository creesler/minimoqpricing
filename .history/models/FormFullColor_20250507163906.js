const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
  name: String,
  type: String,
  options: [String]
});

module.exports = mongoose.model('FormFullColor', FieldSchema, 'form_fullcolor');
