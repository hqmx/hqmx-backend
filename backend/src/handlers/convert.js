/**
 * Convert Handler - 파일 변환 요청 처리
 *
 * Express + multer 기반
 * ConversionQueue에 작업 추가 후 즉시 응답
 */

import path from 'path';
import { upload, handleUploadError } from '../middleware/upload.js';
import conversionQueue from '../queue/conversion-queue.js';
import { ConverterFactory } from '../utils/converter-factory.js';

const OUTPUT_DIR = process.env.OUTPUT_DIR || '/tmp/converter/outputs';

/**
 * POST /api/convert
 *
 * 요청 형식:
 * - multipart/form-data
 * - file: 업로드할 파일
 * - outputFormat: 출력 형식 (mp4, mp3, jpg 등)
 * - quality (optional): 품질 설정 JSON
 */
async function convertHandler(req, res, next) {
  // multer로 파일 업로드 처리
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }

    try {
      // 파일 업로드 확인
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please provide a file to convert'
        });
      }

      // outputFormat 확인
      const outputFormat = req.body.outputFormat;
      if (!outputFormat) {
        return res.status(400).json({
          error: 'Missing output format',
          message: 'Please specify the desired output format'
        });
      }

      // jobId는 multer middleware에서 생성됨
      const jobId = req.jobId;
      const inputPath = req.file.path;
      const originalFilename = req.file.originalname;
      const inputExt = path.extname(originalFilename).toLowerCase().substring(1);
      const outputExt = outputFormat.toLowerCase();

      // 출력 파일명: 원본 파일명(확장자 제외) + 타임스탬프 + 새 확장자
      // 예: "video.mp4" → "video_1234567890.avi"
      const baseFilename = path.basename(originalFilename, path.extname(originalFilename));
      const sanitizedBase = baseFilename.replace(/[^a-zA-Z0-9가-힣_-]/g, '_'); // 특수문자 제거
      const outputFilename = `${sanitizedBase}_${Date.now()}.${outputExt}`;
      const outputPath = path.join(OUTPUT_DIR, outputFilename);

      // 품질 설정 파싱 (옵션)
      let qualitySettings = {};
      if (req.body.quality) {
        try {
          qualitySettings = JSON.parse(req.body.quality);
        } catch (e) {
          console.warn('[Convert] Invalid quality JSON:', e.message);
        }
      }

      // 변환 작업 생성
      const job = {
        id: jobId,
        inputPath,
        outputPath,
        outputFilename,  // 다운로드 시 사용할 파일명
        originalFilename, // 원본 파일명
        inputFormat: inputExt,
        outputFormat: outputExt,
        execute: async () => {
          // ConverterFactory로 적절한 변환기 생성
          const settings = {
            ...qualitySettings,
            inputPath,
            outputPath,
            jobId,  // FFmpeg 프로세스 취소를 위해 필요
            conversionQueue  // FFmpeg 프로세스 등록을 위해 필요
          };
          const converter = ConverterFactory.createConverter(inputExt, outputExt, settings);

          if (!converter) {
            throw new Error(`Unsupported conversion: ${inputExt} → ${outputExt}`);
          }

          // 진행률 콜백 설정
          converter.setProgressCallback(({ progress, message }) => {
            conversionQueue.updateProgress(jobId, progress, message);
          });

          // 변환 실행
          await converter.convert();
        }
      };

      // 큐에 추가
      try {
        conversionQueue.addJob(job);
      } catch (err) {
        return res.status(503).json({
          error: 'Queue is full',
          message: 'Server is busy. Please try again later.',
          retryAfter: '5 minutes'
        });
      }

      // 즉시 응답
      res.status(202).json({
        jobId,
        status: 'pending',
        message: 'Conversion job queued successfully',
        progressUrl: `/api/progress/${jobId}`,
        downloadUrl: `/api/download/${jobId}`,
        file: {
          original: req.file.originalname,
          size: req.file.size,
          inputFormat: inputExt,
          outputFormat: outputExt
        }
      });

    } catch (err) {
      console.error('[Convert] Error:', err);
      res.status(500).json({
        error: 'Conversion failed',
        message: err.message
      });
    }
  });
}

export { convertHandler };
