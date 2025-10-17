/**
 * Download Handler - 변환된 파일 다운로드
 *
 * 완료된 변환 결과 파일을 다운로드
 */

import path from 'path';
import fs from 'fs/promises';
import * as fsSync from 'fs';
import conversionQueue from '../queue/conversion-queue.js';

const OUTPUT_DIR = process.env.OUTPUT_DIR || '/tmp/converter/outputs';

/**
 * GET /api/download/:jobId
 *
 * 변환 완료된 파일 다운로드
 */
async function downloadHandler(req, res) {
  const { jobId } = req.params;

  try {
    // Job 상태 확인
    const job = conversionQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        message: `No conversion job found with ID: ${jobId}`
      });
    }

    // 완료 상태 확인
    if (job.status !== 'completed') {
      return res.status(400).json({
        error: 'Conversion not completed',
        message: `Job status is: ${job.status}`,
        status: job.status,
        progress: job.progress
      });
    }

    // 출력 파일 경로
    const outputPath = job.outputPath;

    // 파일 존재 확인
    try {
      await fs.access(outputPath);
    } catch (err) {
      return res.status(404).json({
        error: 'File not found',
        message: 'Converted file has been deleted or expired'
      });
    }

    // 파일 정보
    const stats = await fs.stat(outputPath);

    // 다운로드 파일명: job에 저장된 outputFilename 사용 (원본 파일명 기반)
    const filename = job.outputFilename || path.basename(outputPath);

    // 다운로드 응답
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', stats.size);

    // 파일 스트리밍
    const fileStream = fsSync.createReadStream(outputPath);
    fileStream.pipe(res);

    fileStream.on('end', () => {
      console.log(`[Download] File downloaded: ${jobId}`);
    });

    fileStream.on('error', (err) => {
      console.error(`[Download] Stream error for ${jobId}:`, err);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Download failed',
          message: err.message
        });
      }
    });

  } catch (err) {
    console.error('[Download] Error:', err);
    res.status(500).json({
      error: 'Download failed',
      message: err.message
    });
  }
}

export { downloadHandler };
