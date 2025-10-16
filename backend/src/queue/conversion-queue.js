/**
 * ConversionQueue - 변환 작업 큐 관리 시스템
 *
 * maxConcurrency 설정에 따라 동시 변환 처리 가능
 * - t3.small (2GB RAM): maxConcurrency = 1 (안전)
 * - t3.medium (4GB RAM): maxConcurrency = 2 (권장)
 * FIFO (First In First Out) 방식으로 순차 처리
 */

import { promises as fs } from 'fs';

export class ConversionQueue {
  constructor(maxQueueSize = 10, maxConcurrency = 1) {
    this.maxQueueSize = maxQueueSize;
    this.maxConcurrency = maxConcurrency;
    this.queue = [];
    this.processingJobs = new Set(); // 현재 처리 중인 작업 ID 집합
    this.jobs = new Map(); // jobId → job state
    this.lastAccessTime = new Map(); // jobId → timestamp (heartbeat)
    this.ffmpegProcesses = new Map(); // jobId → FFmpeg process reference

    // Heartbeat 체크 타이머 (10초마다)
    this.heartbeatInterval = setInterval(() => this.checkHeartbeat(), 10000);
    console.log(`[Queue] Initialized - maxConcurrency: ${this.maxConcurrency}, heartbeat monitoring started (10s interval)`);
  }

  /**
   * 새 작업을 큐에 추가
   */
  addJob(job) {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Queue is full. Please try again later.');
    }

    // Job 상태 초기화
    this.jobs.set(job.id, {
      status: 'pending',
      progress: 0,
      message: 'Waiting in queue...',
      inputPath: job.inputPath,
      outputPath: job.outputPath,
      inputFormat: job.inputFormat,
      outputFormat: job.outputFormat,
      createdAt: Date.now(),
      error: null
    });

    // Heartbeat 초기화
    this.lastAccessTime.set(job.id, Date.now());

    // 큐에 추가
    this.queue.push(job);
    console.log(`[Queue] Job ${job.id} added to queue. Queue size: ${this.queue.length}`);

    // 다음 작업 처리 시도
    this.processNext();

