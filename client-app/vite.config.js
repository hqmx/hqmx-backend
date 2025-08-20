import { defineConfig } from 'vite'

export default defineConfig({
  // 기본 설정
  base: '/',
  
  // 빌드 설정
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    
    // 청크 분할 최적화
    rollupOptions: {
      output: {
        manualChunks: {
          // WASM 라이브러리는 별도 청크로 분리
          'wasm-libs': ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
          // 변환 엔진들
          'converters': [
            './src/engines/ffmpeg-engine.js',
            './src/engines/image-engine.js'
          ],
          // 유틸리티들
          'utils': [
            './src/utils/auto-converter.js',
            './src/utils/cache-manager.js',
            './src/utils/download-manager.js'
          ]
        }
      }
    },
    
    // 대용량 청크 경고 임계값 증가 (WASM 때문에)
    chunkSizeWarningLimit: 2000
  },
  
  // 개발 서버 설정
  server: {
    port: 3000,
    open: true,
    cors: true,
    
    // HTTPS 설정 (PWA 테스트용)
    https: false,
    
    // 헤더 설정
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Service-Worker-Allowed': '/'
    }
  },
  
  // 프리뷰 서버 설정 (빌드 테스트용)
  preview: {
    port: 8080,
    cors: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Service-Worker-Allowed': '/'
    }
  },
  
  // 모듈 해결 설정
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  
  // 플러그인 설정 (필요시 PWA 플러그인 추가 가능)
  plugins: [],
  
  // 최적화 설정
  optimizeDeps: {
    // WASM 관련 의존성은 사전 번들링에서 제외
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    
    // 포함할 의존성들
    include: []
  },
  
  // 워커 설정
  worker: {
    format: 'es'
  },
  
  // 실험적 기능
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      // Service Worker 경로 처리
      if (filename === 'sw.js') {
        return '/sw.js'
      }
      return { relative: true }
    }
  }
})