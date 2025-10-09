/**
 * Rate Limiting Middleware - IP 0 ”­ \
 *
 * express-rate-limit ¬©Xì API ¨© )À
 */

import rateLimit from 'express-rate-limit';

// X½ À ” 0ø
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000'); // 1Ü
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10');

/**
 * ÀX API© Rate Limiter
 * IPù 1ÜÐ 10Œ \
 */
export const convertLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  message: {
    error: 'Too many conversion requests',
    message: `You can only make ${MAX_REQUESTS} conversion requests per hour. Please try again later.`,
    retryAfter: Math.round(WINDOW_MS / 1000 / 60) + ' minutes'
  },
  standardHeaders: true, // `RateLimit-*` äT X
  legacyHeaders: false, // `X-RateLimit-*` äT D\1T
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Maximum ${MAX_REQUESTS} requests per hour.`,
      retryAfter: res.getHeader('RateLimit-Reset')
    });
  },
  // IP ”œ (]Ü ¤Ð ˆD ½°)
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress;
  }
});

/**
 * | API© Rate Limiter (\ Ä©)
 * IPù 1ÜÐ 100Œ
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
  skip: (req) => {
    // Health check” rate limit x
    return req.path === '/health' || req.path === '/api/health';
  }
});

export default convertLimiter;
