import { BaseConverter } from './base-converter.js';
import sharp from 'sharp';

/**
 * 이미지 변환기 (Sharp 기반)
 * Sharp는 libvips를 사용한 고성능 이미지 처리 라이브러리
 */
export class ImageConverter extends BaseConverter {
  constructor(inputFormat, outputFormat, settings = {}) {
    super(inputFormat, outputFormat, settings);
    this.supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif', 'heic', 'svg'];
  }

  isSupported() {
    return this.supportedFormats.includes(this.inputFormat) &&
           this.supportedFormats.includes(this.outputFormat);
  }

  async convert() {
    console.log('[ImageConverter] ========== 변환 시작 ==========');
    console.log('[ImageConverter] inputFormat:', this.inputFormat);
    console.log('[ImageConverter] outputFormat:', this.outputFormat);
    console.log('[ImageConverter] settings:', JSON.stringify(this.settings, null, 2));

    const inputPath = this.settings.inputPath;
    const outputPath = this.settings.outputPath;

    console.log('[ImageConverter] inputPath:', inputPath);
    console.log('[ImageConverter] outputPath:', outputPath);

    if (!inputPath || !outputPath) {
      throw new Error(`경로가 설정되지 않음: inputPath=${inputPath}, outputPath=${outputPath}`);
    }

    try {
      await this.updateProgress(10, '이미지 분석 중...');
      console.log('[ImageConverter] Sharp 인스턴스 생성 중...');

      // Sharp 인스턴스 생성 (파일 경로 기반)
      let image = sharp(inputPath);
      console.log('[ImageConverter] Sharp 인스턴스 생성 완료');

      await this.updateProgress(30, '이미지 디코딩 중...');

      // 메타데이터 확인
      console.log('[ImageConverter] 메타데이터 읽기 중...');
      const metadata = await image.metadata();
      console.log(`[ImageConverter] 원본 이미지: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

      await this.updateProgress(50, '이미지 변환 중...');

      // 리사이즈 처리
      if (this.settings.resize && this.settings.resize !== 'none') {
        console.log('[ImageConverter] 리사이즈 적용 중...');
        image = this.applyResize(image, metadata, this.settings.resize);
      }

      await this.updateProgress(70, '이미지 인코딩 중...');

      // 형식별 변환 및 품질 설정
      console.log('[ImageConverter] 출력 형식 적용 중:', this.outputFormat);
      image = this.applyOutputFormat(image);
      console.log('[ImageConverter] 출력 형식 적용 완료');

      await this.updateProgress(90, '이미지 최적화 중...');

      // 파일로 저장
      console.log('[ImageConverter] 파일 저장 시작:', outputPath);
      const outputInfo = await image.toFile(outputPath);
      console.log('[ImageConverter] 파일 저장 완료:', outputInfo);

      await this.updateProgress(100, '이미지 변환 완료');

      console.log(`[ImageConverter] ========== 변환 완료: ${outputPath} ==========`);
    } catch (error) {
      console.error('[ImageConverter] ========== 변환 실패 ==========');
      console.error('[ImageConverter] 에러:', error);
      console.error('[ImageConverter] 스택:', error.stack);
      throw error;
    }
  }

  /**
   * 리사이즈 적용
   * @param {sharp.Sharp} image
   * @param {Object} metadata
   * @param {String} resizeOption
   */
  applyResize(image, metadata, resizeOption) {
    const percentMatch = resizeOption.match(/^(\d+)%$/);
    if (percentMatch) {
      const percent = parseInt(percentMatch[1]);
      const newWidth = Math.round(metadata.width * (percent / 100));
      const newHeight = Math.round(metadata.height * (percent / 100));
      console.log(`[ImageConverter] 리사이즈: ${metadata.width}x${metadata.height} → ${newWidth}x${newHeight} (${percent}%)`);
      return image.resize(newWidth, newHeight);
    }
    return image;
  }

  /**
   * 출력 형식 및 품질 적용
   * @param {sharp.Sharp} image
   */
  applyOutputFormat(image) {
    const quality = this.settings.quality || 85; // 기본 품질: 85

    switch (this.outputFormat) {
      case 'jpg':
      case 'jpeg':
        return image.jpeg({ quality, mozjpeg: true });

      case 'png':
        const compressionLevel = Math.round((100 - quality) / 10); // quality 85 → compression 1
        return image.png({
          compressionLevel: Math.max(0, Math.min(9, compressionLevel)),
          quality
        });

      case 'webp':
        return image.webp({ quality });

      case 'avif':
        return image.avif({ quality });

      case 'gif':
        return image.gif();

      case 'bmp':
        return image.bmp();

      case 'heic':
        return image.heif({ quality });

      default:
        // 형식 지정 없으면 Sharp가 자동 결정
        return image;
    }
  }

  validateSettings() {
    const errors = [];
    
    if (this.settings.quality && (this.settings.quality < 1 || this.settings.quality > 100)) {
      errors.push('품질은 1-100 사이의 값이어야 합니다');
    }
    
    if (this.settings.resize && !['none', '50%', '75%', '125%', '150%'].includes(this.settings.resize)) {
      errors.push('잘못된 리사이즈 옵션입니다');
    }
    
    if (this.settings.dpi && (this.settings.dpi < 72 || this.settings.dpi > 300)) {
      errors.push('DPI는 72-300 사이의 값이어야 합니다');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}