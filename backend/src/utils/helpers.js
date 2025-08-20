// 공통 유틸리티 함수들

/**
 * 고유한 작업 ID 생성
 * @returns {string}
 */
export function generateTaskId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `task_${timestamp}_${random}`;
}

/**
 * 파일 크기를 읽기 쉬운 형태로 변환
 * @param {number} bytes - 바이트 크기
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * MIME 타입에서 파일 확장자 추출
 * @param {string} mimeType - MIME 타입
 * @returns {string}
 */
export function getExtensionFromMimeType(mimeType) {
  const mimeToExt = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/flac': 'flac',
    'audio/aac': 'aac',
    'application/pdf': 'pdf',
    'application/zip': 'zip',
    'application/x-7z-compressed': '7z',
    'text/plain': 'txt'
  };
  
  return mimeToExt[mimeType] || '';
}

/**
 * 파일명에서 확장자 제거
 * @param {string} filename - 파일명
 * @returns {string}
 */
export function getNameWithoutExtension(filename) {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
}

/**
 * 안전한 파일명 생성 (특수문자 제거)
 * @param {string} filename - 원본 파일명
 * @returns {string}
 */
export function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')  // 윈도우에서 금지된 문자들
    .replace(/[\x00-\x1f\x80-\x9f]/g, '_')  // 제어 문자들
    .replace(/^\.+/, '_')  // 점으로 시작하는 파일명
    .replace(/\.+$/, '_')  // 점으로 끝나는 파일명
    .trim();
}

/**
 * 출력 파일명 생성
 * @param {string} originalName - 원본 파일명
 * @param {string} outputFormat - 출력 형식
 * @returns {string}
 */
export function generateOutputFilename(originalName, outputFormat) {
  const nameWithoutExt = getNameWithoutExtension(originalName);
  const safeName = sanitizeFilename(nameWithoutExt);
  return `${safeName}.${outputFormat}`;
}

/**
 * 오류 응답 생성
 * @param {string} message - 오류 메시지
 * @param {number} status - HTTP 상태 코드
 * @param {Object} details - 추가 세부사항
 * @returns {Object}
 */
export function createErrorResponse(message, status = 500, details = {}) {
  return {
    error: message,
    status: status,
    timestamp: new Date().toISOString(),
    ...details
  };
}

/**
 * 성공 응답 생성
 * @param {Object} data - 응답 데이터
 * @param {string} message - 성공 메시지
 * @returns {Object}
 */
export function createSuccessResponse(data, message = 'Success') {
  return {
    success: true,
    message: message,
    timestamp: new Date().toISOString(),
    data: data
  };
}

/**
 * 시간 차이 계산 (밀리초)
 * @param {Date} startTime - 시작 시간
 * @param {Date} endTime - 종료 시간 (기본값: 현재 시간)
 * @returns {number}
 */
export function getTimeDiff(startTime, endTime = new Date()) {
  return endTime.getTime() - startTime.getTime();
}

/**
 * 진행률 계산
 * @param {number} current - 현재 값
 * @param {number} total - 전체 값
 * @returns {number} 0-100 사이의 퍼센트 값
 */
export function calculateProgress(current, total) {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
}

/**
 * 딜레이 함수
 * @param {number} ms - 대기 시간 (밀리초)
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 재시도 로직
 * @param {Function} fn - 실행할 함수
 * @param {number} maxRetries - 최대 재시도 횟수
 * @param {number} delayMs - 재시도 간격 (밀리초)
 * @returns {Promise<any>}
 */
export async function retry(fn, maxRetries = 3, delayMs = 1000) {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        await delay(delayMs * (i + 1)); // 지수 백오프
      }
    }
  }
  
  throw lastError;
}