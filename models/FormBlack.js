const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
  name: String,
  type: String,
  options: [String]
});

module.exports = mongoose.model('FormBlack', FieldSchema, 'form_black');
