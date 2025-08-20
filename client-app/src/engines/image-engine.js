// Canvas API 기반 이미지 변환 엔진 (경량, 빠름)

class ImageEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.onProgress = null;
  }

  /**
   * 이미지 변환 엔진 로드 (즉시 사용 가능)
   */
  async load(onProgress) {
    this.onProgress = onProgress;
    this.onProgress?.(10, '이미지 엔진 초기화 중...');
    
    // Canvas 생성 (재사용)
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
    }
    
    this.onProgress?.(30, '이미지 엔진 로딩 완료');
    return true;
  }

  /**
   * 이미지 변환 실행
   */
  async convert(file, outputFormat, options = {}) {
    this.onProgress?.(35, '이미지 로딩 중...');

    try {
      // 이미지 로드
      const img = await this.loadImage(file);
      
      this.onProgress?.(50, '이미지 처리 중...');

      // 출력 크기 계산
      const { width, height } = this.calculateOutputSize(img, options);

      // Canvas 설정
      this.canvas.width = width;
      this.canvas.height = height;

      // 배경 설정 (투명도 지원하지 않는 형식)
      if (this.needsBackground(outputFormat)) {
        this.ctx.fillStyle = options.backgroundColor || '#FFFFFF';
        this.ctx.fillRect(0, 0, width, height);
      }

      this.onProgress?.(70, '이미지 렌더링 중...');

      // 이미지 그리기 (리샘플링 포함)
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      this.ctx.drawImage(img, 0, 0, width, height);

      // 추가 처리
      if (options.filters) {
        this.applyFilters(options.filters);
      }

      this.onProgress?.(85, '최종 처리 중...');

      // Blob으로 변환
      const quality = this.getQuality(options.quality);
      const mimeType = this.getMimeType(outputFormat);
      
      const blob = await new Promise(resolve => {
        this.canvas.toBlob(resolve, mimeType, quality);
      });

      this.onProgress?.(100, '이미지 변환 완료!');
      
      return blob;

    } catch (error) {
      console.error('이미지 변환 오류:', error);
      throw new Error(`이미지 변환 실패: ${error.message}`);
    }
  }

  /**
   * 이미지 파일을 Image 객체로 로드
   */
  loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('이미지 로드 실패'));
      };

      img.src = url;
    });
  }

  /**
   * 출력 크기 계산
   */
  calculateOutputSize(img, options) {
    let width = img.naturalWidth;
    let height = img.naturalHeight;

    // 리사이즈 옵션 처리
    if (options.resize && options.resize !== 'none') {
      const scale = this.parseResizeOption(options.resize);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    // 최대 크기 제한
    if (options.maxWidth && width > options.maxWidth) {
      const ratio = options.maxWidth / width;
      width = options.maxWidth;
      height = Math.round(height * ratio);
    }

    if (options.maxHeight && height > options.maxHeight) {
      const ratio = options.maxHeight / height;
      height = options.maxHeight;
      width = Math.round(width * ratio);
    }

    // 최소 1px
    width = Math.max(1, width);
    height = Math.max(1, height);

    return { width, height };
  }

  /**
   * 리사이즈 옵션 파싱
   */
  parseResizeOption(resize) {
    if (resize.endsWith('%')) {
      return parseFloat(resize) / 100;
    }

    const scaleMap = {
      '50%': 0.5,
      '75%': 0.75,
      '125%': 1.25,
      '150%': 1.5,
      '200%': 2.0
    };

    return scaleMap[resize] || 1.0;
  }

  /**
   * 필터 적용
   */
  applyFilters(filters) {
    if (filters.brightness !== undefined) {
      this.adjustBrightness(filters.brightness);
    }

    if (filters.contrast !== undefined) {
      this.adjustContrast(filters.contrast);
    }

    if (filters.blur) {
      this.applyBlur(filters.blur);
    }

    if (filters.grayscale) {
      this.applyGrayscale();
    }
  }

  /**
   * 밝기 조절
   */
  adjustBrightness(value) {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] + value));     // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + value)); // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + value)); // B
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * 대비 조절
   */
  adjustContrast(value) {
    const factor = (259 * (value + 255)) / (255 * (259 - value));
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));     // R
      data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128)); // G  
      data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128)); // B
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * 흐림 효과
   */
  applyBlur(radius) {
    this.ctx.filter = `blur(${radius}px)`;
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.putImageData(imageData, 0, 0);
    this.ctx.filter = 'none';
  }

  /**
   * 흑백 변환
   */
  applyGrayscale() {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      data[i] = gray;     // R
      data[i + 1] = gray; // G
      data[i + 2] = gray; // B
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * 품질값 변환
   */
  getQuality(quality) {
    if (typeof quality === 'number') {
      return Math.min(1, Math.max(0, quality / 100));
    }

    const qualityMap = {
      'high': 0.95,
      'medium': 0.85,
      'low': 0.70
    };

    return qualityMap[quality] || 0.85;
  }

  /**
   * MIME 타입 반환
   */
  getMimeType(format) {
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif', // Canvas는 정적 GIF만 지원
      'bmp': 'image/bmp'
    };

    return mimeTypes[format.toLowerCase()] || 'image/png';
  }

  /**
   * 배경이 필요한 형식인지 확인
   */
  needsBackground(format) {
    const opaqueFormats = ['jpg', 'jpeg', 'bmp'];
    return opaqueFormats.includes(format.toLowerCase());
  }

  /**
   * 지원되는 변환인지 확인
   */
  canConvert(inputFormat, outputFormat) {
    const supportedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'];
    return supportedFormats.includes(inputFormat.toLowerCase()) && 
           supportedFormats.includes(outputFormat.toLowerCase());
  }

  /**
   * 메모리 정리
   */
  async cleanup() {
    if (this.canvas) {
      this.canvas.width = 1;
      this.canvas.height = 1;
      this.ctx.clearRect(0, 0, 1, 1);
    }
    console.log('✅ 이미지 엔진 정리 완료');
  }
}

