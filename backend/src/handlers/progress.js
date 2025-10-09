/**
 * Progress Handler - SSE로 실시간 진행률 스트리밍
 *
 * Server-Sent Events (SSE) 사용
 * 0.5초마다 진행률 업데이트 전송
 */

import conversionQueue from '../queue/conversion-queue.js';

/**
 * GET /api/progress/:jobId
 *
 * SSE 스트리밍으로 진행률 전송
 * 완료 또는 실패 시 연결 종료
 */
function progressHandler(req, res) {
  const { jobId } = req.params;

  // Job 존재 확인
  const job = conversionQueue.getJob(jobId);
  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
      message: `No conversion job found with ID: ${jobId}`
    });
  }

  // SSE 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // nginx buffering 방지

  // 즉시 플러시
  res.flushHeaders();

  // 초기 연결 확인 메시지
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    jobId,
    message: 'Progress stream connected'
  })}\n\n`);

  // 진행률 업데이트 인터벌
  const intervalId = setInterval(() => {
    const job = conversionQueue.getJob(jobId);

    if (!job) {
      // Job이 메모리에서 삭제됨
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: 'Job expired or not found'
      })}\n\n`);
      clearInterval(intervalId);
      res.end();
      return;
    }

    // 진행률 데이터 전송
    res.write(`data: ${JSON.stringify({
      type: 'progress',
      jobId,
      status: job.status,
      progress: job.progress,
      message: job.message,
      ...(job.error && { error: job.error })
    })}\n\n`);

    // 완료 또는 실패 시 종료
    if (job.status === 'completed' || job.status === 'failed') {
      clearInterval(intervalId);

      // 최종 메시지
      res.write(`data: ${JSON.stringify({
        type: 'done',
        jobId,
        status: job.status,
        ...(job.status === 'completed' && {
          downloadUrl: `/api/download/${jobId}`
        }),
        ...(job.error && { error: job.error })
      })}\n\n`);

      res.end();
    }
  }, 500); // 0.5초마다 업데이트

  // 클라이언트 연결 종료 처리
  req.on('close', () => {
    clearInterval(intervalId);
    console.log(`[Progress] Client disconnected from job ${jobId}`);
  });

  // 타임아웃 (10분)
  const timeoutId = setTimeout(() => {
    clearInterval(intervalId);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: 'Connection timeout'
    })}\n\n`);
    res.end();
  }, 10 * 60 * 1000);

  // 인터벌 종료 시 타임아웃도 정리
  req.on('close', () => {
    clearTimeout(timeoutId);
  });
}

export default progressHandler;
