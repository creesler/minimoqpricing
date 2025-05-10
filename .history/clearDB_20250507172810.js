require('dotenv').config();
const mongoose = require('mongoose');
const FormFullColor = require('./models/FormFullColor');
const FormBlack = require('./models/FormBlack');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  await FormFullColor.deleteMany({});
  await FormBlack.deleteMany({});

  console.log('🧹 Cleared form_fullcolor and form_black collections.');
  await mongoose.disconnect();
})();
