// routes/data.js

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Firebase Realtime Database 참조
const db = admin.database();

// IOT 데이터 수집 엔드포인트
router.post('/data', (req, res) => {
  const sensorData = req.body;

  if (!sensorData) {
    return res.status(400).json({ error: 'No data provided' });
  }

  // Firebase Realtime Database에 데이터 저장
  const newDataRef = db.ref('sensorData').push();
  newDataRef.set(sensorData)
    .then(() => res.status(201).json({ message: 'Data saved successfully' }))
    .catch(err => res.status(500).json({ error: 'Failed to save data', details: err }));
});

// IOT 데이터 조회 엔드포인트
router.get('/', async (req, res) => {
  try {
    const sensorDataSnapshot = await db.ref('sensorData').once('value');
    const sensorData = sensorDataSnapshot.val();

    // 데이터 정리 (예: 최근 100개만)
    const sensorDataArray = sensorData ? Object.values(sensorData) : [];
    const recentData = sensorDataArray.slice(-100); // 최근 100개

    res.json(recentData);
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
