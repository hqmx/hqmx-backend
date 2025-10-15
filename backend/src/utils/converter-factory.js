import { ImageConverter } from './converters/image-converter.js';
import { VideoConverter } from './converters/video-converter.js';
import { AudioConverter } from './converters/audio-converter.js';
import { DocumentConverter } from './converters/document-converter.js';
import { LibreOfficeConverter } from './converters/libreoffice-converter.js';
import { getFormatInfo } from './formats.js';

/**
 * 변환기 팩토리 - 형식에 따라 적절한 변환기 반환
 */
export class ConverterFactory {
  /**
   * 형식에 맞는 변환기 생성
   * @param {string} inputFormat - 입력 형식
   * @param {string} outputFormat - 출력 형식
   * @param {Object} settings - 변환 설정
   * @returns {BaseConverter|null}
   */
  static createConverter(inputFormat, outputFormat, settings = {}) {
    const inputInfo = getFormatInfo(inputFormat);
    const outputInfo = getFormatInfo(outputFormat);
    
    if (!inputInfo || !outputInfo) {
      return null;
    }
    
    // 같은 카테고리 내 변환
    if (inputInfo.category === outputInfo.category) {
      switch (inputInfo.category) {
        case 'image':
          return new ImageConverter(inputFormat, outputFormat, settings);
        case 'video':
          return new VideoConverter(inputFormat, outputFormat, settings);
        case 'audio':
          return new AudioConverter(inputFormat, outputFormat, settings);
        case 'document':
          // TODO: DocumentConverter 구현
          return null;
        case 'archive':
          // TODO: ArchiveConverter 구현
          return null;
        default:
          return null;
      }
    }
    
    // 크로스 카테고리 변환
    return this.createCrossConverter(inputInfo, outputInfo, settings);
  }

  /**
   * 크로스 카테고리 변환기 생성
   * @param {Object} inputInfo - 입력 형식 정보
   * @param {Object} outputInfo - 출력 형식 정보
   * @param {Object} settings - 변환 설정
   * @returns {BaseConverter|null}
   */
  static createCrossConverter(inputInfo, outputInfo, settings) {
    // 비디오에서 오디오 추출
    if (inputInfo.category === 'video' && outputInfo.category === 'audio') {
      return new VideoToAudioConverter(inputInfo.extension, outputInfo.extension, settings);
    }

    // 문서 → PDF (DOC, DOCX, XLSX, XLS, PPTX, PPT)
    const officeFormats = ['doc', 'docx', 'xlsx', 'xls', 'pptx', 'ppt'];
    if (officeFormats.includes(inputInfo.extension) && outputInfo.extension === 'pdf') {
      return new LibreOfficeConverter(inputInfo.extension, outputInfo.extension, settings);
    }

    // 이미지를 PDF로 변환
    if (inputInfo.category === 'image' && outputInfo.category === 'document') {
      return new DocumentConverter(inputInfo.extension, outputInfo.extension, settings);
    }

    // PDF를 이미지로 변환
    if (inputInfo.category === 'document' && outputInfo.category === 'image') {
      return new DocumentConverter(inputInfo.extension, outputInfo.extension, settings);
    }

    return null;
  }

  /**
   * 지원되는 변환인지 확인
   * @param {string} inputFormat - 입력 형식
   * @param {string} outputFormat - 출력 형식
   * @returns {boolean}
   */
  static isConversionSupported(inputFormat, outputFormat) {
    const converter = this.createConverter(inputFormat, outputFormat);
    return converter && converter.isSupported();
  }

  /**
   * 변환 설정 검증
   * @param {string} inputFormat - 입력 형식
   * @param {string} outputFormat - 출력 형식
   * @param {Object} settings - 변환 설정
   * @returns {Object} 검증 결과
   */
  static validateConversionSettings(inputFormat, outputFormat, settings) {
    const converter = this.createConverter(inputFormat, outputFormat, settings);
    
    if (!converter) {
      return {
        valid: false,
        errors: ['지원되지 않는 변환입니다']
      };
    }
    
    return converter.validateSettings();
  }
}

/**
 * 비디오에서 오디오 추출 변환기
 */
class VideoToAudioConverter extends VideoConverter {
  constructor(inputFormat, outputFormat, settings = {}) {
    super(inputFormat, outputFormat, settings);
    this.outputCategory = 'audio';
  }

  isSupported() {
    const videoFormats = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'];
    const audioFormats = ['mp3', 'wav', 'flac', 'aac', 'ogg'];
    
    return videoFormats.includes(this.inputFormat) && 
           audioFormats.includes(this.outputFormat);
  }

  buildFFmpegCommand() {
    const command = ['-i', 'input.' + this.inputFormat];
    
    // 비디오 스트림 제거, 오디오만 추출
    command.push('-vn');
    
    // 오디오 설정
    if (this.settings.bitrate) {
      command.push('-b:a', this.settings.bitrate + 'k');
    }
    
    if (this.settings.sampleRate) {
      command.push('-ar', this.settings.sampleRate);
    }
    
    command.push('output.' + this.outputFormat);
    
    return command;
  }

  async convert(inputData) {
    await this.updateProgress(10, '비디오 분석 중...');
    await this.updateProgress(30, '오디오 스트림 추출 중...');
    await this.updateProgress(60, '오디오 변환 중...');
    
    const result = await this.simulateVideoConversion(inputData);
    
    await this.updateProgress(100, '오디오 추출 완료');
    
    return result;
  }
}