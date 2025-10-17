import { ImageConverter } from './converters/image-converter.js';
import { VideoConverter } from './converters/video-converter.js';
import { AudioConverter } from './converters/audio-converter.js';
// import { DocumentConverter } from './converters/document-converter.js'; // Workers only (OffscreenCanvas)
import { LibreOfficeConverter } from './converters/libreoffice-converter.js';
import { ImageMagickConverter } from './converters/imagemagick-converter.js';
import { getFormatInfo } from './formats.js';
import fs from 'fs/promises';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

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
          // 오피스 문서 → PDF 변환 (LibreOffice 사용)
          const officeFormats = ['doc', 'docx', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'rtf', 'odt', 'ods', 'odp'];
          if (officeFormats.includes(inputFormat) && outputFormat === 'pdf') {
            return new LibreOfficeConverter(inputFormat, outputFormat, settings);
          }
          // PDF끼리 변환은 없으므로 null
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

    // 비디오를 GIF로 변환 (FFmpeg)
    if (inputInfo.category === 'video' && outputInfo.extension === 'gif') {
      return new VideoToGifConverter(inputInfo.extension, outputInfo.extension, settings);
    }

    // GIF를 비디오로 변환 (FFmpeg)
    if (inputInfo.extension === 'gif' && outputInfo.category === 'video') {
      return new GifToVideoConverter(inputInfo.extension, outputInfo.extension, settings);
    }

    // 이미지를 PDF로 변환 (ImageMagick)
    if (inputInfo.category === 'image' && outputInfo.category === 'document') {
      return new ImageMagickConverter(inputInfo.extension, outputInfo.extension, settings);
    }

    // PDF를 이미지로 변환 (ImageMagick)
    if (inputInfo.category === 'document' && outputInfo.category === 'image') {
      return new ImageMagickConverter(inputInfo.extension, outputInfo.extension, settings);
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
    const videoFormats = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', 'm4v'];
    const audioFormats = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus'];

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

  async convert() {
    // Get paths from settings (set by convert.js)
    const inputPath = this.settings.inputPath;
    const outputPath = this.settings.outputPath;

    if (!inputPath || !outputPath) {
      throw new Error('inputPath와 outputPath가 설정되지 않았습니다');
    }

    try {
      await this.updateProgress(5, 'Initializing FFmpeg...');
      await this.updateProgress(15, 'Analyzing video...');

      // Create output directory
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // Extract audio using FFmpeg
      await this.extractAudioWithFFmpeg(inputPath, outputPath);

      await this.updateProgress(100, 'Audio extraction complete');

      console.log(`[VideoToAudioConverter] 변환 완료: ${inputPath} → ${outputPath}`);
    } catch (err) {
      console.error('[VideoToAudioConverter] 변환 실패:', err);
      throw err;
    } finally {
      // Clean up input file (multer uploaded temporary file)
      try {
        await fs.unlink(inputPath).catch(() => {});
      } catch (err) {
        console.error('[VideoToAudioConverter] 임시 파일 정리 실패:', err);
      }
    }
  }

  /**
   * FFmpeg로 오디오 추출
   * @param {String} inputPath
   * @param {String} outputPath
   * @returns {Promise<void>}
   */
  async extractAudioWithFFmpeg(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      // FFmpeg process registration for cancellation
      if (this.settings.jobId && this.settings.conversionQueue) {
        this.settings.conversionQueue.setFFmpegProcess(this.settings.jobId, command);
        console.log(`[VideoToAudioConverter] FFmpeg process registered for job ${this.settings.jobId}`);
      }

      // Audio extraction: remove video stream (-vn), keep audio only
      command = command.noVideo();

      // Output format (use AudioConverter.FORMAT_MAP)
      const ffmpegFormat = AudioConverter.FORMAT_MAP[this.outputFormat] || this.outputFormat;
      console.log(`[VideoToAudioConverter] 출력 형식: ${this.outputFormat} → FFmpeg 포맷: ${ffmpegFormat}`);
      command = command.toFormat(ffmpegFormat);

      // Audio quality settings
      if (this.settings.quality) {
        const qualityMap = { high: 0, medium: 2, low: 4 };
        const q = qualityMap[this.settings.quality] || 2;
        command = command.audioQuality(q);
      }

      // Bitrate settings
      if (this.settings.bitrate) {
        command = command.audioBitrate(this.settings.bitrate);
      }

      // Sample rate settings
      if (this.settings.sampleRate) {
        command = command.audioFrequency(parseInt(this.settings.sampleRate));
      }

      // Progress callback
      command.on('progress', (progress) => {
        console.log('[VideoToAudioConverter] FFmpeg progress event:', JSON.stringify(progress));
        if (progress.percent) {
          const percent = Math.min(90, Math.max(30, Math.round(progress.percent)));
          console.log(`[VideoToAudioConverter] Updating progress: ${percent}%`);
          this.updateProgress(percent, `Extracting audio... ${percent}%`).catch(() => {});
        } else if (progress.timemark) {
          console.log(`[VideoToAudioConverter] FFmpeg timemark: ${progress.timemark}`);
          this.updateProgress(50, `Extracting audio... ${progress.timemark}`).catch(() => {});
        }
      });

      // Error handling
      command.on('error', (err) => {
        console.error('[VideoToAudioConverter] FFmpeg 에러:', err.message);
        reject(new Error(`Audio extraction failed: ${err.message}`));
      });

      // Completion handling
      command.on('end', async () => {
        try {
          const stats = await fs.stat(outputPath);
          console.log(`[VideoToAudioConverter] 변환 완료: ${stats.size} bytes → ${outputPath}`);
          resolve();
        } catch (err) {
          reject(new Error(`출력 파일 확인 실패: ${err.message}`));
        }
      });

      // Start conversion
      command.save(outputPath);
    });
  }
}

