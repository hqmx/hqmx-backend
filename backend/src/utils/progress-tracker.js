// Durable Object: 변환 작업 진행률 추적

export class ProgressTracker {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set(); // WebSocket 세션들
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      switch (path) {
        case '/init':
          return await this.handleInit(request);
        case '/update':
          return await this.handleUpdate(request);
        case '/status':
          return await this.handleGetStatus(request);
        case '/stream':
          return await this.handleStream(request);
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('ProgressTracker 오류:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  /**
   * 작업 초기화
   */
  async handleInit(request) {
    const task = await request.json();
    
    // 작업 정보 저장
    await this.state.storage.put('task', task);
    await this.state.storage.put('status', 'pending');
    await this.state.storage.put('progress', 0);
    await this.state.storage.put('message', '작업 초기화 완료');
    await this.state.storage.put('lastUpdate', new Date().toISOString());
    
    return new Response('OK');
  }

  /**
   * 진행률 업데이트
   */
  async handleUpdate(request) {
    const update = await request.json();
    
    // 상태 업데이트
    if (update.status) {
      await this.state.storage.put('status', update.status);
    }
    if (update.progress !== undefined) {
      await this.state.storage.put('progress', update.progress);
    }
    if (update.message) {
      await this.state.storage.put('message', update.message);
    }
    if (update.outputFileKey) {
      await this.state.storage.put('outputFileKey', update.outputFileKey);
    }
    
    await this.state.storage.put('lastUpdate', new Date().toISOString());
    
    // 연결된 모든 클라이언트에 업데이트 브로드캐스트
    await this.broadcastUpdate(update);
    
    return new Response('OK');
  }

  /**
   * 현재 상태 조회
   */
  async handleGetStatus(request) {
    const task = await this.state.storage.get('task');
    const status = await this.state.storage.get('status');
    const progress = await this.state.storage.get('progress');
    const message = await this.state.storage.get('message');
    const lastUpdate = await this.state.storage.get('lastUpdate');
    const outputFileKey = await this.state.storage.get('outputFileKey');
    
    return new Response(JSON.stringify({
      task,
      status,
      progress,
      message,
      lastUpdate,
      outputFileKey
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Server-Sent Events 스트림 처리
   */
  async handleStream(request) {
    // WebSocket 쌍 생성
    const { 0: client, 1: server } = new WebSocketPair();
    
    // 현재 상태 즉시 전송
    const currentStatus = {
      status: await this.state.storage.get('status'),
      progress: await this.state.storage.get('progress'), 
      message: await this.state.storage.get('message'),
      timestamp: new Date().toISOString()
    };
    
    server.send(JSON.stringify(currentStatus));
    
    // 세션 추가
    this.sessions.add(server);
    
    // 연결 종료 시 세션 제거
    server.addEventListener('close', () => {
      this.sessions.delete(server);
    });
    
    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  /**
   * 모든 연결된 클라이언트에 업데이트 브로드캐스트
   */
  async broadcastUpdate(update) {
    const message = JSON.stringify({
      ...update,
      timestamp: new Date().toISOString()
    });
    
    // 연결이 끊어진 세션들 제거
    const deadSessions = [];
    
    for (const session of this.sessions) {
      try {
        session.send(message);
      } catch (error) {
        deadSessions.push(session);
      }
    }
    
    // 끊어진 세션들 정리
    deadSessions.forEach(session => this.sessions.delete(session));
  }
}