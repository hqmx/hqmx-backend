// HQMX Converter - 메인 애플리케이션
// 모든 기능을 통합하는 메인 컨트롤러

import { getAutoConverter } from './utils/auto-converter.js';
import { getCacheManager } from './utils/cache-manager.js';
import { getDownloadManager } from './utils/download-manager.js';

class ConverterApp {
  constructor() {
    this.autoConverter = getAutoConverter();
    this.cacheManager = getCacheManager();
    this.downloadManager = getDownloadManager();
    
    this.selectedFile = null;
    this.isConverting = false;
    this.currentConversion = null;
    
    this.elements = {};
    
    this.init();
  }

  /**
   * 애플리케이션 초기화
   */
  async init() {
    try {
      // DOM 요소 바인딩
      this.bindElements();
      
      // 이벤트 리스너 설정
      this.setupEventListeners();
      
      // 캐시 매니저 초기화
      await this.cacheManager.init();
      
      // 다운로드 매니저 콜백 설정
      this.setupDownloadCallbacks();
      
      // 변환기 콜백 설정
      this.setupConverterCallbacks();
      
      // 테마 초기화
      this.initTheme();
      
      console.log('✅ HQMX Converter 초기화 완료');
      
    } catch (error) {
      console.error('애플리케이션 초기화 실패:', error);
      this.showToast('애플리케이션 초기화에 실패했습니다', 'error');
    }
  }

