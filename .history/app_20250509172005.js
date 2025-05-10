require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const scrapeGroups = require('./scraper');
const combinationRoutes = require('./routes/combinations');
const cors = require('cors'); // ✅ added

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // ✅ added
app.use(express.json());
