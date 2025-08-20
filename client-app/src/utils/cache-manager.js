// 스마트 캐싱 시스템 - 브라우저 캐시, IndexedDB, Memory 캐시 통합

class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.maxMemorySize = 100 * 1024 * 1024; // 100MB 메모리 캐시 제한
    this.currentMemorySize = 0;
    this.dbName = 'ConverterCache';
    this.dbVersion = 1;
    this.db = null;
    this.initPromise = null;
  }

  /**
   * 캐시 시스템 초기화
   */
  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInit();
    return this.initPromise;
  }

  async doInit() {
    try {
      // IndexedDB 초기화
      this.db = await this.openDatabase();
      
      // 메모리 정리 스케줄링
      this.scheduleCleanup();
      
      console.log('✅ CacheManager 초기화 완료');
      return true;

    } catch (error) {
      console.warn('CacheManager 초기화 실패:', error);
      return false;
    }
  }

  /**
   * IndexedDB 열기
   */
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // WASM 라이브러리 캐시 스토어
        if (!db.objectStoreNames.contains('libraries')) {
          const libraryStore = db.createObjectStore('libraries', { keyPath: 'key' });
          libraryStore.createIndex('timestamp', 'timestamp', { unique: false });
          libraryStore.createIndex('size', 'size', { unique: false });
        }

        // 변환 결과 캐시 스토어 (동일 파일+설정 재변환 방지)
        if (!db.objectStoreNames.contains('conversions')) {
          const conversionStore = db.createObjectStore('conversions', { keyPath: 'key' });
          conversionStore.createIndex('timestamp', 'timestamp', { unique: false });
          conversionStore.createIndex('hash', 'hash', { unique: false });
        }

        // 설정 캐시 스토어
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * WASM 라이브러리 캐시
   */
  async cacheLibrary(key, data, metadata = {}) {
    const cacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      size: data.byteLength || data.length,
      metadata
    };

    try {
      // 1. 메모리 캐시 (빠른 액세스)
      if (this.shouldCacheInMemory(cacheEntry.size)) {
        this.memoryCache.set(key, cacheEntry);
        this.currentMemorySize += cacheEntry.size;
        this.cleanupMemoryIfNeeded();
      }

      // 2. IndexedDB 캐시 (영구 저장)
      await this.saveToIndexedDB('libraries', cacheEntry);

      // 3. Browser Cache API (HTTP 요청 캐싱)
      if ('caches' in window) {
        await this.saveToBrowserCache(key, data, metadata);
      }

      console.log(`✅ 라이브러리 캐시 저장: ${key} (${this.formatSize(cacheEntry.size)})`);
      return true;

    } catch (error) {
      console.warn('라이브러리 캐시 저장 실패:', error);
      return false;
    }
  }

  /**
   * WASM 라이브러리 로드
   */
  async loadLibrary(key) {
    try {
      // 1. 메모리 캐시에서 먼저 확인
      if (this.memoryCache.has(key)) {
        console.log(`⚡ 메모리 캐시에서 로드: ${key}`);
        const entry = this.memoryCache.get(key);
        entry.lastAccessed = Date.now();
        return entry.data;
      }

      // 2. Browser Cache API 확인
      if ('caches' in window) {
        const cached = await this.loadFromBrowserCache(key);
        if (cached) {
          console.log(`🌐 브라우저 캐시에서 로드: ${key}`);
          
          // 메모리 캐시에도 저장
          const entry = {
            key,
            data: cached,
            timestamp: Date.now(),
            size: cached.byteLength || cached.length,
            lastAccessed: Date.now()
          };
          
          if (this.shouldCacheInMemory(entry.size)) {
            this.memoryCache.set(key, entry);
            this.currentMemorySize += entry.size;
          }
          
          return cached;
        }
      }

      // 3. IndexedDB 확인
      const stored = await this.loadFromIndexedDB('libraries', key);
      if (stored) {
        console.log(`💾 IndexedDB에서 로드: ${key}`);
        
        // 메모리 캐시에도 저장
        if (this.shouldCacheInMemory(stored.size)) {
          this.memoryCache.set(key, {
            ...stored,
            lastAccessed: Date.now()
          });
          this.currentMemorySize += stored.size;
        }
        
        return stored.data;
      }

      return null;

    } catch (error) {
      console.warn('라이브러리 로드 실패:', error);
      return null;
    }
  }

  /**
   * 변환 결과 캐시 (동일 파일+설정 재변환 방지)
   */
  async cacheConversion(fileHash, outputFormat, settings, result) {
    const key = this.generateConversionKey(fileHash, outputFormat, settings);
    
    const cacheEntry = {
      key,
      hash: fileHash,
      outputFormat,
      settings,
      result,
      timestamp: Date.now(),
      size: result.size || result.byteLength
    };

    try {
      // 작은 결과는 메모리에도 캐시
      if (cacheEntry.size < 10 * 1024 * 1024) { // 10MB 미만
        this.memoryCache.set(key, cacheEntry);
        this.currentMemorySize += cacheEntry.size;
      }

      // IndexedDB에 저장
      await this.saveToIndexedDB('conversions', cacheEntry);

      console.log(`✅ 변환 결과 캐시: ${key.substring(0, 16)}... (${this.formatSize(cacheEntry.size)})`);
      return true;

    } catch (error) {
      console.warn('변환 결과 캐시 실패:', error);
      return false;
    }
  }

  /**
   * 변환 결과 로드
   */
  async loadConversion(fileHash, outputFormat, settings) {
    const key = this.generateConversionKey(fileHash, outputFormat, settings);

    try {
      // 메모리 캐시 확인
      if (this.memoryCache.has(key)) {
        console.log(`⚡ 캐시된 변환 결과 사용: ${key.substring(0, 16)}...`);
        const entry = this.memoryCache.get(key);
        entry.lastAccessed = Date.now();
        return entry.result;
      }

      // IndexedDB 확인
      const stored = await this.loadFromIndexedDB('conversions', key);
      if (stored) {
        console.log(`💾 저장된 변환 결과 사용: ${key.substring(0, 16)}...`);
        
        // 메모리에도 캐시 (작은 파일만)
        if (stored.size < 10 * 1024 * 1024) {
          this.memoryCache.set(key, {
            ...stored,
            lastAccessed: Date.now()
          });
          this.currentMemorySize += stored.size;
        }
        
        return stored.result;
      }

      return null;

    } catch (error) {
      console.warn('변환 결과 로드 실패:', error);
      return null;
    }
  }

  /**
   * 파일 해시 생성 (빠른 해싱)
   */
  async generateFileHash(file) {
    // 파일 크기가 큰 경우 청크 해싱
    if (file.size > 10 * 1024 * 1024) { // 10MB 이상
      return await this.generateChunkedHash(file);
    }

    // 작은 파일은 전체 해싱
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 청크 기반 해시 생성 (대용량 파일용)
   */
  async generateChunkedHash(file) {
    const chunkSize = 1024 * 1024; // 1MB 청크
    const chunks = [];
    
    // 시작, 중간, 끝 부분 샘플링
    chunks.push(file.slice(0, chunkSize));
    chunks.push(file.slice(file.size / 2, file.size / 2 + chunkSize));
    chunks.push(file.slice(-chunkSize));

    let combinedHash = '';
    for (const chunk of chunks) {
      const arrayBuffer = await chunk.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      combinedHash += hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // 최종 해시
    const finalBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(combinedHash + file.size + file.lastModified));
    const finalArray = Array.from(new Uint8Array(finalBuffer));
    return finalArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 변환 캐시 키 생성
   */
  generateConversionKey(fileHash, outputFormat, settings) {
    const settingsStr = JSON.stringify(settings);
    const keyStr = `${fileHash}_${outputFormat}_${settingsStr}`;
    return btoa(keyStr).replace(/[+/=]/g, ''); // Base64 URL-safe
  }

  /**
   * Browser Cache API 저장
   */
  async saveToBrowserCache(key, data, metadata) {
    try {
      const cache = await caches.open('converter-libs-v1');
      const response = new Response(data, {
        headers: {
          'Content-Type': 'application/wasm',
          'Cache-Control': 'public, max-age=31536000', // 1년
          'X-Cache-Metadata': JSON.stringify(metadata)
        }
      });
      
      await cache.put(`/cache/${key}`, response);
      return true;

    } catch (error) {
      console.warn('Browser Cache 저장 실패:', error);
      return false;
    }
  }

  /**
   * Browser Cache API 로드
   */
  async loadFromBrowserCache(key) {
    try {
      const cache = await caches.open('converter-libs-v1');
      const response = await cache.match(`/cache/${key}`);
      
      if (response) {
        return await response.arrayBuffer();
      }
      
      return null;

    } catch (error) {
      console.warn('Browser Cache 로드 실패:', error);
      return null;
    }
  }

  /**
   * IndexedDB 저장
   */
  async saveToIndexedDB(storeName, data) {
    if (!this.db) await this.init();
    if (!this.db) return false;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * IndexedDB 로드
   */
  async loadFromIndexedDB(storeName, key) {
    if (!this.db) await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 메모리 캐시 적합성 확인
   */
  shouldCacheInMemory(size) {
    return size < 50 * 1024 * 1024 && // 50MB 미만
           (this.currentMemorySize + size) < this.maxMemorySize;
  }

  /**
   * 메모리 캐시 정리
   */
  cleanupMemoryIfNeeded() {
    if (this.currentMemorySize <= this.maxMemorySize) return;

    console.log('🧹 메모리 캐시 정리 시작');

    // LRU 방식으로 정리
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => (a[1].lastAccessed || a[1].timestamp) - (b[1].lastAccessed || b[1].timestamp));

    let freedSize = 0;
    const targetSize = this.maxMemorySize * 0.7; // 70%까지 정리

    for (const [key, entry] of entries) {
      if (this.currentMemorySize - freedSize <= targetSize) break;

      this.memoryCache.delete(key);
      freedSize += entry.size;
    }

    this.currentMemorySize -= freedSize;
    console.log(`✅ 메모리 정리 완료: ${this.formatSize(freedSize)} 해제`);
  }

  /**
   * 정기적 정리 스케줄링
   */
  scheduleCleanup() {
    // 1시간마다 오래된 캐시 정리
    setInterval(async () => {
      await this.cleanupExpiredCache();
    }, 60 * 60 * 1000);

    // 5분마다 메모리 정리
    setInterval(() => {
      this.cleanupMemoryIfNeeded();
    }, 5 * 60 * 1000);
  }

  /**
   * 만료된 캐시 정리
   */
  async cleanupExpiredCache() {
    if (!this.db) return;

    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7일
    const cutoff = Date.now() - maxAge;

    try {
      // 라이브러리 캐시 정리
      await this.cleanupStore('libraries', cutoff);
      
      // 변환 결과 캐시 정리 (더 짧은 보존 기간)
      const conversionCutoff = Date.now() - (24 * 60 * 60 * 1000); // 1일
      await this.cleanupStore('conversions', conversionCutoff);

      console.log('✅ 만료된 캐시 정리 완료');

    } catch (error) {
      console.warn('캐시 정리 오류:', error);
    }
  }

  /**
   * 특정 스토어 정리
   */
  async cleanupStore(storeName, cutoff) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoff);
      const request = index.openCursor(range);

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.log(`${storeName}에서 ${deletedCount}개 항목 정리`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 캐시 통계
   */
  async getStats() {
    const stats = {
      memoryCache: {
        size: this.currentMemorySize,
        count: this.memoryCache.size,
        maxSize: this.maxMemorySize
      },
      indexedDB: {
        libraries: await this.getStoreStats('libraries'),
        conversions: await this.getStoreStats('conversions')
      }
    };

    return stats;
  }

  /**
   * 스토어 통계
   */
  async getStoreStats(storeName) {
    if (!this.db) return { count: 0, size: 0 };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result;
        const size = items.reduce((sum, item) => sum + (item.size || 0), 0);
        resolve({ count: items.length, size });
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 크기 포맷팅
   */
  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * 전체 캐시 삭제
   */
  async clearAll() {
    // 메모리 캐시 정리
    this.memoryCache.clear();
    this.currentMemorySize = 0;

    // IndexedDB 정리
    if (this.db) {
      const storeNames = ['libraries', 'conversions', 'settings'];
      for (const storeName of storeNames) {
        await this.clearStore(storeName);
      }
    }

    // Browser Cache 정리
    if ('caches' in window) {
      await caches.delete('converter-libs-v1');
    }

    console.log('✅ 모든 캐시 삭제 완료');
  }

  async clearStore(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// 싱글톤 인스턴스
let cacheManagerInstance = null;

export function getCacheManager() {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager();
  }
  return cacheManagerInstance;
}

export { CacheManager };