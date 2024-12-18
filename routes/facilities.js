// routes/facilities.js

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const admin = require('firebase-admin');
require('dotenv').config();

const db = admin.database();

// 주변 시설 검색 엔드포인트
router.get('/nearby', async (req, res) => {
  const { lat, lng, radius, type, opennow, minrating } = req.query;

  console.log(`Received /routes/facilities/nearby request with lat=${lat}, lng=${lng}, radius=${radius}, type=${type}, opennow=${opennow}, minrating=${minrating}`);

  if (!lat || !lng || !radius || !type) {
    console.warn('Missing required query parameters');
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    let apiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}&language=ko`;

    if (opennow === 'true') {
      apiUrl += `&opennow`;
    }

    console.log('Requesting Google API:', apiUrl);
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google API Error:', data);
      return res.status(500).json({ error: `Google API Error: ${data.status}` });
    }

    // 추가적인 필터링 (예: 평점)
    if (minrating && parseFloat(minrating) > 0) {
      data.results = data.results.filter(place => place.rating && place.rating >= parseFloat(minrating));
    }

    // 시설을 publicFacilities에 추가
    const facilitiesPromises = data.results.map(place => {
      const facilityData = {
        name: place.name,
        place_id: place.place_id,
        types: place.types,
        geometry: place.geometry.location,
      };

      return db.ref(`publicFacilities/${place.place_id}`).set(facilityData);
    });

    await Promise.all(facilitiesPromises);
    console.log('Facilities added to publicFacilities.');

    res.json(data);
  } catch (error) {
    console.error('Error fetching facilities from Google API:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 시설 상세 정보 제공 엔드포인트
router.get('/details', async (req, res) => {
  const { placeId } = req.query;

  if (!placeId) {
    console.warn('Missing placeId query parameter');
    return res.status(400).json({ error: 'Missing placeId query parameter' });
  }

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,formatted_phone_number,formatted_address,opening_hours,website,photos,types,geometry&key=${apiKey}&language=ko`;
    console.log('Requesting Google Place Details API:', detailsUrl);

    const response = await fetch(detailsUrl);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Place Details API Error:', data);
      return res.status(500).json({ error: `Google Place Details API Error: ${data.status}` });
    }

    res.json(data.result);
  } catch (error) {
    console.error('Error fetching place details from Google API:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 사진 URL 생성 엔드포인트
router.get('/photo', async (req, res) => {
  const { photoReference } = req.query;

  if (!photoReference) {
    return res.status(400).json({ error: 'photoReference query parameter is required' });
  }

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${apiKey}`;
    res.json({ url: photoUrl });
  } catch (error) {
    console.error('Error generating photo URL:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 혼잡도 평균 데이터 제공 엔드포인트
router.get('/facilities/congestion/average', async (req, res) => {
  const { placeId } = req.query;

  if (!placeId) {
    return res.status(400).json({ error: 'placeId query parameter is required' });
  }

  try {
    const facilityMetricsSnapshot = await db.ref(`facilityMetrics/${placeId}`).once('value');
    const metrics = facilityMetricsSnapshot.val();

    if (!metrics) {
      console.warn(`No congestion data found for placeId: ${placeId}`);
      return res.json({ averageCongestion: "데이터 없음" }); // 기본 값 반환
    }

    // 혼잡도 평균 계산
    const averageCongestion = Object.values(metrics).reduce(
      (acc, metric) => acc + metric.usageRate, 0
    ) / Object.keys(metrics).length;

    res.json({ averageCongestion: averageCongestion.toFixed(2) });
  } catch (error) {
    console.error('Error fetching average congestion:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
