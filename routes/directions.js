// routes/directions.js

const express = require('express');
const router = express.Router();
const axios = require('axios');

// 경로 계산 엔드포인트
router.post('/directions', async (req, res) => {
  const { origin, destination, travelMode } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({ error: 'Origin and destination are required.' });
  }

  const mode = travelMode || 'DRIVING'; // 기본 이동 수단: 자동차

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: origin,
        destination: destination,
        mode: mode,
        key: AIzaSyD0ae49JnpLox9poq3ernO3_D_xSxrsHrY,
      },
    });

    if (response.data.status === 'OK') {
      return res.json(response.data);
    } else {
      return res.status(400).json({ error: response.data.status, message: response.data.error_message });
    }
  } catch (error) {
    console.error('Error fetching directions:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

