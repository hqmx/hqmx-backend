// 보안 관련 유틸리티 함수들

/**
 * 파일 확장자 검증 (보안)
 * @param {string} filename - 파일명
 * @param {string[]} allowedExtensions - 허용된 확장자 목록
 * @returns {boolean}
 */
export function isFileExtensionAllowed(filename, allowedExtensions) {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension && allowedExtensions.includes(extension);
}

/**
 * 악성 파일 패턴 검사
 * @param {string} filename - 파일명
 * @returns {boolean} true if suspicious
 */
export function isSuspiciousFile(filename) {
  const suspiciousPatterns = [
    /\.exe$/i,      // 실행 파일
    /\.bat$/i,      // 배치 파일
    /\.cmd$/i,      // 명령 파일
    /\.scr$/i,      // 스크린세이버
    /\.com$/i,      // COM 파일
    /\.pif$/i,      // PIF 파일
    /\.vbs$/i,      // VBScript
    /\.js$/i,       // JavaScript (웹이 아닌 경우)
    /\.jar$/i,      // Java Archive
    /\.msi$/i,      // Windows Installer
    /\.dll$/i,      // Dynamic Link Library
    /\.php$/i,      // PHP 스크립트
    /\.asp$/i,      // ASP 스크립트
    /\.jsp$/i,      // JSP 스크립트
    /\.sh$/i,       // Shell Script
    /\.\./,         // 경로 순회 시도
    /[<>:"|?*]/     // 금지된 문자들
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(filename));
}

/**
 * MIME 타입 검증
 * @param {string} mimeType - MIME 타입
 * @param {string[]} allowedMimeTypes - 허용된 MIME 타입 목록
 * @returns {boolean}
 */
export function isMimeTypeAllowed(mimeType, allowedMimeTypes) {
  if (!mimeType) return false;
  
  // 정확한 매치
  if (allowedMimeTypes.includes(mimeType)) {
    return true;
  }
  
  // 와일드카드 매치 (예: image/*)
  const baseType = mimeType.split('/')[0];
  return allowedMimeTypes.includes(`${baseType}/*`);
}

/**
 * 파일 크기 검증
 * @param {number} fileSize - 파일 크기 (바이트)
 * @param {number} maxSize - 최대 허용 크기 (바이트)
 * @returns {boolean}
 */
export function isFileSizeValid(fileSize, maxSize) {
  return fileSize > 0 && fileSize <= maxSize;
}

/**
 * 요청 비율 제한 (간단한 구현)
 * @param {string} clientId - 클라이언트 식별자 (IP 주소 등)
 * @param {number} maxRequests - 최대 요청 수
 * @param {number} windowMs - 시간 윈도우 (밀리초)
 * @param {Map} rateLimitStore - 저장소
 * @returns {boolean} true if rate limit exceeded
 */
export function isRateLimitExceeded(clientId, maxRequests, windowMs, rateLimitStore) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // 현재 클라이언트의 요청 기록 가져오기
  let requests = rateLimitStore.get(clientId) || [];
  
  // 윈도우 밖의 요청들 제거
  requests = requests.filter(timestamp => timestamp > windowStart);
  
  // 현재 요청 추가
  requests.push(now);
  
  // 저장소 업데이트
  rateLimitStore.set(clientId, requests);
  
  // 제한 초과 여부 확인
  return requests.length > maxRequests;
}

/**
 * 클라이언트 IP 주소 추출
 * @param {Request} request - HTTP 요청
 * @returns {string}
 */
export function getClientIP(request) {
  // Cloudflare Workers에서는 CF-Connecting-IP 헤더 사용
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) return cfIP;
  
  // 다른 프록시 헤더들
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  const xRealIP = request.headers.get('X-Real-IP');
  if (xRealIP) return xRealIP;
  
  return 'unknown';
}

/**
 * 태스크 ID 검증
 * @param {string} taskId - 태스크 ID
 * @returns {boolean}
 */
export function isValidTaskId(taskId) {
  if (!taskId || typeof taskId !== 'string') {
    return false;
  }
  
  // 태스크 ID 형식: task_[timestamp]_[random]
  const taskIdPattern = /^task_[a-z0-9]+_[a-z0-9]+$/i;
  return taskIdPattern.test(taskId) && taskId.length <= 50;
}

/**
 * 헤더 보안 설정
 * @param {Response} response - HTTP 응답
 * @returns {Response}
 */
export function addSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  
  // XSS 보호
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  
  // CSP (Content Security Policy)
  headers.set('Content-Security-Policy', "default-src 'none'");
  
  // HSTS (HTTPS만 사용하도록 강제)
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // 추천 정보 누설 방지
  headers.set('Referrer-Policy', 'no-referrer');
  
  // 권한 정책
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

/**
 * 허용된 파일 형식 목록
 */
export const ALLOWED_FILE_EXTENSIONS = [
  // 이미지
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico',
  // 비디오
  'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', '3gp', 'm4v',
  // 오디오
  'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'aiff',
  // 문서
  'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'rtf',
  // 아카이브
  'zip', 'rar', '7z', 'tar', 'gz'
];

/**
 * 허용된 MIME 타입 목록
 */
export const ALLOWED_MIME_TYPES = [
  'image/*', 'video/*', 'audio/*',
  'application/pdf', 'application/msword', 'application/zip',
  'text/plain', 'application/vnd.openxmlformats-officedocument.*'
];