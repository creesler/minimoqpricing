// scripts/tagMailer.js

require('dotenv').config();
const mongoose = require('mongoose');
const Combination = require('../models/Combination'); // adjust path if needed

async function tagMailerCombinations() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const result = await Combination.updateMany(
      { product: { $exists: false } },
      { $set: { product: "mailer" } }
    );

    console.log(`✅ Updated ${result.modifiedCount} combinations with product: "mailer".`);
  } catch (err) {
    console.error('❌ Update failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

tagMailerCombinations();
