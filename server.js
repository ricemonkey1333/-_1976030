// server.js

const express = require('express');
const fetch = require('node-fetch');
const helmet = require('helmet');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config(); // 환경 변수 로드

const app = express();
const PORT = process.env.PORT || 3000;

// Firebase Admin SDK 초기화
const serviceAccount = require('./serviceAccountKey.json'); // 서비스 계정 키 파일 경로

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL // 환경 변수 사용
});

// 미들웨어 설정
app.use(express.json()); // JSON 바디 파싱
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://maps.googleapis.com', 'https://maps.gstatic.com'],
        styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", "data:", "https://maps.gstatic.com", "https://maps.googleapis.com", "https://lh3.googleusercontent.com"],
        connectSrc: ["'self'", 'https://maps.googleapis.com'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);
app.use(cors()); // CORS 허용 (필요에 따라 설정)

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// 라우터 모듈 불러오기
const googleMapsRouter = require('./routes/googleMaps'); // Google Maps 라우터
const facilitiesRouter = require('./routes/facilities');
const directionsRouter = require('./routes/directions');
const dataRouter = require('./routes/data');
const feedbackRouter = require('./routes/feedback');
const metricsRouter = require('./routes/metrics');

// 라우터 마운트
app.use('/', googleMapsRouter); // /apiKey 엔드포인트를 루트에 마운트
app.use('/routes/facilities', facilitiesRouter);
app.use('/routes/directions', directionsRouter);
app.use('/routes/data', dataRouter);
app.use('/routes/feedback', feedbackRouter);
app.use('/routes/metrics', metricsRouter);

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
