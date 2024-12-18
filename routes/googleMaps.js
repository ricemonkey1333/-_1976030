// routes/googleMaps.js

const express = require('express');
const router = express.Router();
require('dotenv').config();

// GET /apiKey
router.get('/apiKey', (req, res) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Google Maps API 키가 설정되지 않았습니다.' });
  }
  res.json({ apiKey });
});

module.exports = router;
