import { downloadFile } from '../utils/storage.js';
import { generateOutputFilename } from '../utils/helpers.js';

/**
 * 변환된 파일 다운로드 핸들러
 * @param {Context} c - Hono 컨텍스트
 * @returns {Promise<Response>}
 */
export async function downloadHandler(c) {
  try {
    const taskId = c.req.param('taskId');
    
    if (!taskId) {
      return c.json({ 
        error: '작업 ID가 필요합니다'
      }, 400);
    }
    
    // Durable Object에서 작업 정보 가져오기
    const progressTrackerId = c.env.PROGRESS_TRACKER.idFromName(taskId);
    const progressTracker = c.env.PROGRESS_TRACKER.get(progressTrackerId);
    
    const statusResponse = await progressTracker.fetch('http://localhost/status');
    const statusData = await statusResponse.json();
    
    if (!statusData.task) {
      return c.json({ 
        error: '존재하지 않는 작업입니다'
      }, 404);
    }
    
    const task = statusData.task;
    
    // 작업 완료 확인
    if (statusData.status !== 'completed') {
      return c.json({ 
        error: '변환이 완료되지 않았습니다',
        currentStatus: statusData.status,
        progress: statusData.progress
      }, 400);
    }
    
    // 출력 파일 키 확인
    const outputFileKey = statusData.outputFileKey;
    if (!outputFileKey) {
      return c.json({ 
        error: '출력 파일을 찾을 수 없습니다'
      }, 404);
    }
    
    // R2에서 파일 다운로드
    const fileObject = await downloadFile(c.env.STORAGE, outputFileKey);
    
    if (!fileObject) {
      return c.json({ 
        error: '파일을 찾을 수 없습니다'
      }, 404);
    }
    
    // 출력 파일명 생성
    const outputFilename = generateOutputFilename(
      task.originalFileName || 'converted_file',
      task.outputFormat
    );
    
    // 파일 스트림 응답
    return new Response(fileObject.body, {
      headers: {
        'Content-Type': fileObject.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${outputFilename}"`,
        'Content-Length': fileObject.size?.toString() || '',
        'Cache-Control': 'private, max-age=3600',
        'Last-Modified': fileObject.uploaded?.toUTCString() || new Date().toUTCString(),
        // CORS 헤더
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Expose-Headers': 'Content-Disposition, Content-Length'
      }
    });
    
  } catch (error) {
    console.error('파일 다운로드 오류:', error);
    return c.json({ 
      error: '파일 다운로드에 실패했습니다',
      details: error.message
    }, 500);
  }
}

/**
 * 다운로드 가능한 파일 목록 조회 (옵션)
 * @param {Context} c - Hono 컨텍스트
 * @returns {Promise<Response>}
 */
export async function listDownloadsHandler(c) {
  try {
    const { searchParams } = new URL(c.req.url);
    const taskIds = searchParams.get('taskIds')?.split(',') || [];
    
    if (taskIds.length === 0) {
      return c.json({ 
        error: '조회할 작업 ID가 필요합니다'
      }, 400);
    }
    
    const downloads = [];
    
    for (const taskId of taskIds) {
      try {
        const progressTrackerId = c.env.PROGRESS_TRACKER.idFromName(taskId);
        const progressTracker = c.env.PROGRESS_TRACKER.get(progressTrackerId);
        
        const statusResponse = await progressTracker.fetch('http://localhost/status');
        const statusData = await statusResponse.json();
        
        if (statusData.task && statusData.status === 'completed' && statusData.outputFileKey) {
          const task = statusData.task;
          const outputFilename = generateOutputFilename(
            task.originalFileName || 'converted_file',
            task.outputFormat
          );
          
          downloads.push({
            taskId: taskId,
            filename: outputFilename,
            status: statusData.status,
            downloadUrl: `/download/${taskId}`,
            completedAt: statusData.lastUpdate,
            inputFormat: task.inputFormat,
            outputFormat: task.outputFormat
          });
        }
      } catch (error) {
        console.error(`작업 ${taskId} 조회 실패:`, error);
        // 개별 작업 실패는 무시하고 계속 진행
      }
    }
    
    return c.json({
      downloads: downloads,
      count: downloads.length
    });
    
  } catch (error) {
    console.error('다운로드 목록 조회 오류:', error);
    return c.json({ 
      error: '다운로드 목록 조회에 실패했습니다',
      details: error.message
    }, 500);
  }
}

/**
 * 파일 메타데이터 조회
 * @param {Context} c - Hono 컨텍스트  
 * @returns {Promise<Response>}
 */
export async function getFileInfoHandler(c) {
  try {
    const taskId = c.req.param('taskId');
    
    if (!taskId) {
      return c.json({ 
        error: '작업 ID가 필요합니다'
      }, 400);
    }
    
    // 작업 정보 가져오기
    const progressTrackerId = c.env.PROGRESS_TRACKER.idFromName(taskId);
    const progressTracker = c.env.PROGRESS_TRACKER.get(progressTrackerId);
    
    const statusResponse = await progressTracker.fetch('http://localhost/status');
    const statusData = await statusResponse.json();
    
    if (!statusData.task) {
      return c.json({ 
        error: '존재하지 않는 작업입니다'
      }, 404);
    }
    
    const task = statusData.task;
    
    // 파일 정보 응답
    const fileInfo = {
      taskId: taskId,
      status: statusData.status,
      progress: statusData.progress,
      inputFormat: task.inputFormat,
      outputFormat: task.outputFormat,
      originalFileName: task.originalFileName,
      settings: task.settings,
      createdAt: task.createdAt,
      lastUpdate: statusData.lastUpdate,
      isDownloadable: statusData.status === 'completed' && !!statusData.outputFileKey
    };
    
    if (fileInfo.isDownloadable) {
      fileInfo.downloadUrl = `/download/${taskId}`;
      fileInfo.outputFileName = generateOutputFilename(
        task.originalFileName || 'converted_file',
        task.outputFormat
      );
    }
    
    return c.json(fileInfo);
    
  } catch (error) {
    console.error('파일 정보 조회 오류:', error);
    return c.json({ 
      error: '파일 정보 조회에 실패했습니다',
      details: error.message
    }, 500);
  }
}