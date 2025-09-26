// TypeScript 타입 정의 (JSDoc 형태로 작성)

/**
 * @typedef {Object} ConversionTask
 * @property {string} id - 작업 ID
 * @property {string} status - 작업 상태 ('pending' | 'processing' | 'completed' | 'error')
 * @property {number} progress - 진행률 (0-100)
 * @property {string} inputFormat - 입력 파일 형식
 * @property {string} outputFormat - 출력 파일 형식
 * @property {Object} settings - 변환 설정
 * @property {string} inputFileKey - R2의 입력 파일 키
 * @property {string} outputFileKey - R2의 출력 파일 키  
 * @property {Date} createdAt - 생성 시간
 * @property {Date} updatedAt - 업데이트 시간
 * @property {string} [error] - 에러 메시지
 */

/**
 * @typedef {Object} ConversionSettings
 * @property {string} [quality] - 품질 설정
 * @property {string} [resolution] - 해상도 설정
 * @property {number} [bitrate] - 비트레이트 설정
 * @property {string} [codec] - 코덱 설정
 * @property {number} [sampleRate] - 샘플레이트 설정
 * @property {string} [channels] - 채널 설정
 * @property {number} [dpi] - DPI 설정
 * @property {string} [resize] - 리사이즈 설정
 * @property {string} [pageRange] - 페이지 범위 설정
 */

/**
 * @typedef {Object} SupportedFormat
 * @property {string} extension - 파일 확장자
 * @property {string} mimeType - MIME 타입
 * @property {string} category - 카테고리 ('video' | 'audio' | 'image' | 'document' | 'archive')
 * @property {string[]} tools - 변환에 사용할 도구들
 */

/**
 * @typedef {Object} ProgressUpdate
 * @property {string} taskId - 작업 ID
 * @property {string} status - 상태
 * @property {number} percentage - 진행률
 * @property {string} [message] - 메시지
 * @property {Date} timestamp - 타임스탬프
 */

export {};