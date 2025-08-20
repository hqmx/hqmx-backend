// 자동 다운로드 관리자 - 변환 완료 시 자동 다운로드 및 파일 관리

class DownloadManager {
  constructor() {
    this.downloads = new Map();
    this.onDownloadStart = null;
    this.onDownloadComplete = null;
    this.onDownloadError = null;
  }

  /**
   * 자동 다운로드 실행 (메인 함수)
   */
  async autoDownload(blob, originalFilename, outputFormat, options = {}) {
    try {
      // 1. 파일명 생성
      const filename = this.generateOutputFilename(originalFilename, outputFormat, options);
      
      // 2. 다운로드 시작 콜백
      this.onDownloadStart?.(filename, blob.size);

      // 3. 브라우저 다운로드 트리거
      const success = await this.triggerDownload(blob, filename, options);

      if (success) {
        // 4. 다운로드 완료 처리
        await this.handleDownloadComplete(filename, blob, options);
        this.onDownloadComplete?.(filename, blob.size);
        
        return { success: true, filename };
      } else {
        throw new Error('다운로드 실행 실패');
      }

    } catch (error) {
      console.error('자동 다운로드 오류:', error);
      this.onDownloadError?.(error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 브라우저 다운로드 트리거
   */
  async triggerDownload(blob, filename, options = {}) {
    try {
      // 다운로드 방법 선택 (브라우저 호환성 고려)
      const method = this.selectDownloadMethod(blob, options);
      
      switch (method) {
        case 'anchor':
          return await this.downloadWithAnchor(blob, filename, options);
        
        case 'showSaveFilePicker':
          return await this.downloadWithFileSystemAPI(blob, filename, options);
        
        case 'clipboard':
          return await this.copyToClipboard(blob, filename, options);
        
        default:
          throw new Error('지원되는 다운로드 방법이 없습니다');
      }

    } catch (error) {
      console.error('다운로드 트리거 오류:', error);
      return false;
    }
  }

  /**
   * HTML5 Anchor 방식 다운로드 (기본)
   */
  async downloadWithAnchor(blob, filename, options = {}) {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        
        anchor.href = url;
        anchor.download = filename;
        anchor.style.display = 'none';

        // DOM에 추가 후 클릭
        document.body.appendChild(anchor);
        anchor.click();
        
        // 정리 작업
        setTimeout(() => {
          document.body.removeChild(anchor);
          URL.revokeObjectURL(url);
          resolve(true);
        }, 100);

      } catch (error) {
        console.error('Anchor 다운로드 실패:', error);
        resolve(false);
      }
    });
  }

