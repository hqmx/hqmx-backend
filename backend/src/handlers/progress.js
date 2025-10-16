/**
 * Progress Handler - 진행률 상태 조회 (JSON 응답)
 *
 * 폴링 방식으로 진행률 확인
 * 프론트엔드가 주기적으로 요청하여 상태 확인
 */

import conversionQueue from '../queue/conversion-queue.js';

/**
 * GET /api/progress/:jobId
 *
 * 현재 진행률 상태를 JSON으로 반환
 * 프론트엔드가 폴링 방식으로 호출
 */
function progressHandler(req, res) {
  const { jobId } = req.params;

  // Heartbeat 갱신 (클라이언트가 살아있음을 알림)
  conversionQueue.updateHeartbeat(jobId);

  // Job 존재 확인
  const job = conversionQueue.getJob(jobId);
  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
      message: `No conversion job found with ID: ${jobId}`
    });
  }

  // 현재 상태를 JSON으로 반환
  res.status(200).json({
    jobId,
    status: job.status,
    progress: job.progress || 0,
    message: job.message || '',
    ...(job.error && { error: job.error }),
    ...(job.status === 'completed' && {
      downloadUrl: `/api/download/${jobId}`
    })
  });
}

export { progressHandler };
