// HQMX Converter Service Worker
// 완전한 클라이언트 사이드 파일 변환기를 위한 PWA 지원

const CACHE_NAME = 'hqmx-converter-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/script.js',
  '/style.css',
  '/converter-engine.js',
  '/i18n.js',
  '/manifest.json',
  '/assets/favicon.svg',
  '/assets/favicon-96x96.png',
  '/assets/web-app-manifest-192x192.png',
  '/assets/web-app-manifest-512x512.png'
];

// 설치 이벤트
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: 캐시 열기');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: 캐시 추가 실패', error);
      })
  );
});

// 활성화 이벤트 (이전 캐시 정리)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 이전 캐시 삭제', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch 이벤트 (네트워크 우선, 캐시 폴백)
self.addEventListener('fetch', (event) => {
  // HTTP/HTTPS 요청만 처리하고 CDN 리소스와 확장 프로그램 요청은 캐시하지 않음
  if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) {
    return;
  }

  if (event.request.url.includes('googleapis.com') ||
      event.request.url.includes('cdnjs.cloudflare.com') ||
      event.request.url.includes('jsdelivr.net')) {
    return;
  }

  // POST 요청과 광고 스크립트는 캐시하지 않음
  if (event.request.method !== 'GET' ||
      event.request.url.includes('outskirtsgrey.com') ||
      event.request.url.includes('highperformanceformat.com') ||
      event.request.url.includes('effectivegatecpm.com') ||
      event.request.url.includes('shoukigaigoors.net')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 네트워크 응답이 성공적인 경우 (GET 요청만 캐시)
        if (response && response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 요청 실패 시 캐시에서 반환
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            // 기본 HTML 페이지 반환 (SPA 라우팅 지원)
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// 백그라운드 동기화 (선택적)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: 백그라운드 동기화');
  }
});

// 푸시 알림 (선택적)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/assets/favicon-96x96.png',
      badge: '/assets/favicon-96x96.png',
      vibrate: [100, 50, 100],
      data: data.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll().then((clients) => {
      if (clients.length === 0) {
        return self.clients.openWindow('/');
      } else {
        return clients[0].focus();
      }
    })
  );
});