    return job.id;
  }

  /**
   * Heartbeat 갱신 (progress.js에서 호출)
   */
  updateHeartbeat(jobId) {
    this.lastAccessTime.set(jobId, Date.now());
  }

  /**
   * Heartbeat 타임아웃 체크 (10초마다 자동 실행)
   */
  checkHeartbeat() {
    const now = Date.now();
    const timeout = 30000; // 30초

    for (const [jobId, lastTime] of this.lastAccessTime.entries()) {
      if (now - lastTime > timeout) {
        const job = this.jobs.get(jobId);
        if (job && job.status !== 'completed' && job.status !== 'failed' && job.status !== 'cancelled') {
          console.log(`[Queue] Job ${jobId} timeout (status: ${job.status}) - client disconnected`);
          this.cancelJob(jobId, 'Client disconnected (timeout)');
        }
      }
    }
  }

  /**
   * FFmpeg 프로세스 참조 저장
   */
  setFFmpegProcess(jobId, ffmpegCommand) {
    this.ffmpegProcesses.set(jobId, ffmpegCommand);
    console.log(`[Queue] FFmpeg process reference stored for job ${jobId}`);
  }

  /**
   * 작업 취소
   */
  async cancelJob(jobId, reason = 'Cancelled by user') {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.log(`[Queue] Job ${jobId} not found for cancellation`);
      return false;
    }

    console.log(`[Queue] Cancelling job ${jobId}: ${reason}`);

    // 큐에서 제거 (pending 상태인 경우)
    const queueIndex = this.queue.findIndex(j => j.id === jobId);
    if (queueIndex > -1) {
      this.queue.splice(queueIndex, 1);
      console.log(`[Queue] Removed job ${jobId} from queue (position: ${queueIndex})`);
    }

    // FFmpeg 프로세스 종료 (processing 상태인 경우)
    const ffmpegProcess = this.ffmpegProcesses.get(jobId);
    if (ffmpegProcess) {
      try {
        ffmpegProcess.kill('SIGKILL');
        console.log(`[Queue] Killed FFmpeg process for job ${jobId}`);
        this.ffmpegProcesses.delete(jobId);
      } catch (err) {
        console.error(`[Queue] Error killing FFmpeg for job ${jobId}:`, err);
      }
    }

    // 파일 삭제
    await this.deleteJobFiles(job);

    // 상태 업데이트
    job.status = 'cancelled';
    job.error = reason;
    job.message = reason;

    // 정리
    this.jobs.delete(jobId);
    this.lastAccessTime.delete(jobId);

    // 현재 처리 중인 작업이 취소된 경우 Set에서 제거 후 다음 작업 진행
    if (this.processingJobs.has(jobId)) {
      this.processingJobs.delete(jobId);
      this.processNext();
    }

    return true;
  }

  /**
   * 작업 관련 파일 삭제
   */
  async deleteJobFiles(job) {
    const files = [job.inputPath, job.outputPath].filter(Boolean);

    for (const filePath of files) {
      try {
        await fs.unlink(filePath);
        console.log(`[Queue] Deleted file: ${filePath}`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`[Queue] Error deleting ${filePath}:`, err.message);
        }
      }
    }
  }

  /**
   * 큐의 다음 작업 처리
   */
  async processNext() {
    // 동시 처리 한도에 도달했거나 큐가 비어있으면 중단
    if (this.processingJobs.size >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    // 큐에서 다음 작업 가져오기
    const job = this.queue.shift();
    this.processingJobs.add(job.id);

    const jobState = this.jobs.get(job.id);
    if (!jobState) {
      console.error(`[Queue] Job state not found for ${job.id}`);
      this.processingJobs.delete(job.id);
      this.processNext();
      return;
    }

    jobState.status = 'processing';
    jobState.progress = 5;
    jobState.message = 'Starting conversion...';

    console.log(`[Queue] Processing job ${job.id}. Active: ${this.processingJobs.size}/${this.maxConcurrency}, Remaining in queue: ${this.queue.length}`);

    try {
      // 변환 실행 (FFmpeg 변환)
      await job.execute();

      // 완료 상태 업데이트
      jobState.status = 'completed';
      jobState.progress = 100;
      jobState.message = 'Conversion completed!';
      console.log(`[Queue] Job ${job.id} completed successfully`);

    } catch (err) {
      // 에러 상태 업데이트
      jobState.status = 'failed';
      jobState.progress = 0;
      jobState.error = err.message;
      jobState.message = `Conversion failed: ${err.message}`;
      console.error(`[Queue] Job ${job.id} failed:`, err);

    } finally {
      // 처리 완료, 다음 작업 진행
      this.processingJobs.delete(job.id);
      this.ffmpegProcesses.delete(job.id);
      this.processNext();
    }
  }

  /**
   * Job 상태 조회
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Job 진행률 업데이트 (FFmpeg 콜백용)
   */
  updateProgress(jobId, progress, message) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = Math.min(99, Math.max(0, progress));
      job.message = message;
    }
  }

  /**
   * Job 제거 (다운로드 후)
   */
  removeJob(jobId) {
    const deleted = this.jobs.delete(jobId);
    this.lastAccessTime.delete(jobId);
    this.ffmpegProcesses.delete(jobId);

    if (deleted) {
      console.log(`[Queue] Job ${jobId} removed from memory`);
    }
    return deleted;
  }

  /**
   * 오래된 완료/실패 작업 정리 (시간 기준)
   */
  cleanupOldJobs(maxAge = 60 * 60 * 1000) { // 기본 1시간
    const now = Date.now();
    let cleaned = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      const age = now - job.createdAt;
      const isFinished = ['completed', 'failed', 'cancelled'].includes(job.status);

      if (isFinished && age > maxAge) {
        this.jobs.delete(jobId);
        this.lastAccessTime.delete(jobId);
        this.ffmpegProcesses.delete(jobId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Queue] Cleaned up ${cleaned} old jobs from memory`);
    }

    return cleaned;
  }

  /**
   * 큐 통계 조회
   */
  getQueueStats() {
    const stats = {
      queueLength: this.queue.length,
      processingCount: this.processingJobs.size,
      maxConcurrency: this.maxConcurrency,
      totalJobs: this.jobs.size,
      statusBreakdown: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0
      }
    };

    for (const job of this.jobs.values()) {
      if (stats.statusBreakdown[job.status] !== undefined) {
        stats.statusBreakdown[job.status]++;
      }
    }

    return stats;
  }

  /**
   * 종료 시 정리
   */
  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      console.log('[Queue] Heartbeat monitoring stopped');
    }
  }
}

// 싱글톤 인스턴스 (전체 서버에서 공유)
const conversionQueue = new ConversionQueue(
  parseInt(process.env.MAX_QUEUE_SIZE || '10'),
  parseInt(process.env.MAX_CONCURRENCY || '1')
);

// 1시간마다 오래된 작업 정리
setInterval(() => {
  conversionQueue.cleanupOldJobs();
}, 60 * 60 * 1000);

// 프로세스 종료 시 정리
process.on('SIGTERM', () => {
  conversionQueue.destroy();
});

process.on('SIGINT', () => {
  conversionQueue.destroy();
});

export default conversionQueue;
