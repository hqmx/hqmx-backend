import { BaseConverter } from './base-converter.js';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

/**
 * 문서 변환기 (PDF 생성 및 조작)
 * Cloudflare Workers에서 실행 가능한 Pure JavaScript 구현
 */
export class DocumentConverter extends BaseConverter {
  constructor(inputFormat, outputFormat, settings = {}) {
    super(inputFormat, outputFormat, settings);
    this.supportedFormats = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
  }

  isSupported() {
    // 이미지 → PDF
    if (['jpg', 'jpeg', 'png', 'webp'].includes(this.inputFormat) &&
        this.outputFormat === 'pdf') {
      return true;
    }

    // PDF → 이미지
    if (this.inputFormat === 'pdf' &&
        ['jpg', 'jpeg', 'png'].includes(this.outputFormat)) {
      return true;
    }

    return false;
  }

  async convert(inputData) {
    // 이미지 → PDF
    if (['jpg', 'jpeg', 'png', 'webp'].includes(this.inputFormat)) {
      return await this.imageToPDF(inputData);
    }

    // PDF → 이미지
    if (this.inputFormat === 'pdf') {
      return await this.pdfToImage(inputData);
    }

    throw new Error('지원되지 않는 변환입니다');
  }

  /**
   * 이미지를 PDF로 변환
   * @param {ArrayBuffer} imageData
   * @returns {Promise<ArrayBuffer>}
   */
  async imageToPDF(imageData) {
    await this.updateProgress(10, 'PDF 문서 생성 중...');

    try {
      // PDF 문서 생성
      const pdfDoc = await PDFDocument.create();

      await this.updateProgress(30, '이미지 처리 중...');

      // 이미지 타입에 따라 임베드
      let image;
      if (this.inputFormat === 'jpg' || this.inputFormat === 'jpeg') {
        image = await pdfDoc.embedJpg(imageData);
      } else if (this.inputFormat === 'png') {
        image = await pdfDoc.embedPng(imageData);
      } else {
        throw new Error(`${this.inputFormat} 형식은 아직 지원되지 않습니다`);
      }

      await this.updateProgress(50, 'PDF 페이지 구성 중...');

      // 이미지 크기에 맞는 페이지 생성
      const { width, height } = image.scale(1);
      const page = pdfDoc.addPage([width, height]);

      await this.updateProgress(70, '이미지 삽입 중...');

      // 페이지에 이미지 그리기
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height,
      });

      await this.updateProgress(90, 'PDF 파일 생성 중...');

      // PDF 저장
      const pdfBytes = await pdfDoc.save();

      await this.updateProgress(100, 'PDF 변환 완료');

      return pdfBytes.buffer;

    } catch (error) {
      console.error('이미지 → PDF 변환 오류:', error);
      throw new Error(`이미지 → PDF 변환 실패: ${error.message}`);
    }
  }

  /**
   * PDF를 이미지로 변환 (첫 페이지만)
   * @param {ArrayBuffer} pdfData
   * @returns {Promise<ArrayBuffer>}
   */
  async pdfToImage(pdfData) {
    await this.updateProgress(10, 'PDF 로딩 중...');

    try {
      // PDF.js 로딩
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfData) });
      const pdf = await loadingTask.promise;

      await this.updateProgress(30, 'PDF 페이지 렌더링 중...');

      // 첫 번째 페이지 가져오기
      const page = await pdf.getPage(1);

      // 해상도 설정 (DPI)
      const scale = this.settings.scale || 2.0;
      const viewport = page.getViewport({ scale });

      await this.updateProgress(50, '캔버스 생성 중...');

      // Canvas 생성 (Cloudflare Workers에서는 OffscreenCanvas 사용)
      const canvas = new OffscreenCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      await this.updateProgress(70, '페이지 렌더링 중...');

      // 렌더링
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      await this.updateProgress(90, '이미지 생성 중...');

      // 이미지로 변환
      const blob = await canvas.convertToBlob({
        type: `image/${this.outputFormat}`,
        quality: this.settings.quality || 0.92
      });

      const arrayBuffer = await blob.arrayBuffer();

      await this.updateProgress(100, 'PDF → 이미지 변환 완료');

      return arrayBuffer;

    } catch (error) {
      console.error('PDF → 이미지 변환 오류:', error);
      throw new Error(`PDF → 이미지 변환 실패: ${error.message}`);
    }
  }

  validateSettings() {
    const errors = [];

    if (this.settings.quality && (this.settings.quality < 0.1 || this.settings.quality > 1.0)) {
      errors.push('품질은 0.1-1.0 사이의 값이어야 합니다');
    }

    if (this.settings.scale && (this.settings.scale < 0.5 || this.settings.scale > 4.0)) {
      errors.push('스케일은 0.5-4.0 사이의 값이어야 합니다');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
