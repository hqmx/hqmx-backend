import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BaseConverter } from './base-converter.js';

/**
 * LibreOffice 기반 문서 변환기
 * DOC, DOCX, XLSX, XLS, PPTX, PPT → PDF 변환 지원
 */
export class LibreOfficeConverter extends BaseConverter {
  constructor(inputFormat, outputFormat, settings = {}) {
    super(inputFormat, outputFormat, settings);
    this.supportedFormats = ['doc', 'docx', 'xlsx', 'xls', 'pptx', 'ppt', 'pdf'];
    this.tempDir = process.env.UPLOAD_DIR || '/tmp/converter/uploads';
  }

  isSupported() {
    // 문서 형식 → PDF만 지원
    const inputFormats = ['doc', 'docx', 'xlsx', 'xls', 'pptx', 'ppt'];
    return inputFormats.includes(this.inputFormat) && this.outputFormat === 'pdf';
  }

  async convert(inputData) {
    if (!this.isSupported()) {
      throw new Error(`지원되지 않는 변환: ${this.inputFormat} → ${this.outputFormat}`);
    }

    const jobId = uuidv4();
    const inputPath = path.join(this.tempDir, `${jobId}.${this.inputFormat}`);
    const outputPath = path.join(this.tempDir, `${jobId}.pdf`);

    try {
      await this.updateProgress(10, '입력 파일 저장 중...');

      // 입력 파일 저장
      await fs.writeFile(inputPath, Buffer.from(inputData));

      await this.updateProgress(30, 'LibreOffice로 변환 중...');

      // LibreOffice로 변환
      await this.convertWithLibreOffice(inputPath, this.tempDir);

      await this.updateProgress(80, '변환 완료, 파일 읽는 중...');

      // 출력 파일 읽기
      const outputData = await fs.readFile(outputPath);

      await this.updateProgress(100, '변환 완료');

      // 임시 파일 정리
      await this.cleanup(inputPath, outputPath);

      return outputData.buffer;

    } catch (error) {
      // 에러 발생 시 임시 파일 정리
      await this.cleanup(inputPath, outputPath).catch(() => {});
      throw error;
    }
  }

  /**
   * LibreOffice를 사용하여 문서를 PDF로 변환
   * @param {string} inputPath - 입력 파일 경로
   * @param {string} outputDir - 출력 디렉토리
   * @returns {Promise<void>}
   */
  async convertWithLibreOffice(inputPath, outputDir) {
    return new Promise((resolve, reject) => {
      // LibreOffice 명령어 (headless 모드로 PDF 변환)
      const args = [
        '--headless',
        '--convert-to', 'pdf',
        '--outdir', outputDir,
        inputPath
      ];

      console.log(`[LibreOffice] 명령어: libreoffice ${args.join(' ')}`);

      const process = spawn('libreoffice', args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(`[LibreOffice stdout] ${data.toString().trim()}`);
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(`[LibreOffice stderr] ${data.toString().trim()}`);
      });

      // 60초 타임아웃
      const timeout = setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error('LibreOffice 변환 시간 초과 (60초)'));
      }, 60000);

      process.on('close', (code) => {
        clearTimeout(timeout);

        if (code === 0) {
          console.log('[LibreOffice] 변환 성공');
          resolve();
        } else {
          console.error(`[LibreOffice] 변환 실패 (exit code: ${code})`);
          console.error(`[LibreOffice] stderr: ${stderr}`);
          reject(new Error(`LibreOffice 변환 실패 (exit code: ${code})\n${stderr}`));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        console.error('[LibreOffice] 프로세스 실행 오류:', error);
        reject(new Error(`LibreOffice 실행 실패: ${error.message}`));
      });
    });
  }

  /**
   * 임시 파일 정리
   * @param {...string} paths - 삭제할 파일 경로들
   */
  async cleanup(...paths) {
    for (const filePath of paths) {
      try {
        await fs.unlink(filePath);
        console.log(`[Cleanup] 삭제됨: ${filePath}`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn(`[Cleanup] 삭제 실패: ${filePath}`, error.message);
        }
      }
    }
  }

  validateSettings() {
    const errors = [];

    // LibreOffice 변환은 특별한 설정 검증 불필요
    // 필요 시 추가

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
