// 기본 변환기 클래스

export class BaseConverter {
  constructor(inputFormat, outputFormat, settings = {}) {
    this.inputFormat = inputFormat.toLowerCase();
    this.outputFormat = outputFormat.toLowerCase();
    this.settings = settings;
    this.progressCallback = null;
  }

  /**
   * 진행률 콜백 함수 설정
   * @param {Function} callback - 진행률 업데이트 콜백
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  /**
   * 진행률 업데이트
   * @param {number} progress - 진행률 (0-100)
   * @param {string} message - 진행 메시지
   */
  async updateProgress(progress, message) {
    if (this.progressCallback) {
      await this.progressCallback({ progress, message });
    }
  }

  /**
   * 변환 실행 (하위 클래스에서 구현)
   * @param {ArrayBuffer} inputData - 입력 파일 데이터
   * @returns {Promise<ArrayBuffer>} 변환된 파일 데이터
   */
  async convert(inputData) {
    throw new Error('convert 메서드를 구현해야 합니다');
  }

  /**
   * 변환 가능 여부 확인
   * @returns {boolean}
   */
  isSupported() {
    return false;
  }

  /**
   * 변환 설정 검증
   * @returns {Object} 검증 결과
   */
  validateSettings() {
    return { valid: true, errors: [] };
  }
}