/**
 * 비디오를 GIF로 변환하는 변환기
 */
class VideoToGifConverter extends VideoConverter {
  constructor(inputFormat, outputFormat, settings = {}) {
    super(inputFormat, outputFormat, settings);
    this.outputCategory = 'image';
  }

  isSupported() {
    const videoFormats = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', 'm4v'];
    return videoFormats.includes(this.inputFormat) && this.outputFormat === 'gif';
  }

  async convert() {
    const inputPath = this.settings.inputPath;
    const outputPath = this.settings.outputPath;

    if (!inputPath || !outputPath) {
      throw new Error('inputPath와 outputPath가 설정되지 않았습니다');
    }

    try {
      await this.updateProgress(5, 'Initializing FFmpeg...');
      await this.updateProgress(15, 'Analyzing video...');

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await this.convertToGifWithFFmpeg(inputPath, outputPath);
      await this.updateProgress(100, 'GIF conversion complete');

      console.log(`[VideoToGifConverter] 변환 완료: ${inputPath} → ${outputPath}`);
    } catch (err) {
      console.error('[VideoToGifConverter] 변환 실패:', err);
      throw err;
    } finally {
      try {
        await fs.unlink(inputPath).catch(() => {});
      } catch (err) {
        console.error('[VideoToGifConverter] 임시 파일 정리 실패:', err);
      }
    }
  }

  async convertToGifWithFFmpeg(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      if (this.settings.jobId && this.settings.conversionQueue) {
        this.settings.conversionQueue.setFFmpegProcess(this.settings.jobId, command);
        console.log(`[VideoToGifConverter] FFmpeg process registered for job ${this.settings.jobId}`);
      }

      // GIF 변환 설정
      command = command.toFormat('gif');

      // FPS 설정 (기본 10fps)
      const fps = this.settings.fps || 10;
      command = command.fps(fps);

      // 크기 조정 (기본 480px 너비, 비율 유지)
      const width = this.settings.width || 480;
      command = command.size(`${width}x?`);

      // 진행률 콜백
      command.on('progress', (progress) => {
        if (progress.percent) {
          const percent = Math.min(90, Math.max(30, Math.round(progress.percent)));
          this.updateProgress(percent, `Converting to GIF... ${percent}%`).catch(() => {});
        }
      });

      command.on('error', (err) => {
        console.error('[VideoToGifConverter] FFmpeg 에러:', err.message);
        reject(new Error(`GIF conversion failed: ${err.message}`));
      });

      command.on('end', async () => {
        try {
          const stats = await fs.stat(outputPath);
          console.log(`[VideoToGifConverter] 변환 완료: ${stats.size} bytes → ${outputPath}`);
          resolve();
        } catch (err) {
          reject(new Error(`출력 파일 확인 실패: ${err.message}`));
        }
      });

      command.save(outputPath);
    });
  }
}

