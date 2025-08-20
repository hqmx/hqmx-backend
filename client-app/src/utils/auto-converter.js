// 자동 변환 시스템 - 파일 타입에 따라 최적 엔진 선택 및 로딩

import { getFFmpegEngine } from '../engines/ffmpeg-engine.js';
import { getImageEngine, getAdvancedImageEngine } from '../engines/image-engine.js';

class AutoConverter {
  constructor() {
    this.engines = new Map();
    this.loadingPromises = new Map();
    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;
    this.cancelled = false;
  }

  /**
   * 메인 변환 함수 - 사용자가 호출하는 유일한 함수
   */
  async convert(file, outputFormat, options = {}) {
    this.cancelled = false;
    
    try {
      // 1. 최적 엔진 결정
      this.updateProgress(5, '변환 엔진 선택 중...');
      const engine = await this.selectBestEngine(file, outputFormat);

      // 2. 엔진 로드 (캐시된 경우 즉시 반환)
      this.updateProgress(10, '변환 도구 로딩 중...');
      await this.loadEngine(engine, file.type, outputFormat);

      if (this.cancelled) {
        throw new Error('변환이 취소되었습니다');
      }

      // 3. 변환 실행
      this.updateProgress(30, '변환 시작...');
      const result = await this.performConversion(engine, file, outputFormat, options);

      // 4. 완료
      this.updateProgress(100, '변환 완료!');
      this.onComplete?.(result);
      
      return result;

    } catch (error) {
      console.error('변환 오류:', error);
      this.onError?.(error);
      throw error;
    }
  }

  /**
   * 최적 변환 엔진 선택
   */
  async selectBestEngine(file, outputFormat) {
    const inputType = this.getFileCategory(file.type, file.name);
    const outputType = this.getFormatCategory(outputFormat);

    console.log(`변환: ${inputType} → ${outputType}`);

    // 1. 이미지 변환
    if (inputType === 'image' && outputType === 'image') {
      // 간단한 변환은 Canvas API (빠름)
      if (this.isSimpleImageConversion(file, outputFormat)) {
        return 'canvas';
      }
      // 복잡한 변환은 ImageMagick (고품질)
      return 'imagemagick';
    }

    // 2. 비디오/오디오 변환
    if ((inputType === 'video' || inputType === 'audio') && 
        (outputType === 'video' || outputType === 'audio')) {
      return 'ffmpeg';
    }

    // 3. 지원되지 않는 변환
    throw new Error(`${inputType}에서 ${outputType}로의 변환은 지원되지 않습니다`);
  }

  /**
   * 간단한 이미지 변환인지 확인
   */
  isSimpleImageConversion(file, outputFormat) {
    const simpleFormats = ['jpg', 'jpeg', 'png', 'webp'];
    const inputFormat = this.getFileExtension(file.name);
    
    // 같은 형식군 내의 변환이고 파일이 작으면 Canvas 사용
    return simpleFormats.includes(inputFormat) && 
           simpleFormats.includes(outputFormat) &&
           file.size < 50 * 1024 * 1024; // 50MB 미만
  }

  /**
   * 엔진 로드 (캐시 우선)
   */
  async loadEngine(engineType, inputType, outputFormat) {
    const cacheKey = `${engineType}_${inputType}_${outputFormat}`;

    // 이미 로드된 엔진 반환
    if (this.engines.has(cacheKey)) {
      console.log(`✅ ${engineType} 엔진 캐시에서 로드`);
      this.updateProgress(30, '캐시된 변환 도구 사용');
      return this.engines.get(cacheKey);
    }

    // 로딩 중인 엔진 대기
    if (this.loadingPromises.has(cacheKey)) {
      console.log(`⏳ ${engineType} 엔진 로딩 대기 중`);
      return await this.loadingPromises.get(cacheKey);
    }

    // 새 엔진 로드
    const loadPromise = this.doLoadEngine(engineType);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const engine = await loadPromise;
      this.engines.set(cacheKey, engine);
      this.loadingPromises.delete(cacheKey);
      
      console.log(`✅ ${engineType} 엔진 로드 완료`);
      return engine;

    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  /**
   * 실제 엔진 로드
   */
  async doLoadEngine(engineType) {
    switch (engineType) {
      case 'canvas':
        const imageEngine = getImageEngine();
        await imageEngine.load((progress, message) => {
          this.updateProgress(10 + progress * 0.2, message);
        });
        return imageEngine;

      case 'imagemagick':
        const advancedEngine = getAdvancedImageEngine();
        const loaded = await advancedEngine.load((progress, message) => {
          this.updateProgress(10 + progress * 0.2, message);
        });
        
        // ImageMagick 로딩 실패시 Canvas로 폴백
        if (!loaded) {
          console.log('ImageMagick 로딩 실패, Canvas 엔진으로 폴백');
          return await this.doLoadEngine('canvas');
        }
        return advancedEngine;

      case 'ffmpeg':
        const ffmpegEngine = getFFmpegEngine();
        await ffmpegEngine.load((progress, message) => {
          this.updateProgress(10 + progress * 0.2, message);
        });
        return ffmpegEngine;

      default:
        throw new Error(`알 수 없는 엔진 타입: ${engineType}`);
    }
  }

  /**
   * 실제 변환 수행
   */
  async performConversion(engine, file, outputFormat, options) {
    // 엔진의 진행률 콜백 설정
    const originalProgress = engine.onProgress;
    engine.onProgress = (progress, message) => {
      // 30-100% 범위로 매핑
      const mappedProgress = 30 + (progress * 0.7);
      this.updateProgress(mappedProgress, message);
    };

    try {
      const result = await engine.convert(file, outputFormat, options);
      
      // 진행률 콜백 복원
      engine.onProgress = originalProgress;
      
      return result;

    } catch (error) {
      // 진행률 콜백 복원
      engine.onProgress = originalProgress;
      throw error;
    }
  }

  /**
   * 파일 카테고리 감지
   */
  getFileCategory(mimeType, filename) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';

    // MIME 타입이 불명확한 경우 확장자로 판단
    const ext = this.getFileExtension(filename);
    
    const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico'];
    const videoFormats = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', '3gp'];
    const audioFormats = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'];

    if (imageFormats.includes(ext)) return 'image';
    if (videoFormats.includes(ext)) return 'video';  
    if (audioFormats.includes(ext)) return 'audio';

    return 'unknown';
  }

