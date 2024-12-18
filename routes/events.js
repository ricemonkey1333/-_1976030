// routes/events.js

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const db = admin.database(); // Firebase Realtime Database 참조

// 공공 이벤트 목록 조회 엔드포인트
router.get('/', async (req, res) => {
  try {
    const eventsSnapshot = await db.ref('events').once('value');
    const events = eventsSnapshot.val();
    res.json(events ? Object.values(events) : []);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 공공 이벤트 추가 엔드포인트 (필요 시)
router.post('/', async (req, res) => {
  const eventData = req.body;

  if (!eventData.title || !eventData.description || !eventData.date || !eventData.location) {
    return res.status(400).json({ error: 'Missing required event fields.' });
  }

  try {
    const newEventRef = db.ref('events').push();
    await newEventRef.set(eventData);
    res.status(201).json({ message: 'Event created successfully.', eventId: newEventRef.key });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
