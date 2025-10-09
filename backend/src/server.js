/**
 * HQMX Converter Backend - Express Server
 *
 * EC2 기반 파일 변환 API 서버
 * FFmpeg를 사용한 비디오/오디오 변환
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Middleware
import { convertLimiter, generalLimiter } from './middleware/rate-limit.js';

// Handlers
import convertHandler from './handlers/convert.js';
import progressHandler from './handlers/progress.js';
import downloadHandler from './handlers/download.js';

// Utils
import { startCleanupCron } from './utils/file-cleanup.js';
import { FFmpegConverter } from './converters/ffmpeg-converter.js';

// 환경 변수
const PORT = parseInt(process.env.PORT || '3001');
const NODE_ENV = process.env.NODE_ENV || 'development';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/converter/uploads';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/tmp/converter/outputs';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

// __dirname 대체 (ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express 앱 초기화
const app = express();

// 임시 디렉토리 생성
await fs.mkdir(UPLOAD_DIR, { recursive: true, mode: 0o700 });
await fs.mkdir(OUTPUT_DIR, { recursive: true, mode: 0o700 });
console.log(`[Setup] Created directories: ${UPLOAD_DIR}, ${OUTPUT_DIR}`);

// CORS 설정
app.use(cors({
  origin: (origin, callback) => {
    // origin이 없는 경우 (같은 origin) 허용
    if (!origin) return callback(null, true);

    // 개발 환경에서 모든 origin 허용
    if (NODE_ENV === 'development' && ALLOWED_ORIGINS.includes('*')) {
      return callback(null, true);
    }

    // 허용된 origin 체크
    if (ALLOWED_ORIGINS.includes(origin) || origin.includes('localhost')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', generalLimiter);

// Request 로깅 (개발 환경)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Health check (rate limit 제외)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'HQMX Converter API is running',
    environment: NODE_ENV
  });
});

// API 라우트
app.post('/api/convert', convertLimiter, convertHandler);
app.get('/api/progress/:jobId', progressHandler);
app.get('/api/download/:jobId', downloadHandler);

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.path} not found`
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('[Error]', err);

  // CORS 에러
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS error',
      message: 'Origin not allowed'
    });
  }

  // Multer 에러는 middleware/upload.js에서 처리됨

  // 일반 에러
  res.status(err.status || 500).json({
    error: err.name || 'Internal server error',
    message: err.message || 'An unexpected error occurred',
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 서버 시작
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  HQMX Converter API Server                                 ║
║  Environment: ${NODE_ENV.padEnd(45)}║
║  Port: ${PORT.toString().padEnd(51)}║
║  FFmpeg: Checking...                                       ║
╚════════════════════════════════════════════════════════════╝
  `);

  // FFmpeg 버전 확인
  FFmpegConverter.checkFFmpegVersion()
    .then(version => {
      console.log(`[Setup] ${version}`);
    })
    .catch(err => {
      console.error('[Setup] ⚠️  FFmpeg not found! Install FFmpeg: sudo apt install ffmpeg');
      console.error('[Setup]', err.message);
    });

  // 파일 정리 cron 시작
  startCleanupCron();

  console.log('[Server] ✅ Server is ready to accept requests');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

// 메모리 모니터링 (개발 환경)
if (NODE_ENV === 'development') {
  setInterval(() => {
    const usage = process.memoryUsage();
    console.log(`[Memory] Heap: ${Math.round(usage.heapUsed / 1024 / 1024)}MB / ${Math.round(usage.heapTotal / 1024 / 1024)}MB`);
  }, 60000); // 1분마다
}

export default app;
