// routes/feedback.js

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// 피드백 제출 엔드포인트
router.post('/submitFeedback', async (req, res) => {
  const { place_id, rating, review } = req.body;

  if (!place_id || !rating || !review) {
    return res.status(400).json({ error: 'place_id, rating, and review are required.' });
  }

  const feedback = {
    rating: parseInt(rating),
    review: review,
    timestamp: new Date().toISOString(),
  };

  try {
    const newFeedbackRef = db.ref(`feedback/${place_id}`).push();
    await newFeedbackRef.set(feedback);
    return res.status(200).json({ message: 'Feedback submitted successfully.' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 피드백 조회 엔드포인트
router.get('/getFeedback/:place_id', async (req, res) => {
  const { place_id } = req.params;

  try {
    const feedbackSnapshot = await db.ref(`feedback/${place_id}`).once('value');
    const feedbackData = feedbackSnapshot.val();

    if (feedbackData) {
      // 피드백 배열로 변환
      const feedbackArray = Object.values(feedbackData);
      // 평균 평점 계산
      const averageRating = feedbackArray.reduce((acc, curr) => acc + curr.rating, 0) / feedbackArray.length;

      return res.json({
        averageRating: averageRating.toFixed(2),
        reviews: feedbackArray.map(fb => ({ review: fb.review, rating: fb.rating, timestamp: fb.timestamp })),
      });
    } else {
      return res.json({ averageRating: '0', reviews: [] });
    }
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
