/**
 * Server-Sent Events를 통한 진행률 스트리밍 핸들러
 * @param {Context} c - Hono 컨텍스트
 * @returns {Promise<Response>}
 */
export async function progressHandler(c) {
  try {
    const taskId = c.req.param('taskId');
    
    if (!taskId) {
      return c.json({ 
        error: '작업 ID가 필요합니다'
      }, 400);
    }
    
    // Durable Object 가져오기
    const progressTrackerId = c.env.PROGRESS_TRACKER.idFromName(taskId);
    const progressTracker = c.env.PROGRESS_TRACKER.get(progressTrackerId);
    
    // 현재 상태 확인
    const statusResponse = await progressTracker.fetch('http://localhost/status');
    const statusData = await statusResponse.json();
    
    if (!statusData.task) {
      return c.json({ 
        error: '존재하지 않는 작업입니다'
      }, 404);
    }
    
    // WebSocket을 통한 실시간 스트리밍으로 변경
    // (Server-Sent Events 대신 WebSocket 사용)
    const streamResponse = await progressTracker.fetch('http://localhost/stream');
    
    if (streamResponse.webSocket) {
      return streamResponse;
    }
    
    // WebSocket을 지원하지 않는 경우 폴백으로 Server-Sent Events 사용
    return createSSEResponse(c, progressTracker);
    
  } catch (error) {
    console.error('진행률 스트리밍 오류:', error);
    return c.json({ 
      error: '진행률 조회에 실패했습니다',
      details: error.message
    }, 500);
  }
}

/**
 * Server-Sent Events 응답 생성 (WebSocket 폴백)
 * @param {Context} c - Hono 컨텍스트
 * @param {DurableObjectStub} progressTracker - 진행률 추적기
 * @returns {Response}
 */
function createSSEResponse(c, progressTracker) {
  // ReadableStream을 사용한 SSE 구현
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // 현재 상태 즉시 전송
      const statusResponse = await progressTracker.fetch('http://localhost/status');
      const statusData = await statusResponse.json();
      
      const initialData = {
        status: statusData.status || 'pending',
        percentage: statusData.progress || 0,
        message: statusData.message || '작업 시작',
        timestamp: new Date().toISOString()
      };
      
      controller.enqueue(encoder.encode(formatSSEData(initialData)));
      
      // 주기적으로 상태 폴링 (실제 환경에서는 WebSocket 사용 권장)
      const pollInterval = setInterval(async () => {
        try {
          const response = await progressTracker.fetch('http://localhost/status');
          const data = await response.json();
          
          const updateData = {
            status: data.status || 'pending',
            percentage: data.progress || 0,
            message: data.message || '',
            timestamp: new Date().toISOString()
          };
          
          controller.enqueue(encoder.encode(formatSSEData(updateData)));
          
          // 완료 또는 오류 시 스트림 종료
          if (data.status === 'completed' || data.status === 'error') {
            clearInterval(pollInterval);
            controller.close();
          }
        } catch (error) {
          console.error('상태 폴링 오류:', error);
          clearInterval(pollInterval);
          controller.error(error);
        }
      }, 1000); // 1초마다 폴링
      
      // 연결 종료 시 정리
      c.req.signal?.addEventListener('abort', () => {
        clearInterval(pollInterval);
        controller.close();
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

/**
 * SSE 데이터 형식화
 * @param {Object} data - 전송할 데이터
 * @returns {string}
 */
function formatSSEData(data) {
  return `data: ${JSON.stringify(data)}\n\n`;
}