/**
 * Cancel Handler - 작업 취소
 *
 * 클라이언트가 페이지를 떠나거나 명시적으로 취소 요청 시
 * 진행 중인 변환 작업을 중단하고 리소스 정리
 */

import conversionQueue from '../queue/conversion-queue.js';

/**
 * POST /api/cancel/:jobId
 *
 * 변환 작업 취소 요청 처리
 * - pending: 큐에서 제거
 * - processing: FFmpeg 프로세스 종료 + 파일 삭제
 * - completed/failed: 무시 (이미 완료된 작업)
 */
async function cancelHandler(req, res) {
  const { jobId } = req.params;

  console.log(`[Cancel] Received cancel request for job ${jobId}`);

  // 작업 취소 시도
  const success = await conversionQueue.cancelJob(jobId, 'Cancelled by user');

  if (success) {
    res.status(200).json({
      success: true,
      message: `Job ${jobId} cancelled successfully`
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Job not found',
      message: `No conversion job found with ID: ${jobId}`
    });
  }
}

export { cancelHandler };