  /**
   * File System Access API 다운로드 (Chrome 86+)
   */
  async downloadWithFileSystemAPI(blob, filename, options = {}) {
    try {
      if (!('showSaveFilePicker' in window)) {
        return false; // API 미지원
      }

      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: this.getFileDescription(filename),
          accept: this.getAcceptTypes(filename)
        }]
      });

      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      console.log('✅ File System API 다운로드 완료');
      return true;

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('사용자가 다운로드 취소');
        return false;
      }
      console.error('File System API 다운로드 실패:', error);
      return false;
    }
  }

  /**
   * 클립보드 복사 (이미지 전용)
   */
  async copyToClipboard(blob, filename, options = {}) {
    try {
      if (!navigator.clipboard || !navigator.clipboard.write) {
        return false;
      }

      // 이미지만 클립보드 지원
      if (!blob.type.startsWith('image/')) {
        return false;
      }

      const clipboardItem = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([clipboardItem]);

      this.showToast(`${filename}이(가) 클립보드에 복사되었습니다`, 'success');
      return true;

    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      return false;
    }
  }

  /**
   * 다운로드 방법 선택
   */
  selectDownloadMethod(blob, options) {
    // 사용자 선호도가 있으면 우선 적용
    if (options.preferredMethod) {
      return options.preferredMethod;
    }

    // File System API 우선 (더 나은 UX)
    if ('showSaveFilePicker' in window && !options.forceAnchor) {
      return 'showSaveFilePicker';
    }

    // 기본: Anchor 다운로드
    return 'anchor';
  }

  /**
   * 출력 파일명 생성
   */
  generateOutputFilename(originalFilename, outputFormat, options = {}) {
    // 사용자 지정 파일명이 있으면 사용
    if (options.customFilename) {
      return this.ensureExtension(options.customFilename, outputFormat);
    }

    // 원본 파일명에서 확장자 제거
    const nameWithoutExt = this.removeExtension(originalFilename);
    
    // 안전한 파일명으로 정리
    const safeName = this.sanitizeFilename(nameWithoutExt);
    
    // 형식 접미사 추가 (옵션)
    let finalName = safeName;
    if (options.addFormatSuffix) {
      finalName += `_${outputFormat}`;
    }

    // 시간스탬프 추가 (옵션)
    if (options.addTimestamp) {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      finalName += `_${timestamp}`;
    }

    return `${finalName}.${outputFormat}`;
  }

  /**
   * 파일명에서 확장자 제거
   */
  removeExtension(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  }

  /**
   * 파일명에 확장자 확인/추가
   */
  ensureExtension(filename, extension) {
    const ext = `.${extension}`;
    if (filename.toLowerCase().endsWith(ext.toLowerCase())) {
      return filename;
    }
    return filename + ext;
  }

  /**
   * 안전한 파일명 생성 (특수문자 제거)
   */
  sanitizeFilename(filename) {
    return filename
      // 윈도우 금지 문자
      .replace(/[<>:"/\\|?*]/g, '_')
      // 제어 문자
      .replace(/[\x00-\x1f\x80-\x9f]/g, '_')
      // 연속된 공백을 하나로
      .replace(/\s+/g, ' ')
      // 앞뒤 공백 제거
      .trim()
      // 점으로 시작하는 파일명 방지
      .replace(/^\.+/, '_')
      // 너무 긴 파일명 제한
      .substring(0, 200);
  }

  /**
   * 파일 설명 생성 (File System API용)
   */
  getFileDescription(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const descriptions = {
      // 이미지
      'jpg': 'JPEG 이미지',
      'jpeg': 'JPEG 이미지', 
      'png': 'PNG 이미지',
      'gif': 'GIF 이미지',
      'webp': 'WebP 이미지',
      'bmp': 'BMP 이미지',
      'svg': 'SVG 벡터 이미지',
      
      // 비디오
      'mp4': 'MP4 비디오',
      'webm': 'WebM 비디오',
      'avi': 'AVI 비디오',
      'mov': 'QuickTime 동영상',
      'mkv': 'Matroska 비디오',
      
      // 오디오
      'mp3': 'MP3 오디오',
      'wav': 'WAV 오디오',
      'flac': 'FLAC 오디오',
      'aac': 'AAC 오디오',
      'ogg': 'OGG 오디오'
    };

    return descriptions[ext] || '변환된 파일';
  }

  /**
   * Accept 타입 생성 (File System API용)
   */
  getAcceptTypes(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const mimeTypes = {
      // 이미지
      'jpg': { 'image/jpeg': ['.jpg', '.jpeg'] },
      'jpeg': { 'image/jpeg': ['.jpg', '.jpeg'] },
      'png': { 'image/png': ['.png'] },
      'gif': { 'image/gif': ['.gif'] },
      'webp': { 'image/webp': ['.webp'] },
      'bmp': { 'image/bmp': ['.bmp'] },
      'svg': { 'image/svg+xml': ['.svg'] },
      
      // 비디오
      'mp4': { 'video/mp4': ['.mp4'] },
      'webm': { 'video/webm': ['.webm'] },
      'avi': { 'video/x-msvideo': ['.avi'] },
      'mov': { 'video/quicktime': ['.mov'] },
      'mkv': { 'video/x-matroska': ['.mkv'] },
      
      // 오디오
      'mp3': { 'audio/mpeg': ['.mp3'] },
      'wav': { 'audio/wav': ['.wav'] },
      'flac': { 'audio/flac': ['.flac'] },
      'aac': { 'audio/aac': ['.aac'] },
      'ogg': { 'audio/ogg': ['.ogg'] }
    };

    return mimeTypes[ext] || { 'application/octet-stream': [`.${ext}`] };
  }

  /**
   * 다운로드 완료 후 처리
   */
  async handleDownloadComplete(filename, blob, options = {}) {
    const downloadInfo = {
      filename,
      size: blob.size,
      timestamp: Date.now(),
      type: blob.type
    };

    // 다운로드 기록 저장
    this.downloads.set(filename, downloadInfo);

    // 성공 토스트 표시
    this.showToast(`✅ ${filename} 다운로드 완료!`, 'success');

    // 통계 업데이트
    this.updateDownloadStats(downloadInfo);

    // 자동 정리 (옵션)
    if (options.autoCleanup) {
      setTimeout(() => {
        URL.revokeObjectURL(blob);
      }, 5000);
    }
  }

  /**
   * 다운로드 통계 업데이트
   */
  updateDownloadStats(downloadInfo) {
    try {
      const stats = JSON.parse(localStorage.getItem('downloadStats') || '{}');
      
      stats.totalDownloads = (stats.totalDownloads || 0) + 1;
      stats.totalSize = (stats.totalSize || 0) + downloadInfo.size;
      stats.lastDownload = downloadInfo.timestamp;
      
      // 형식별 통계
      const format = downloadInfo.filename.split('.').pop();
      stats.byFormat = stats.byFormat || {};
      stats.byFormat[format] = (stats.byFormat[format] || 0) + 1;
      
      localStorage.setItem('downloadStats', JSON.stringify(stats));

    } catch (error) {
      console.warn('통계 업데이트 실패:', error);
    }
  }

  /**
   * 배치 다운로드 (여러 파일)
   */
  async batchDownload(files, options = {}) {
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const { blob, originalFilename, outputFormat } = files[i];
      
      try {
        const result = await this.autoDownload(blob, originalFilename, outputFormat, {
          ...options,
          addTimestamp: true, // 중복 방지
          batchIndex: i + 1,
          batchTotal: files.length
        });
        
        results.push(result);
        
        // 배치 진행률 알림
        if (options.onBatchProgress) {
          options.onBatchProgress(i + 1, files.length, result);
        }

      } catch (error) {
        console.error(`배치 다운로드 오류 (${i + 1}/${files.length}):`, error);
        results.push({ success: false, error: error.message });
      }

      // 브라우저 과부하 방지
      if (i < files.length - 1) {
        await this.delay(500);
      }
    }

    return results;
  }

  /**
   * ZIP 아카이브로 다운로드 (여러 파일을 하나로)
   */
  async downloadAsZip(files, zipFilename = 'converted_files.zip') {
    try {
      // 동적으로 JSZip 라이브러리 로드
      const JSZip = await this.loadJSZip();
      
      const zip = new JSZip();

      // 파일들을 ZIP에 추가
      for (const { blob, originalFilename, outputFormat } of files) {
        const filename = this.generateOutputFilename(originalFilename, outputFormat);
        zip.file(filename, blob);
      }

      // ZIP 생성
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // ZIP 다운로드
      return await this.autoDownload(zipBlob, zipFilename, 'zip');

    } catch (error) {
      console.error('ZIP 다운로드 실패:', error);
      throw new Error(`ZIP 생성 실패: ${error.message}`);
    }
  }

  /**
   * JSZip 라이브러리 동적 로드
   */
  async loadJSZip() {
    if (window.JSZip) {
      return window.JSZip;
    }

    // CDN에서 로드
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = () => resolve(window.JSZip);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * 토스트 알림 표시
   */
  showToast(message, type = 'info') {
    // UI 토스트 시스템과 연동
    const event = new CustomEvent('showToast', {
      detail: { message, type }
    });
    document.dispatchEvent(event);
  }

  /**
   * 지연 함수
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 다운로드 기록 조회
   */
  getDownloadHistory() {
    return Array.from(this.downloads.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 다운로드 통계 조회
   */
  getDownloadStats() {
    try {
      return JSON.parse(localStorage.getItem('downloadStats') || '{}');
    } catch (error) {
      return {};
    }
  }

  /**
   * 콜백 설정
   */
  setCallbacks(onStart, onComplete, onError) {
    this.onDownloadStart = onStart;
    this.onDownloadComplete = onComplete;
    this.onDownloadError = onError;
  }

  /**
   * 기록 정리
   */
  clearHistory() {
    this.downloads.clear();
    localStorage.removeItem('downloadStats');
    console.log('✅ 다운로드 기록 정리 완료');
  }
}

// 싱글톤 인스턴스
let downloadManagerInstance = null;

export function getDownloadManager() {
  if (!downloadManagerInstance) {
    downloadManagerInstance = new DownloadManager();
  }
  return downloadManagerInstance;
}

export { DownloadManager };