// HQMX Converter Service Worker
// 오프라인 지원, 캐싱, 백그라운드 동기화

const CACHE_NAME = 'hqmx-converter-v2.0.0';
const WASM_CACHE = 'wasm-libs-v1';
const RUNTIME_CACHE = 'runtime-v1';

// 캐시할 핵심 파일들
const CORE_FILES = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/styles/main.css',
  '/src/utils/auto-converter.js',
  '/src/utils/cache-manager.js',
  '/src/utils/download-manager.js',
  '/src/engines/ffmpeg-engine.js',
  '/src/engines/image-engine.js',
  '/manifest.json'
];

// WASM 라이브러리 URL들
const WASM_LIBRARIES = [
  'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
  'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
  'https://cdn.jsdelivr.net/npm/@imagemagick/magick-wasm@0.0.28/dist/index.js'
];

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker 설치 중...');
  
  event.waitUntil(
    Promise.all([
      // 핵심 파일 캐시
      caches.open(CACHE_NAME).then((cache) => {
        console.log('📦 핵심 파일 캐시 중...');
        return cache.addAll(CORE_FILES);
      }),
      
      // WASM 라이브러리 선택적 캐시 (실패해도 설치 계속)
      caches.open(WASM_CACHE).then((cache) => {
        console.log('⚡ WASM 라이브러리 사전 캐시 중...');
        return Promise.allSettled(
          WASM_LIBRARIES.map(url => 
            cache.add(url).catch(err => console.warn(`WASM 캐시 실패: ${url}`, err))
          )
        );
      })
    ]).then(() => {
      console.log('✅ Service Worker 설치 완료');
      // 즉시 활성화
      return self.skipWaiting();
    }).catch((error) => {
      console.error('❌ Service Worker 설치 실패:', error);
    })
  );
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker 활성화 중...');
  
  event.waitUntil(
    Promise.all([
      // 이전 캐시 정리
      cleanupOldCaches(),
      
      // 모든 클라이언트 제어
      self.clients.claim()
      
    ]).then(() => {
      console.log('✅ Service Worker 활성화 완료');
    })
  );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 같은 origin이 아니면 기본 동작
  if (url.origin !== self.location.origin) {
    return handleExternalRequest(event);
  }
  
  // 요청 타입에 따라 다른 전략 사용
  if (request.method !== 'GET') {
    return; // GET이 아닌 요청은 캐시하지 않음
  }
  
  // HTML 파일: Network First
  if (request.destination === 'document') {
    return handleDocumentRequest(event);
  }
  
  // JS/CSS: Stale While Revalidate
  if (request.destination === 'script' || request.destination === 'style') {
    return handleAssetRequest(event);
  }
  
  // 이미지: Cache First
  if (request.destination === 'image') {
    return handleImageRequest(event);
  }
  
  // WASM/기타: Cache First with Network Fallback
  return handleOtherRequest(event);
});

/**
 * HTML 문서 요청 처리 (Network First)
 */
function handleDocumentRequest(event) {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 네트워크 성공 시 캐시 업데이트
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 반환
        return caches.match(event.request);
      })
  );
}

/**
 * JS/CSS 에셋 요청 처리 (Stale While Revalidate)
 */
function handleAssetRequest(event) {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const networkFetch = fetch(event.request).then(response => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
      
      // 캐시가 있으면 즉시 반환하고 백그라운드에서 업데이트
      return cachedResponse || networkFetch;
    })
  );
}

/**
 * 이미지 요청 처리 (Cache First)
 */
function handleImageRequest(event) {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).then(response => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
}

/**
 * 기타 요청 처리
 */
function handleOtherRequest(event) {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).then(response => {
        // 성공적인 응답만 캐시
        if (response.status === 200) {
          const responseClone = response.clone();
          const cacheToUse = isWasmLibrary(event.request.url) ? WASM_CACHE : RUNTIME_CACHE;
          
          caches.open(cacheToUse).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
}

/**
 * 외부 요청 처리 (WASM 라이브러리 등)
 */
function handleExternalRequest(event) {
  // WASM 라이브러리는 적극적으로 캐시
  if (isWasmLibrary(event.request.url)) {
    event.respondWith(
      caches.match(event.request, { ignoreVary: true }).then(cachedResponse => {
        if (cachedResponse) {
          console.log('📦 WASM 라이브러리 캐시에서 로드:', event.request.url);
          return cachedResponse;
        }
        
        return fetch(event.request).then(response => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(WASM_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
            console.log('💾 WASM 라이브러리 캐시 저장:', event.request.url);
          }
          return response;
        });
      })
    );
  }
}

/**
 * WASM 라이브러리 URL인지 확인
 */
function isWasmLibrary(url) {
  return url.includes('ffmpeg') || 
         url.includes('imagemagick') || 
         url.includes('.wasm') ||
         url.includes('magick-wasm');
}

/**
 * 오래된 캐시 정리
 */
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => 
    name !== CACHE_NAME && 
    name !== WASM_CACHE && 
    name !== RUNTIME_CACHE &&
    (name.startsWith('hqmx-converter-') || name.startsWith('wasm-libs-') || name.startsWith('runtime-'))
  );
  
  if (oldCaches.length > 0) {
    console.log('🗑️ 오래된 캐시 정리:', oldCaches);
    await Promise.all(oldCaches.map(cacheName => caches.delete(cacheName)));
  }
}

// 백그라운드 동기화 (향후 기능)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-conversion') {
    event.waitUntil(handleBackgroundConversion());
  }
});

// 백그라운드 변환 처리
async function handleBackgroundConversion() {
  // IndexedDB에서 대기 중인 변환 작업 조회
  // 네트워크가 복구되면 실행
  console.log('🔄 백그라운드 변환 처리');
}

// 푸시 알림 처리 (향후 기능)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/assets/icon-192.png',
    badge: '/assets/badge-72.png',
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      {
        action: 'open',
        title: '열기'
      },
      {
        action: 'close', 
        title: '닫기'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// 메시지 처리 (메인 스레드와 통신)
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'GET_CACHE_STATS':
      getCacheStats().then(stats => {
        event.ports[0].postMessage({ type: 'CACHE_STATS', data: stats });
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
      
    case 'PRELOAD_WASM':
      preloadWasmLibraries(data.libraries).then(() => {
        event.ports[0].postMessage({ type: 'WASM_PRELOADED' });
      });
      break;
  }
});

/**
 * 캐시 통계 조회
 */
async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    stats[cacheName] = {
      count: requests.length,
      size: 0 // 정확한 크기는 계산 비용이 높아 생략
    };
  }
  
  return stats;
}

/**
 * 모든 캐시 정리
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
  console.log('🗑️ 모든 캐시 정리 완료');
}

/**
 * WASM 라이브러리 사전 로드
 */
async function preloadWasmLibraries(libraries = WASM_LIBRARIES) {
  const cache = await caches.open(WASM_CACHE);
  const results = await Promise.allSettled(
    libraries.map(url => cache.add(url))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.length - successful;
  
  console.log(`📦 WASM 라이브러리 사전 로드: ${successful}개 성공, ${failed}개 실패`);
}

console.log('🔧 Service Worker 로드 완료');