  /**
   * DOM 요소 바인딩
   */
  bindElements() {
    this.elements = {
      // 파일 선택
      dropZone: document.getElementById('dropZone'),
      fileInput: document.getElementById('fileInput'),
      fileSelectBtn: document.getElementById('fileSelectBtn'),
      
      // 파일 정보
      fileInfo: document.getElementById('fileInfo'),
      fileName: document.getElementById('fileName'),
      fileSize: document.getElementById('fileSize'),
      fileIcon: document.getElementById('fileIcon'),
      removeFile: document.getElementById('removeFile'),
      
      // 변환 설정
      conversionSettings: document.getElementById('conversionSettings'),
      outputFormat: document.getElementById('outputFormat'),
      quality: document.getElementById('quality'),
      convertBtn: document.getElementById('convertBtn'),
      
      // 진행률
      progressSection: document.getElementById('progressSection'),
      progressTitle: document.getElementById('progressTitle'),
      progressPercent: document.getElementById('progressPercent'),
      progressFill: document.getElementById('progressFill'),
      progressMessage: document.getElementById('progressMessage'),
      cancelBtn: document.getElementById('cancelBtn'),
      
      // 완료
      completionSection: document.getElementById('completionSection'),
      downloadBtn: document.getElementById('downloadBtn'),
      newConversionBtn: document.getElementById('newConversionBtn'),
      
      // 기타
      themeToggle: document.getElementById('themeToggle'),
      toast: document.getElementById('toast'),
      toastMessage: document.getElementById('toastMessage'),
      toastClose: document.getElementById('toastClose')
    };
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 파일 선택/드롭 이벤트
    this.elements.fileSelectBtn.addEventListener('click', () => {
      this.elements.fileInput.click();
    });

    this.elements.fileInput.addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files[0]);
    });

    // 드래그 앤 드롭
    this.elements.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.elements.dropZone.classList.add('drag-over');
    });

    this.elements.dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.elements.dropZone.classList.remove('drag-over');
    });

    this.elements.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.elements.dropZone.classList.remove('drag-over');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFileSelect(files[0]);
      }
    });

    this.elements.dropZone.addEventListener('click', () => {
      this.elements.fileInput.click();
    });

    // 변환 관련 이벤트
    this.elements.removeFile.addEventListener('click', () => {
      this.resetFileSelection();
    });

    this.elements.outputFormat.addEventListener('change', () => {
      this.updateConvertButton();
    });

    this.elements.convertBtn.addEventListener('click', () => {
      this.startConversion();
    });

    this.elements.cancelBtn.addEventListener('click', () => {
      this.cancelConversion();
    });

    // 완료 후 이벤트
    this.elements.downloadBtn.addEventListener('click', () => {
      this.downloadResult();
    });

    this.elements.newConversionBtn.addEventListener('click', () => {
      this.resetToInitialState();
    });

    // 테마 토글
    this.elements.themeToggle.addEventListener('click', () => {
      this.toggleTheme();
    });

    // 토스트 닫기
    this.elements.toastClose.addEventListener('click', () => {
      this.hideToast();
    });

    // 커스텀 이벤트
    document.addEventListener('showToast', (e) => {
      this.showToast(e.detail.message, e.detail.type);
    });
  }

  /**
   * 파일 선택 처리
   */
  async handleFileSelect(file) {
    if (!file) return;

    console.log('파일 선택:', file.name, file.size, file.type);

    try {
      // 파일 크기 제한 확인 (2GB)
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (file.size > maxSize) {
        throw new Error('파일 크기가 너무 큽니다. 최대 2GB까지 지원됩니다.');
      }

      this.selectedFile = file;

      // UI 업데이트
      this.updateFileInfo(file);
      this.showFileInfo();
      this.updateOutputFormats(file);
      this.showConversionSettings();
      this.updateConvertButton();

    } catch (error) {
      console.error('파일 선택 오류:', error);
      this.showToast(error.message, 'error');
    }
  }

  /**
   * 파일 정보 UI 업데이트
   */
  updateFileInfo(file) {
    this.elements.fileName.textContent = file.name;
    this.elements.fileSize.textContent = this.formatFileSize(file.size);
    this.elements.fileIcon.textContent = this.getFileIcon(file.type);
  }

  /**
   * 출력 형식 옵션 업데이트
   */
  updateOutputFormats(file) {
    const category = this.getFileCategory(file.type, file.name);
    const select = this.elements.outputFormat;
    
    // 기존 옵션 제거
    select.innerHTML = '';

    // 카테고리별 추천 형식 추가
    const formats = this.getRecommendedFormats(category);
    
    formats.forEach(({ label, formats: formatList }) => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = label;
      
      formatList.forEach(format => {
        const option = document.createElement('option');
        option.value = format.value;
        option.textContent = format.label;
        optgroup.appendChild(option);
      });
      
      select.appendChild(optgroup);
    });

    // 첫 번째 옵션 선택
    if (select.options.length > 0) {
      select.selectedIndex = 0;
    }
  }

  /**
   * 추천 형식 가져오기
   */
  getRecommendedFormats(category) {
    const formatGroups = {
      image: [
        {
          label: '웹 최적화',
          formats: [
            { value: 'webp', label: 'WebP (최고 압축)' },
            { value: 'jpg', label: 'JPG (호환성)' },
            { value: 'png', label: 'PNG (투명도)' }
          ]
        },
        {
          label: '기타 형식',
          formats: [
            { value: 'gif', label: 'GIF' },
            { value: 'bmp', label: 'BMP' },
            { value: 'svg', label: 'SVG' }
          ]
        }
      ],
      video: [
        {
          label: '웹 호환',
          formats: [
            { value: 'mp4', label: 'MP4 (권장)' },
            { value: 'webm', label: 'WebM (고품질)' }
          ]
        },
        {
          label: '기타',
          formats: [
            { value: 'avi', label: 'AVI' },
            { value: 'mov', label: 'MOV' }
          ]
        }
      ],
      audio: [
        {
          label: '일반 사용',
          formats: [
            { value: 'mp3', label: 'MP3 (호환성)' },
            { value: 'aac', label: 'AAC (고품질)' }
          ]
        },
        {
          label: '고품질',
          formats: [
            { value: 'flac', label: 'FLAC (무손실)' },
            { value: 'wav', label: 'WAV' },
            { value: 'ogg', label: 'OGG' }
          ]
        }
      ]
    };

    return formatGroups[category] || [];
  }

  /**
   * 변환 시작
   */
  async startConversion() {
    if (!this.selectedFile || this.isConverting) return;

    const outputFormat = this.elements.outputFormat.value;
    const quality = this.elements.quality.value;

    try {
      this.isConverting = true;
      
      // UI 상태 변경
      this.showProgressSection();
      this.elements.convertBtn.disabled = true;

      // 변환 설정
      const options = {
        quality: quality,
        // 추가 설정들...
      };

      console.log('변환 시작:', {
        input: this.selectedFile.name,
        output: outputFormat,
        options
      });

      // 변환 실행
      this.currentConversion = this.autoConverter.convert(this.selectedFile, outputFormat, options);
      const result = await this.currentConversion;

      // 변환 완료 처리
      await this.handleConversionComplete(result, outputFormat);

    } catch (error) {
      console.error('변환 실패:', error);
      this.handleConversionError(error);
    } finally {
      this.isConverting = false;
      this.currentConversion = null;
    }
  }

  /**
   * 변환 완료 처리
   */
  async handleConversionComplete(resultBlob, outputFormat) {
    try {
      console.log('변환 완료:', resultBlob.size, 'bytes');

      // 자동 다운로드
      const downloadResult = await this.downloadManager.autoDownload(
        resultBlob, 
        this.selectedFile.name, 
        outputFormat
      );

      if (downloadResult.success) {
        // 완료 UI 표시
        this.showCompletionSection();
        this.conversionResult = { blob: resultBlob, filename: downloadResult.filename };
        
        // 성공 통계 업데이트
        this.updateConversionStats(true, outputFormat);
      } else {
        throw new Error(downloadResult.error || '다운로드 실패');
      }

    } catch (error) {
      console.error('변환 완료 처리 오류:', error);
      this.handleConversionError(error);
    }
  }

  /**
   * 변환 오류 처리
   */
  handleConversionError(error) {
    this.showToast(`변환 실패: ${error.message}`, 'error');
    
    // 실패 통계 업데이트
    this.updateConversionStats(false);
    
    // UI 리셋
    this.hideProgressSection();
    this.showConversionSettings();
    this.elements.convertBtn.disabled = false;
  }

  /**
   * 변환 취소
   */
  cancelConversion() {
    if (this.currentConversion) {
      this.autoConverter.cancel();
      this.isConverting = false;
      this.currentConversion = null;
      
      this.showToast('변환이 취소되었습니다', 'info');
      this.hideProgressSection();
      this.showConversionSettings();
      this.elements.convertBtn.disabled = false;
    }
  }

  /**
   * 결과 다운로드 (재다운로드)
   */
  async downloadResult() {
    if (this.conversionResult) {
      const { blob, filename } = this.conversionResult;
      
      try {
        const downloadResult = await this.downloadManager.autoDownload(
          blob, 
          filename.split('.')[0], // 확장자 제거
          filename.split('.').pop() // 확장자만
        );
        
        if (downloadResult.success) {
          this.showToast('다시 다운로드되었습니다', 'success');
        }
      } catch (error) {
        this.showToast('다운로드 실패: ' + error.message, 'error');
      }
    }
  }

  /**
   * 초기 상태로 리셋
   */
  resetToInitialState() {
    this.resetFileSelection();
    this.hideAllSections();
    this.elements.convertBtn.disabled = false;
    this.isConverting = false;
    this.currentConversion = null;
    this.conversionResult = null;
  }

  /**
   * 파일 선택 리셋
   */
  resetFileSelection() {
    this.selectedFile = null;
    this.elements.fileInput.value = '';
    this.hideFileInfo();
    this.hideConversionSettings();
  }

  /**
   * UI 표시/숨김 메서드들
   */
  showFileInfo() {
    this.elements.fileInfo.hidden = false;
  }

  hideFileInfo() {
    this.elements.fileInfo.hidden = true;
  }

  showConversionSettings() {
    this.elements.conversionSettings.hidden = false;
  }

  hideConversionSettings() {
    this.elements.conversionSettings.hidden = true;
  }

  showProgressSection() {
    this.hideAllSections();
    this.elements.progressSection.hidden = false;
  }

  hideProgressSection() {
    this.elements.progressSection.hidden = true;
  }

  showCompletionSection() {
    this.hideAllSections();
    this.elements.completionSection.hidden = false;
  }

  hideCompletionSection() {
    this.elements.completionSection.hidden = true;
  }

  hideAllSections() {
    this.elements.conversionSettings.hidden = true;
    this.elements.progressSection.hidden = true;
    this.elements.completionSection.hidden = true;
  }

  /**
   * 변환 버튼 상태 업데이트
   */
  updateConvertButton() {
    const hasFile = !!this.selectedFile;
    const hasFormat = !!this.elements.outputFormat.value;
    
    this.elements.convertBtn.disabled = !hasFile || !hasFormat || this.isConverting;
  }

  /**
   * 변환기 콜백 설정
   */
  setupConverterCallbacks() {
    this.autoConverter.setCallbacks(
      // 진행률 콜백
      (percent, message) => {
        this.updateProgress(percent, message);
      },
      // 완료 콜백 (이미 handleConversionComplete에서 처리)
      null,
      // 오류 콜백 (이미 catch에서 처리)
      null
    );
  }

  /**
   * 다운로드 매니저 콜백 설정
   */
  setupDownloadCallbacks() {
    this.downloadManager.setCallbacks(
      // 다운로드 시작
      (filename, size) => {
        console.log('다운로드 시작:', filename, size);
      },
      // 다운로드 완료 
      (filename, size) => {
        console.log('다운로드 완료:', filename, size);
      },
      // 다운로드 오류
      (error) => {
        console.error('다운로드 오류:', error);
      }
    );
  }

  /**
   * 진행률 업데이트
   */
  updateProgress(percent, message) {
    this.elements.progressPercent.textContent = `${percent}%`;
    this.elements.progressFill.style.width = `${percent}%`;
    this.elements.progressMessage.textContent = message;
    
    // 진행률에 따른 색상 변경
    if (percent < 30) {
      this.elements.progressFill.className = 'progress-fill loading';
    } else if (percent < 90) {
      this.elements.progressFill.className = 'progress-fill converting';
    } else {
      this.elements.progressFill.className = 'progress-fill completing';
    }
  }

  /**
   * 테마 관련
   */
  initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeToggle(savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    this.updateThemeToggle(newTheme);
  }

  updateThemeToggle(theme) {
    this.elements.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  /**
   * 토스트 알림
   */
  showToast(message, type = 'info') {
    this.elements.toastMessage.textContent = message;
    this.elements.toast.className = `toast ${type}`;
    this.elements.toast.hidden = false;

    // 5초 후 자동 숨김
    setTimeout(() => {
      this.hideToast();
    }, 5000);
  }

  hideToast() {
    this.elements.toast.hidden = true;
  }

  /**
   * 유틸리티 메서드들
   */
  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    return '📄';
  }

  getFileCategory(mimeType, filename) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';

    // MIME 타입이 불명확한 경우 확장자로 판단
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    
    const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const videoFormats = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'];
    const audioFormats = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'];

    if (imageFormats.includes(ext)) return 'image';
    if (videoFormats.includes(ext)) return 'video';  
    if (audioFormats.includes(ext)) return 'audio';

    return 'unknown';
  }

  /**
   * 변환 통계 업데이트
   */
  updateConversionStats(success, outputFormat = null) {
    try {
      const stats = JSON.parse(localStorage.getItem('conversionStats') || '{}');
      
      stats.total = (stats.total || 0) + 1;
      if (success) {
        stats.successful = (stats.successful || 0) + 1;
        
        if (outputFormat) {
          stats.byFormat = stats.byFormat || {};
          stats.byFormat[outputFormat] = (stats.byFormat[outputFormat] || 0) + 1;
        }
      } else {
        stats.failed = (stats.failed || 0) + 1;
      }
      
      stats.lastConversion = Date.now();
      
      localStorage.setItem('conversionStats', JSON.stringify(stats));

    } catch (error) {
      console.warn('통계 업데이트 실패:', error);
    }
  }
}

// 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
  window.converterApp = new ConverterApp();
  
  // 개발자 도구에서 접근 가능하도록
  window.getStats = () => ({
    conversion: JSON.parse(localStorage.getItem('conversionStats') || '{}'),
    download: window.converterApp.downloadManager.getDownloadStats(),
    cache: window.converterApp.cacheManager.getStats()
  });
  
  console.log('🚀 HQMX Converter 시작');
});