/**
 * GIF를 비디오로 변환하는 변환기
 */
class GifToVideoConverter extends VideoConverter {
  constructor(inputFormat, outputFormat, settings = {}) {
    super(inputFormat, outputFormat, settings);
    this.inputCategory = 'image';
  }

  isSupported() {
    const videoFormats = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', 'm4v'];
    return this.inputFormat === 'gif' && videoFormats.includes(this.outputFormat);
  }

  async convert() {
    const inputPath = this.settings.inputPath;
    const outputPath = this.settings.outputPath;

    if (!inputPath || !outputPath) {
      throw new Error('inputPath와 outputPath가 설정되지 않았습니다');
    }

    try {
      await this.updateProgress(5, 'Initializing FFmpeg...');
      await this.updateProgress(15, 'Analyzing GIF...');

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await this.convertGifToVideoWithFFmpeg(inputPath, outputPath);
      await this.updateProgress(100, 'Video conversion complete');

      console.log(`[GifToVideoConverter] 변환 완료: ${inputPath} → ${outputPath}`);
    } catch (err) {
      console.error('[GifToVideoConverter] 변환 실패:', err);
      throw err;
    } finally {
      try {
        await fs.unlink(inputPath).catch(() => {});
      } catch (err) {
        console.error('[GifToVideoConverter] 임시 파일 정리 실패:', err);
      }
    }
  }

  async convertGifToVideoWithFFmpeg(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      if (this.settings.jobId && this.settings.conversionQueue) {
        this.settings.conversionQueue.setFFmpegProcess(this.settings.jobId, command);
        console.log(`[GifToVideoConverter] FFmpeg process registered for job ${this.settings.jobId}`);
      }

      // 출력 형식 설정
      const ffmpegFormat = VideoConverter.FORMAT_MAP[this.outputFormat] || this.outputFormat;
      command = command.toFormat(ffmpegFormat);

      // 비디오 코덱 설정
      if (this.outputFormat === 'mp4' || this.outputFormat === 'm4v') {
        command = command.videoCodec('libx264').outputOptions(['-pix_fmt yuv420p']);
      } else if (this.outputFormat === 'webm') {
        command = command.videoCodec('libvpx');
      }

      // 품질 설정
      if (this.settings.quality) {
        const qualityMap = { high: 18, medium: 23, low: 28 };
        const crf = qualityMap[this.settings.quality] || 23;
        command = command.outputOptions([`-crf ${crf}`]);
      }

      // 진행률 콜백
      command.on('progress', (progress) => {
        if (progress.percent) {
          const percent = Math.min(90, Math.max(30, Math.round(progress.percent)));
          this.updateProgress(percent, `Converting to video... ${percent}%`).catch(() => {});
        }
      });

      command.on('error', (err) => {
        console.error('[GifToVideoConverter] FFmpeg 에러:', err.message);
        reject(new Error(`Video conversion failed: ${err.message}`));
      });

      command.on('end', async () => {
        try {
          const stats = await fs.stat(outputPath);
          console.log(`[GifToVideoConverter] 변환 완료: ${stats.size} bytes → ${outputPath}`);
          resolve();
        } catch (err) {
          reject(new Error(`출력 파일 확인 실패: ${err.message}`));
        }
      });

      command.save(outputPath);
    });
  }
}