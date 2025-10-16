import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { BaseConverter } from './base-converter.js';

/**
 * ImageMagick 기반 이미지/PDF 변환기
 * 이미지 ↔ PDF 변환 지원
 */
export class ImageMagickConverter extends BaseConverter {
  constructor(inputFormat, outputFormat, settings = {}) {
    super(inputFormat, outputFormat, settings);
    this.imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg', 'ico'];
    this.inputPath = settings.inputPath;
    this.outputPath = settings.outputPath;
  }

  isSupported() {
    // 이미지 → PDF
    if (this.imageFormats.includes(this.inputFormat) && this.outputFormat === 'pdf') {
      return true;
    }

    // PDF → 이미지
    if (this.inputFormat === 'pdf' && this.imageFormats.includes(this.outputFormat)) {
      return true;
    }

    return false;
  }

  async convert() {
    if (!this.isSupported()) {
      throw new Error(`지원되지 않는 변환: ${this.inputFormat} → ${this.outputFormat}`);
    }

    if (!this.inputPath || !this.outputPath) {
      throw new Error('inputPath와 outputPath가 필요합니다');
    }

    try {
      await this.updateProgress(10, 'ImageMagick 변환 준비 중...');

      // 출력 디렉토리 생성
      await fs.mkdir(path.dirname(this.outputPath), { recursive: true });

      // ImageMagick으로 변환
      await this.convertWithImageMagick(this.inputPath, this.outputPath);

      await this.updateProgress(100, '변환 완료');

      console.log(`[ImageMagick] 변환 완료: ${this.inputPath} → ${this.outputPath}`);

    } catch (error) {
      console.error('[ImageMagick] 변환 실패:', error);
      throw error;
    } finally {
      // 입력 파일 정리 (multer가 업로드한 임시 파일)
      try {
        await fs.unlink(this.inputPath).catch(() => {});
      } catch (err) {
        console.error('[ImageMagick] 임시 파일 정리 실패:', err);
      }
    }
  }

  /**
   * ImageMagick convert 명령어로 변환
   * @param {string} inputPath - 입력 파일 경로
   * @param {string} outputPath - 출력 파일 경로
   * @returns {Promise<void>}
   */
  async convertWithImageMagick(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      const args = [];

      // 입력 파일
      args.push(inputPath);

      // 품질 설정
      if (this.settings.quality) {
        const quality = Math.round(this.settings.quality * 100);
        args.push('-quality', quality.toString());
      } else {
        args.push('-quality', '92'); // 기본 품질
      }

      // PDF → 이미지: 첫 페이지만
      if (this.inputFormat === 'pdf') {
        args.unshift(inputPath + '[0]'); // 첫 페이지만
        args.shift(); // 중복 제거
        args.push('-density', '300'); // 300 DPI
      }

      // 이미지 → PDF: 페이지 크기 자동 조정
      if (this.outputFormat === 'pdf') {
        args.push('-page', 'A4');
      }

      // 출력 파일
      args.push(outputPath);

      console.log(`[ImageMagick] 명령어: convert ${args.join(' ')}`);

      const process = spawn('convert', args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(`[ImageMagick stdout] ${data.toString().trim()}`);
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(`[ImageMagick stderr] ${data.toString().trim()}`);
      });

      // 60초 타임아웃
      const timeout = setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error('ImageMagick 변환 시간 초과 (60초)'));
      }, 60000);

      // 진행률 업데이트 (모의)
      const progressInterval = setInterval(() => {
        const currentProgress = Math.min(90, Math.random() * 30 + 30);
        this.updateProgress(currentProgress, '변환 진행 중...').catch(() => {});
      }, 2000);

      process.on('close', (code) => {
        clearTimeout(timeout);
        clearInterval(progressInterval);

        if (code === 0) {
          console.log('[ImageMagick] 변환 성공');
          resolve();
        } else {
          console.error(`[ImageMagick] 변환 실패 (exit code: ${code})`);
          console.error(`[ImageMagick] stderr: ${stderr}`);
          reject(new Error(`ImageMagick 변환 실패 (exit code: ${code})\n${stderr}`));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        clearInterval(progressInterval);
        console.error('[ImageMagick] 프로세스 실행 오류:', error);
        reject(new Error(`ImageMagick 실행 실패: ${error.message}`));
      });
    });
  }

  validateSettings() {
    const errors = [];

    if (this.settings.quality && (this.settings.quality < 0.1 || this.settings.quality > 1.0)) {
      errors.push('품질은 0.1-1.0 사이의 값이어야 합니다');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
