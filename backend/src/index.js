import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { convertHandler } from './handlers/convert.js';
import { progressHandler } from './handlers/progress.js';
import { downloadHandler, listDownloadsHandler, getFileInfoHandler } from './handlers/download.js';
import { ProgressTracker } from './utils/progress-tracker.js';
import { getClientIP, isRateLimitExceeded, addSecurityHeaders } from './utils/security.js';

const app = new Hono();

// 전역 Rate Limit 저장소 (실제 환경에서는 Durable Object 사용 권장)
const rateLimitStore = new Map();

// 미들웨어 설정
app.use('*', logger());

// 보안 미들웨어
app.use('*', async (c, next) => {
  // Rate Limiting (변환 요청만)
  if (c.req.path.startsWith('/convert')) {
    const clientIP = getClientIP(c.req.raw);
    const maxRequests = 10; // 시간당 최대 10개 변환 요청
    const windowMs = 60 * 60 * 1000; // 1시간
    
    if (isRateLimitExceeded(clientIP, maxRequests, windowMs, rateLimitStore)) {
      return c.json({ 
        error: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        retryAfter: '1시간 후'
      }, 429);
    }
  }
  
  await next();
  
  // 응답에 보안 헤더 추가
  if (c.res) {
    c.res = addSecurityHeaders(c.res);
  }
});
app.use('*', cors({
  origin: (origin, c) => {
    const allowedOrigins = (c.env.ALLOWED_ORIGINS || '*').split(',');
    
    // 개발 환경에서는 모든 origin 허용
    if (allowedOrigins.includes('*')) {
      return origin;
    }
    
    // 지정된 origin만 허용
    if (allowedOrigins.includes(origin)) {
      return origin;
    }
    
    // localhost는 개발용으로 허용
    if (origin && (origin.startsWith('http://localhost') || origin.startsWith('https://localhost'))) {
      return origin;
    }
    
    return false;
  },
  allowMethods: ['GET', 'POST', 'OPTIONS', 'HEAD'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['Content-Disposition', 'Content-Length'],
  credentials: false,
  maxAge: 86400 // 24시간 preflight 캐시
}));

// API 라우트
app.post('/convert', convertHandler);
app.get('/progress/:taskId', progressHandler);
app.get('/download/:taskId', downloadHandler);
app.get('/downloads', listDownloadsHandler);
app.get('/info/:taskId', getFileInfoHandler);

// 헬스 체크
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 핸들러
app.notFound((c) => {
  return c.json({ error: 'Endpoint not found' }, 404);
});

// 에러 핸들러
app.onError((err, c) => {
  console.error('Application Error:', err);
  return c.json({ 
    error: 'Internal server error',
    message: err.message 
  }, 500);
});

// Durable Object 내보내기
export { ProgressTracker };

export default app;