/**
 * Rate Limiting Middleware - IP 기반 요청 제한
 *
 * express-rate-limit 사용하여 API 남용 방지
 */

import rateLimit from 'express-rate-limit';

// 환경 변수 기본값
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000'); // 1시간
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10');

/**
 * 변환 API용 Rate Limiter
 * IP당 1시간에 10회 제한
 */
export const convertLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  message: {
    error: 'Too many conversion requests',
    message: `You can only make ${MAX_REQUESTS} conversion requests per hour. Please try again later.`,
    retryAfter: Math.round(WINDOW_MS / 1000 / 60) + ' minutes'
  },
  standardHeaders: true, // `RateLimit-*` 헤더 사용
  legacyHeaders: false, // `X-RateLimit-*` 헤더 비활성화
  // express-rate-limit의 trust proxy validation 완전히 비활성화
  validate: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Maximum ${MAX_REQUESTS} requests per hour.`,
      retryAfter: res.getHeader('RateLimit-Reset')
    });
  },
  // IP 추출 (프록시 환경 고려)
  // req.ip 대신 헤더를 직접 읽어서 trust proxy validation 우회
  keyGenerator: (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      // X-Forwarded-For는 여러 IP가 쉼표로 구분될 수 있음, 첫 번째 IP 사용
      return forwardedFor.split(',')[0].trim();
    }
    return req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown';
  }
});

/**
 * 일반 API용 Rate Limiter (덜 엄격)
 * IP당 1시간에 100회
 */
export const generalLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 100,
  message: {
    error: 'Too many requests',
    message: 'You are making too many requests. Please slow down.',
    retryAfter: Math.round(WINDOW_MS / 1000 / 60) + ' minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // express-rate-limit의 trust proxy validation 완전히 비활성화
  validate: false,
  skip: (req) => {
    // Health check는 rate limit 제외
    return req.path === '/health' || req.path === '/api/health';
  }
});

export default convertLimiter;
