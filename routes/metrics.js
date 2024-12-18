// routes/metrics.js

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { body, validationResult } = require('express-validator');

// Firebase Realtime Database 참조
const db = admin.database();

// 영업 여부 데이터 기록 엔드포인트
router.post('/facilities/:facilityId/measure', async (req, res) => {
  const { facilityId } = req.params;
  const { isOpen, facilityName } = req.body;

  // 요청 데이터 유효성 검사
  if (typeof isOpen !== 'boolean') {
    return res.status(400).json({ error: 'isOpen must be a boolean value.' });
  }

  try {
    // 해당 시설 존재 여부 확인
    const facilitySnapshot = await db.ref(`publicFacilities/${facilityId}`).once('value');
    if (!facilitySnapshot.exists()) {
      return res.status(404).json({ error: 'Facility not found.' });
    }

    // 데이터베이스에 영업 여부 기록
    const timestamp = new Date().toISOString();
    const statusData = { facilityName, isOpen, timestamp };

    await db.ref(`facilityOpenStatus/${facilityId}`).push(statusData);

    res.status(201).json({ message: '영업 여부 기록 성공', data: statusData });
  } catch (error) {
    console.error('영업 여부 데이터 저장 오류:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// 특정 공공시설의 이용률 및 혼잡도 데이터 조회 엔드포인트
router.get('/facilities', async (req, res) => {
  try {
    // 모든 facilityMetrics 가져오기
    const metricsSnapshot = await db.ref('facilityMetrics').once('value');
    const metricsData = metricsSnapshot.val() || {};

    res.json(metricsData);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 영업 여부 데이터 보기 API
// 데이터 보기 API: 영업 여부 데이터를 반환
router.get('/facilities/view', async (req, res) => {
  try {
    const metricsSnapshot = await db.ref('facilityOpenStatus').once('value');
    const metricsData = metricsSnapshot.val() || {};

    const formattedData = [];

    for (const placeId in metricsData) {
      for (const entryId in metricsData[placeId]) {
        const entry = metricsData[placeId][entryId];
        formattedData.push({
          placeId,
          facilityName: entry.facilityName || "이름 없음",
          openStatus: entry.isOpen ? "영업 중" : "영업 종료",
          timestamp: entry.timestamp || "N/A",
        });
      }
    }

    res.json(formattedData);
  } catch (error) {
    console.error('Error formatting facilities data:', error);
    res.status(500).json({ error: 'Failed to fetch and format data' });
  }
});



router.post('/facilities/:facilityId/congestion', async (req, res) => {
  const { facilityId } = req.params;
  const { congestionLevel } = req.body;

  try {
    const timestamp = new Date().toISOString();
    const metricData = { congestionLevel, timestamp };

    await db.ref(`facilityMetrics/${facilityId}`).push(metricData);

    res.status(200).json({ message: '혼잡도 데이터 저장 성공', data: metricData });
  } catch (error) {
    console.error('혼잡도 데이터 저장 오류:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



module.exports = router;