// 고급 이미지 처리를 위한 WebAssembly 기반 엔진 (옵션)
class AdvancedImageEngine {
  constructor() {
    this.loaded = false;
    this.imagemagick = null;
  }

  async load(onProgress) {
    if (this.loaded) return true;

    onProgress?.(10, 'ImageMagick 다운로드 중...');

    try {
      // ImageMagick WASM 동적 로드
      const { ImageMagick, initialize } = await import('https://cdn.jsdelivr.net/npm/@imagemagick/magick-wasm@0.0.28/dist/index.js');
      
      onProgress?.(50, 'ImageMagick 초기화 중...');
      
      await initialize();
      this.imagemagick = ImageMagick;
      this.loaded = true;

      onProgress?.(100, 'ImageMagick 로딩 완료');
      console.log('✅ ImageMagick 로딩 완료');
      
      return true;

    } catch (error) {
      console.warn('ImageMagick 로딩 실패, Canvas 엔진 사용:', error);
      return false;
    }
  }

  async convert(file, outputFormat, options = {}) {
    if (!this.loaded) {
      throw new Error('ImageMagick이 로드되지 않았습니다');
    }

    const inputData = new Uint8Array(await file.arrayBuffer());
    
    return new Promise((resolve, reject) => {
      try {
        this.imagemagick.read(inputData, (img) => {
          // 형식 변환
          img.format = outputFormat.toUpperCase();
          
          // 품질 설정
          if (options.quality) {
            img.quality = this.getQualityValue(options.quality);
          }

          // 리사이즈
          if (options.resize && options.resize !== 'none') {
            const scale = this.parseResizeOption(options.resize);
            if (scale !== 1.0) {
              const newWidth = Math.round(img.baseWidth * scale);
              const newHeight = Math.round(img.baseHeight * scale);
              img.resize(newWidth, newHeight);
            }
          }

          // 출력
          const outputData = img.write();
          const blob = new Blob([outputData], { 
            type: this.getMimeType(outputFormat) 
          });
          
          resolve(blob);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  getQualityValue(quality) {
    if (typeof quality === 'number') {
      return quality;
    }

    const qualityMap = {
      'high': 95,
      'medium': 85,
      'low': 70
    };

    return qualityMap[quality] || 85;
  }

  parseResizeOption(resize) {
    if (resize.endsWith('%')) {
      return parseFloat(resize) / 100;
    }

    const scaleMap = {
      '50%': 0.5,
      '75%': 0.75,
      '125%': 1.25,
      '150%': 1.5,
      '200%': 2.0
    };

    return scaleMap[resize] || 1.0;
  }

  getMimeType(format) {
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff'
    };

    return mimeTypes[format.toLowerCase()] || 'image/png';
  }

  canConvert(inputFormat, outputFormat) {
    const supportedFormats = [
      'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'svg', 'ico'
    ];
    return supportedFormats.includes(inputFormat.toLowerCase()) && 
           supportedFormats.includes(outputFormat.toLowerCase());
  }
}

// 싱글톤 인스턴스들
let imageEngineInstance = null;
let advancedImageEngineInstance = null;

export function getImageEngine() {
  if (!imageEngineInstance) {
    imageEngineInstance = new ImageEngine();
  }
  return imageEngineInstance;
}

export function getAdvancedImageEngine() {
  if (!advancedImageEngineInstance) {
    advancedImageEngineInstance = new AdvancedImageEngine();
  }
  return advancedImageEngineInstance;
}

export { ImageEngine, AdvancedImageEngine };