  /**
   * 출력 형식 카테고리 감지
   */
  getFormatCategory(format) {
    const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico'];
    const videoFormats = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', '3gp'];
    const audioFormats = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'];

    const normalizedFormat = format.toLowerCase();

    if (imageFormats.includes(normalizedFormat)) return 'image';
    if (videoFormats.includes(normalizedFormat)) return 'video';
    if (audioFormats.includes(normalizedFormat)) return 'audio';

    return 'unknown';
  }

  /**
   * 파일 확장자 추출
   */
  getFileExtension(filename) {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * 진행률 업데이트
   */
  updateProgress(percent, message) {
    const clampedPercent = Math.min(100, Math.max(0, Math.round(percent)));
    console.log(`진행률: ${clampedPercent}% - ${message}`);
    this.onProgress?.(clampedPercent, message);
  }

  /**
   * 변환 취소
   */
  cancel() {
    this.cancelled = true;
    console.log('🛑 변환 취소 요청');
  }

  /**
   * 지원 여부 확인
   */
  isSupported(inputFile, outputFormat) {
    try {
      const inputCategory = this.getFileCategory(inputFile.type, inputFile.name);
      const outputCategory = this.getFormatCategory(outputFormat);

      // 현재 지원되는 변환들
      const supportedConversions = [
        { from: 'image', to: 'image' },
        { from: 'video', to: 'video' },
        { from: 'video', to: 'audio' },
        { from: 'audio', to: 'audio' }
      ];

      return supportedConversions.some(conv => 
        conv.from === inputCategory && conv.to === outputCategory
      );

    } catch (error) {
      return false;
    }
  }

  /**
   * 예상 변환 시간 계산 (초)
   */
  estimateConversionTime(file, outputFormat) {
    const category = this.getFileCategory(file.type, file.name);
    const sizeInMB = file.size / (1024 * 1024);

    const timeEstimates = {
      image: 0.5 + (sizeInMB * 0.1),      // 이미지: 기본 0.5초 + 0.1초/MB
      audio: 2 + (sizeInMB * 0.2),        // 오디오: 기본 2초 + 0.2초/MB  
      video: 10 + (sizeInMB * 0.5)        // 비디오: 기본 10초 + 0.5초/MB
    };

    return Math.round(timeEstimates[category] || 30);
  }

  /**
   * 콜백 설정
   */
  setCallbacks(onProgress, onComplete, onError) {
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onError = onError;
  }

  /**
   * 메모리 정리
   */
  async cleanup() {
    // 모든 엔진 정리
    for (const [key, engine] of this.engines) {
      try {
        if (engine.cleanup) {
          await engine.cleanup();
        }
      } catch (error) {
        console.warn(`엔진 정리 오류 (${key}):`, error);
      }
    }

    this.engines.clear();
    this.loadingPromises.clear();
    
    console.log('✅ AutoConverter 정리 완료');
  }
}

// 싱글톤 인스턴스
let autoConverterInstance = null;

export function getAutoConverter() {
  if (!autoConverterInstance) {
    autoConverterInstance = new AutoConverter();
  }
  return autoConverterInstance;
}

export { AutoConverter };