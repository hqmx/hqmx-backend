// 완전한 클라이언트 사이드 파일 변환 엔진
// FFmpeg.wasm을 사용한 비디오/오디오 변환 + Canvas API를 사용한 이미지 변환

class ConverterEngine {
    constructor() {
        this.ffmpeg = null;
        this.ffmpegLoaded = false;
        this.ffmpegLoading = false;
        this.currentProgressCallback = null;

        // 4-Tier 라우팅 시스템
        this.tierMapping = null;
        this.networkSpeed = null; // Mbps
        this.loadTierMapping(); // 비동기 로드
    }

    /**
     * FFmpeg 초기화
     */
    async initFFmpeg(onProgress) {
        if (this.ffmpegLoaded) return true;
        if (this.ffmpegLoading) {
            while (this.ffmpegLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.ffmpegLoaded;
        }

        this.ffmpegLoading = true;

        try {
            onProgress?.(10, 'FFmpeg 라이브러리 로딩 중...');

            // FFmpeg 라이브러리 동적 로드
            const FFmpegLib = await this.loadFFmpegLibrary();

            this.ffmpeg = new FFmpegLib.FFmpeg();

            // 진행률 콜백 설정 (동적으로 currentProgressCallback 사용)
            this.ffmpeg.on('progress', ({ progress, time }) => {
                const percent = Math.round(progress * 100);
                if (percent > 0 && percent <= 100) {
                    const callback = this.currentProgressCallback || onProgress;
                    callback?.(percent, `Converting... ${percent}%`);
                }
            });

            // FFmpeg 로그 출력 (UI로 전달)
            this.ffmpeg.on('log', ({ message }) => {
                console.log('[FFmpeg]', message);
                // Forward log to UI callback
                const callback = this.currentProgressCallback || onProgress;
                if (callback && message) {
                    callback(null, `[FFmpeg] ${message}`);
                }
            });

            onProgress?.(30, 'FFmpeg 코어 로딩 중...');

            // 로컬 서버에서 코어 파일 로드 (자체 호스팅)
            await this.ffmpeg.load({
                coreURL: '/lib/ffmpeg/ffmpeg-core.js',   // 로컬 경로로 변경
                wasmURL: '/lib/ffmpeg/ffmpeg-core.wasm'  // 로컬 경로로 변경
            });

            // FFmpeg.wasm 0.12.x는 fetchFile 없음 (새 API 사용)
            this.ffmpegLoaded = true;
            this.ffmpegLoading = false;
            
            onProgress?.(100, 'FFmpeg 준비 완료');
            return true;

        } catch (error) {
            this.ffmpegLoading = false;
            console.error('FFmpeg 초기화 실패:', error);
            throw new Error('변환 엔진 초기화 실패: ' + error.message);
        }
    }

    /**
     * FFmpeg 라이브러리 로드
     */
    async loadFFmpegLibrary() {
        // FFmpeg.wasm 라이브러리가 이미 로드되었는지 확인
        if (window.FFmpegWASM) {
            return window.FFmpegWASM;
        }

        // 로컬 서버에서 FFmpeg.wasm 라이브러리 로드 (자체 호스팅으로 CORS 문제 해결)
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/lib/ffmpeg/ffmpeg.js';  // 로컬 경로로 변경
            script.crossOrigin = 'anonymous';  // CORS 명시적 허용
            script.async = true;

            script.onload = () => {
                if (window.FFmpegWASM) {
                    resolve(window.FFmpegWASM);
                } else {
                    reject(new Error('FFmpeg 라이브러리 로드 실패'));
                }
            };

            script.onerror = () => {
                reject(new Error('FFmpeg 스크립트 로드 실패'));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Web API 기반 미디어 변환 초기화
     */
    async initMediaConversion() {
        // Web Codecs API 지원 확인
        if ('VideoEncoder' in window && 'VideoDecoder' in window) {
            this.webCodecsSupported = true;
        }

        // Web Audio API 지원 확인
        if ('AudioContext' in window || 'webkitAudioContext' in window) {
            this.webAudioSupported = true;
        }

        return true;
    }

    /**
     * 4-Tier 라우팅: Tier 매핑 데이터 로드
     */
    async loadTierMapping() {
        if (this.tierMapping) return;

        try {
            const response = await fetch('/docs/conversion-tier-mapping.json');
            if (!response.ok) {
                console.warn('Tier mapping 로드 실패, 기본 로직 사용');
                return;
            }
            this.tierMapping = await response.json();
            console.log('[Routing] Tier mapping 로드 완료:', this.tierMapping.metadata);
        } catch (error) {
            console.warn('[Routing] Tier mapping 로드 실패:', error);
        }
    }

    /**
     * 4-Tier 라우팅: 네트워크 속도 측정 (Mbps)
     */
    async estimateNetworkSpeed() {
        // 캐시된 속도 사용 (5분 유효)
        if (this.networkSpeed && this.networkSpeedTimestamp &&
            (Date.now() - this.networkSpeedTimestamp < 5 * 60 * 1000)) {
            return this.networkSpeed;
        }

        try {
            // 1MB 테스트 파일로 속도 측정
            const testSize = 1 * 1024 * 1024; // 1MB
            const startTime = Date.now();

            // 실제 서버에 작은 요청으로 속도 추정 (헬스 체크 엔드포인트)
            await fetch('/api/health', { method: 'HEAD' });

            const elapsed = (Date.now() - startTime) / 1000; // 초

            // 보수적 추정 (헤더만 받았으므로 10배로 계산)
            const estimatedSpeed = (testSize * 8) / (elapsed * 10 * 1000000);

            // 10 Mbps를 최소값으로 설정 (너무 낮으면 신뢰도 떨어짐)
            this.networkSpeed = Math.max(estimatedSpeed, 10);
            this.networkSpeedTimestamp = Date.now();

            console.log(`[Routing] 네트워크 속도 측정: ${this.networkSpeed.toFixed(1)} Mbps`);
            return this.networkSpeed;

        } catch (error) {
            // 측정 실패 시 보수적 기본값
            console.warn('[Routing] 네트워크 속도 측정 실패, 기본값 10 Mbps 사용');
            this.networkSpeed = 10;
            this.networkSpeedTimestamp = Date.now();
            return 10;
        }
    }

    /**
     * 4-Tier 라우팅: 변환 경로 결정
     */
    async decideConversionRoute(file, fromFormat, toFormat) {
        // Tier 매핑이 없으면 기존 로직 사용
        if (!this.tierMapping) {
            await this.loadTierMapping();
            if (!this.tierMapping) {
                return this.decideLegacyRoute(file, fromFormat, toFormat);
            }
        }

        const conversionKey = `${fromFormat}-to-${toFormat}`;
        const tier = this.getConversionTier(conversionKey);

        console.log(`[Routing] ${conversionKey} → Tier: ${tier}`);

        // Tier 1: 항상 클라이언트
        if (tier === 'ALWAYS_CLIENT') {
            return {
                method: 'client',
                reason: '빠르고 가벼운 변환 (프라이버시 보호)',
                confidence: 'high',
                tier: 'ALWAYS_CLIENT'
            };
        }

        // Tier 4: 항상 서버
        if (tier === 'ALWAYS_SERVER') {
            return {
                method: 'server',
                reason: '전문 소프트웨어 필요 또는 대용량 파일',
                confidence: 'high',
                tier: 'ALWAYS_SERVER'
            };
        }

        // Tier 2 & 3: 동적 판단
        const networkSpeed = await this.estimateNetworkSpeed();
        const fileSize = file.size;
        const fileSizeMB = fileSize / 1024 / 1024;

        // 벤치마크 데이터 로드
        const benchmark = this.tierMapping.benchmarkData?.[this.getFileType(fromFormat)]?.[conversionKey];

        if (!benchmark || !benchmark.client) {
            // 벤치마크 데이터 없으면 클라이언트 우선
            return {
                method: 'client',
                reason: '벤치마크 데이터 없음, 클라이언트 우선',
                confidence: 'medium',
                tier: tier || 'CLIENT_FIRST'
            };
        }

        // 변환 시간 추정 (초)
        const clientTime = benchmark.client.timePerMB * fileSizeMB;
        const serverTime = benchmark.server.timePerMB * fileSizeMB;

        // 네트워크 시간 추정 (초)
        const uploadTime = (fileSize * 8) / (networkSpeed * 1000000);
        const downloadTime = (fileSize * 0.5 * 8) / (networkSpeed * 1000000); // 압축 가정

        const totalClientTime = clientTime;
        const totalServerTime = uploadTime + serverTime + downloadTime;

        console.log(`[Routing] 시간 추정 - 클라이언트: ${totalClientTime.toFixed(1)}s, 서버: ${totalServerTime.toFixed(1)}s (업로드: ${uploadTime.toFixed(1)}s + 변환: ${serverTime.toFixed(1)}s + 다운로드: ${downloadTime.toFixed(1)}s)`);

        // Tier 2: 클라이언트 우선 + 동적 폴백
        if (tier === 'CLIENT_FIRST') {
            if (totalClientTime <= totalServerTime * 1.3) {
                return {
                    method: 'client',
                    reason: `클라이언트가 효율적 (${Math.round(totalClientTime)}초 vs ${Math.round(totalServerTime)}초)`,
                    confidence: totalClientTime < totalServerTime ? 'high' : 'medium',
                    tier: 'CLIENT_FIRST',
                    estimatedTime: totalClientTime
                };
            } else {
                return {
                    method: 'server',
                    reason: `서버가 빠름 (${Math.round(totalServerTime)}초 vs ${Math.round(totalClientTime)}초)`,
                    confidence: 'high',
                    tier: 'CLIENT_FIRST',
                    estimatedTime: totalServerTime
                };
            }
        }

        // Tier 3: 동적 판단
        if (tier === 'DYNAMIC') {
            if (totalServerTime * 1.3 < totalClientTime) {
                return {
                    method: 'server',
                    reason: `서버가 30% 이상 빠름 (${Math.round(totalServerTime)}초 vs ${Math.round(totalClientTime)}초)`,
                    confidence: 'high',
                    tier: 'DYNAMIC',
                    estimatedTime: totalServerTime
                };
            } else {
                return {
                    method: 'client',
                    reason: `클라이언트 선택 (${Math.round(totalClientTime)}초 vs ${Math.round(totalServerTime)}초, 프라이버시 우선)`,
                    confidence: 'medium',
                    tier: 'DYNAMIC',
                    estimatedTime: totalClientTime
                };
            }
        }

        // 기본: 클라이언트
        return {
            method: 'client',
            reason: '알 수 없는 Tier, 클라이언트 기본값',
            confidence: 'low',
            tier: 'UNKNOWN'
        };
    }

    /**
     * 4-Tier 라우팅: 변환 키로 Tier 찾기
     */
    getConversionTier(conversionKey) {
        if (!this.tierMapping || !this.tierMapping.tiers) {
            return null;
        }

        for (const [tierName, tierData] of Object.entries(this.tierMapping.tiers)) {
            if (tierData.conversions) {
                for (const conversionList of Object.values(tierData.conversions)) {
                    if (Array.isArray(conversionList) && conversionList.includes(conversionKey)) {
                        return tierName;
                    }
                }
            }
        }

        return null;
    }

    /**
     * 4-Tier 라우팅: 레거시 로직 (Tier 매핑 없을 때 폴백)
     */
    decideLegacyRoute(file, fromFormat, toFormat) {
        const estimatedTime = this.estimateConversionTime(file, fromFormat, toFormat);
        const useServerSide = estimatedTime > 30;

        return {
            method: useServerSide ? 'server' : 'client',
            reason: useServerSide
                ? `예상 시간 ${Math.round(estimatedTime)}초 (30초 초과)`
                : `예상 시간 ${Math.round(estimatedTime)}초 (30초 이하)`,
            confidence: 'medium',
            tier: 'LEGACY',
            estimatedTime
        };
    }

    /**
     * 파일 변환 메인 함수
     */
    async convert(file, outputFormat, options = {}, onProgress) {
        const inputExt = this.getFileExtension(file.name);
        const inputType = this.getFileType(inputExt);
        const outputType = this.getFileType(outputFormat);

        // 4-Tier 라우팅: 최적 변환 경로 결정
        const routingDecision = await this.decideConversionRoute(file, inputExt, outputFormat);

        console.log(`[Conversion] 파일 크기: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        console.log(`[Routing] 방식: ${routingDecision.method} (${routingDecision.reason})`);
        console.log(`[Routing] Tier: ${routingDecision.tier}, 신뢰도: ${routingDecision.confidence}`);

        // 서버사이드 변환
        if (routingDecision.method === 'server') {
            const estimatedTime = routingDecision.estimatedTime
                ? Math.round(routingDecision.estimatedTime)
                : '알 수 없음';
            onProgress?.(5, `서버에서 변환합니다 (${routingDecision.reason})`);
            return await this.convertWithServer(file, outputFormat, options, onProgress);
        }

        // 이미지 변환 (클라이언트사이드)
        if (inputType === 'image' && outputType === 'image') {
            return await this.convertImage(file, outputFormat, options, onProgress);
        }

        // GIF → 비디오 변환 (특별 처리 - FFmpeg.wasm 사용)
        if (inputExt === 'gif' && outputType === 'video') {
            return await this.convertGifToVideo(file, outputFormat, options, onProgress);
        }

        // 비디오/오디오 변환 (FFmpeg.wasm - 클라이언트사이드)
        if ((inputType === 'video' || inputType === 'audio') ||
            (outputType === 'video' || outputType === 'audio')) {
            return await this.convertWithFFmpeg(file, outputFormat, options, onProgress);
        }

        // 문서 변환 (제한적 지원 - 클라이언트사이드)
        if (inputType === 'document' || outputType === 'document') {
            return await this.convertDocument(file, outputFormat, options, onProgress);
        }

        throw new Error(`지원하지 않는 변환입니다: ${inputExt} → ${outputFormat}`);
    }

    /**
     * 변환 시간 예측 (초 단위)
     *
     * 기준:
     * - 이미지: 즉각적 (항상 클라이언트)
     * - 비디오/오디오: 파일 크기와 형식 복잡도 기반
     * - 문서: 즉각적 (항상 클라이언트)
     *
     * @param {File} file - 입력 파일
     * @param {string} inputFormat - 입력 형식
     * @param {string} outputFormat - 출력 형식
     * @returns {number} 예상 시간 (초)
     */
    estimateConversionTime(file, inputFormat, outputFormat) {
        const fileSizeMB = file.size / 1024 / 1024;
        const inputType = this.getFileType(inputFormat);
        const outputType = this.getFileType(outputFormat);

        // 이미지 변환: 거의 즉각적 (Canvas API)
        if (inputType === 'image' && outputType === 'image') {
            return 0.5; // 0.5초
        }

        // 문서 변환: 빠름
        if (inputType === 'document' || outputType === 'document') {
            return fileSizeMB * 0.5; // 1MB당 0.5초
        }

        // 비디오/오디오 변환: FFmpeg.wasm은 느림
        if (inputType === 'video' || outputType === 'video') {
            // GIF 변환: 매우 느림 (픽셀 처리 많음)
            if (inputFormat === 'gif' || outputFormat === 'gif') {
                return fileSizeMB * 8; // 1MB당 8초
            }

            // WebM 변환: 느림 (VP8/VP9 코덱)
            if (outputFormat === 'webm') {
                return fileSizeMB * 4; // 1MB당 4초
            }

            // 기타 비디오 변환
            return fileSizeMB * 3; // 1MB당 3초
        }

        // 오디오 변환: 비교적 빠름
        if (inputType === 'audio' && outputType === 'audio') {
            return fileSizeMB * 2; // 1MB당 2초
        }

        // 크로스 카테고리 변환 (비디오→오디오 등)
        return fileSizeMB * 2.5; // 1MB당 2.5초
    }

    /**
     * 서버사이드 변환 (EC2 + native FFmpeg)
     *
     * 30초 이상 걸릴 것으로 예상되는 큰 파일을 서버에서 변환
     *
     * @param {File} file - 입력 파일
     * @param {string} outputFormat - 출력 형식
     * @param {object} options - 변환 옵션
     * @param {function} onProgress - 진행률 콜백
     * @returns {Promise<Blob>} 변환된 파일
     */
    async convertWithServer(file, outputFormat, options = {}, onProgress) {
        try {
            onProgress?.(10, '서버로 파일 업로드 중...');

            // FormData 생성
            const formData = new FormData();
            formData.append('file', file);
            formData.append('outputFormat', outputFormat);
            formData.append('settings', JSON.stringify(options));

            // 서버 API 호출
            const response = await fetch('/api/convert', {
                method: 'POST',
                body: formData
            });

            // 응답 처리 (HTML 에러 페이지 대응)
            if (!response.ok) {
                let errorMessage = `서버 변환 실패 (${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (parseError) {
                    // JSON 파싱 실패 시 텍스트로 읽기 (HTML 에러 페이지 등)
                    const errorText = await response.text();
                    if (errorText.includes('502 Bad Gateway')) {
                        errorMessage = '서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요.';
                    } else if (errorText.includes('504 Gateway Timeout')) {
                        errorMessage = '서버 응답 시간이 초과되었습니다. 파일이 너무 크거나 서버가 바쁩니다.';
                    } else {
                        errorMessage = `서버 오류: ${response.statusText}`;
                    }
                }
                throw new Error(errorMessage);
            }

            onProgress?.(20, '변환 작업 대기 중...');

            // 응답 JSON 파싱 (202 Accepted - 비동기 처리)
            const result = await response.json();

            // jobId와 downloadUrl 확인
            if (!result.jobId || !result.downloadUrl) {
                throw new Error('서버 응답이 올바르지 않습니다');
            }

            // 진행률 폴링 (최대 5분)
            const maxAttempts = 150; // 5분 (2초마다 체크)
            let attempts = 0;
            let jobStatus = result.status;

            while (jobStatus !== 'completed' && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
                attempts++;

                // 진행률 확인
                const progressResponse = await fetch(result.progressUrl || `/api/progress/${result.jobId}`);
                if (progressResponse.ok) {
                    const progressData = await progressResponse.json();
                    jobStatus = progressData.status;

                    // 진행률 업데이트
                    if (progressData.progress) {
                        const serverProgress = Math.min(progressData.progress, 90);
                        onProgress?.(20 + (serverProgress * 0.6), progressData.message || '서버에서 변환 중...');
                    }

                    // 실패 상태
                    if (jobStatus === 'failed') {
                        throw new Error(progressData.error || '서버 변환 실패');
                    }
                } else {
                    console.warn('[Server] 진행률 확인 실패, 계속 시도 중...');
                }
            }

            // 타임아웃 체크
            if (jobStatus !== 'completed') {
                throw new Error('서버 변환 시간이 초과되었습니다 (5분)');
            }

            onProgress?.(85, '변환된 파일 다운로드 중...');

            // 변환된 파일 다운로드
            const downloadResponse = await fetch(result.downloadUrl);

            if (!downloadResponse.ok) {
                throw new Error(`파일 다운로드 실패: ${downloadResponse.status}`);
            }

            const blob = await downloadResponse.blob();

            // 파일 크기 검증
            if (blob.size === 0) {
                throw new Error('변환된 파일이 비어있습니다');
            }

            onProgress?.(100, '서버 변환 완료!');
            return blob;

        } catch (error) {
            console.error('[Server Conversion Error]', error);

            // 에러 메시지 정제 (HTML 태그 제거)
            let errorMessage = error.message;
            if (errorMessage.includes('<html>') || errorMessage.includes('<!DOCTYPE')) {
                errorMessage = '서버 오류가 발생했습니다. 관리자에게 문의하세요.';
            }

            throw new Error(`서버 변환 실패: ${errorMessage}`);
        }
    }

    /**
     * 이미지 변환 (Canvas API 사용)
     */
    async convertImage(file, outputFormat, options = {}, onProgress) {
        return new Promise((resolve, reject) => {
            onProgress?.(10, '이미지 로딩 중...');

            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = async () => {
                try {
                    onProgress?.(30, '이미지 처리 중...');
                    
                    // 캔버스 크기 설정
                    let width = img.naturalWidth || img.width;
                    let height = img.naturalHeight || img.height;

                    console.log(`원본 이미지 크기: ${width} x ${height}`);
                    console.log(`이미지 로드 상태 - complete: ${img.complete}, src: ${img.src.substring(0, 50)}...`);

                    // 크기 유효성 검사 및 정수 변환
                    width = parseInt(width) || 0;
                    height = parseInt(height) || 0;

                    console.log(`정수 변환 후 크기: ${width} x ${height}`);

                    if (width === 0 || height === 0) {
                        throw new Error(`이미지 크기가 0입니다: ${width} x ${height}`);
                    }

                    // 리사이즈 옵션 처리
                    if (options.resize && options.resize !== 'none' && options.resize !== 'original') {
                        const scaleStr = options.resize.replace('%', '');
                        const scale = parseFloat(scaleStr) / 100;
                        console.log(`리사이즈 스케일: ${scaleStr}% -> ${scale}`);

                        if (!isNaN(scale) && scale > 0) {
                            width = Math.round(width * scale);
                            height = Math.round(height * scale);
                            console.log(`리사이즈 후 크기: ${width} x ${height}`);
                        } else {
                            console.log('리사이즈 스케일이 유효하지 않음, 원본 크기 유지');
                        }
                    }

                    // Canvas 크기를 명시적으로 설정
                    canvas.width = width;
                    canvas.height = height;

                    console.log(`Canvas 크기 설정 시도: width=${width}, height=${height}`);
                    console.log(`Canvas 실제 크기: ${canvas.width} x ${canvas.height}`);

                    // Canvas 크기가 0인 경우 강제로 재설정
                    if (canvas.width === 0 || canvas.height === 0) {
                        console.log('Canvas 크기가 0이므로 강제 재설정 시도');
                        canvas.setAttribute('width', width);
                        canvas.setAttribute('height', height);
                        console.log(`강제 재설정 후: ${canvas.width} x ${canvas.height}`);
                    }

                    // PNG → JPEG 변환시 투명도 처리
                    const mimeType = this.getImageMimeType(outputFormat);
                    if (mimeType === 'image/jpeg') {
                        // JPEG는 투명도를 지원하지 않으므로 흰색 배경 추가
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, width, height);
                    }

                    // 이미지 그리기
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    onProgress?.(60, '이미지 변환 중...');
                    
                    // 품질 설정 - 형식별로 최적화
                    let quality;

                    // 품질 설정 - 원본 품질 우선
                    if (mimeType === 'image/jpeg' || mimeType === 'image/webp') {
                        // 기본값: 원본 품질 유지 (95%)
                        quality = options.quality ? options.quality / 100 : 0.95;
                        // JPEG quality는 0.0~1.0 범위, 1.0은 피하고 최대 0.98 사용
                        if (quality >= 1.0) quality = 0.98;
                    } else {
                        // PNG, GIF 등은 무손실 압축 (quality 사용하지 않음)
                        quality = undefined;
                    }

                    // 압축 옵션이 명시적으로 설정된 경우에만 압축 적용
                    if (options.compression && options.compression !== 'none') {
                        const compressionQuality = {
                            'low': 0.90,    // 압축 낮음 = 품질 90%
                            'medium': 0.80, // 압축 중간 = 품질 80%
                            'high': 0.65    // 압축 높음 = 품질 65%
                        };

                        if (mimeType === 'image/jpeg' || mimeType === 'image/webp') {
                            quality = compressionQuality[options.compression] || quality;
                        }
                    }

                    // Blob으로 변환
                    console.log(`변환 설정 - mimeType: ${mimeType}, quality: ${quality}`);

                    // 더 안전한 변환 방식
                    try {
                        console.log('Canvas 변환 시작...');

                        // 1단계: toDataURL 시도
                        let dataURL;

                        if (mimeType === 'image/jpeg') {
                            // JPEG는 quality 0.1~0.9 범위로 제한
                            const safeQuality = Math.min(Math.max(quality || 0.8, 0.1), 0.9);
                            console.log(`JPEG 변환 시도 - quality: ${safeQuality}`);
                            dataURL = canvas.toDataURL('image/jpeg', safeQuality);
                            console.log(`JPEG 변환 완료 - DataURL 앞 50자: ${dataURL.substring(0, 50)}`);
                        } else {
                            console.log(`${mimeType} 변환 시도`);
                            dataURL = canvas.toDataURL(mimeType);
                            console.log(`${mimeType} 변환 완료 - DataURL 앞 50자: ${dataURL.substring(0, 50)}`);
                        }

                        console.log(`DataURL 생성 결과 - 길이: ${dataURL ? dataURL.length : 'null'}, 유효성: ${dataURL && dataURL !== 'data:,' && dataURL.length >= 100}`);

                        if (!dataURL || dataURL === 'data:,' || dataURL.length < 100) {
                            console.error('DataURL 검증 실패:', {
                                exists: !!dataURL,
                                notEmpty: dataURL !== 'data:,',
                                hasLength: dataURL && dataURL.length >= 100,
                                actualLength: dataURL ? dataURL.length : 0
                            });
                            throw new Error('DataURL 생성 실패');
                        }

                        console.log('DataURL 생성 성공, 길이:', dataURL.length);

                        // 2단계: DataURL을 Blob으로 변환 (fetch 방식)
                        try {
                            const response = await fetch(dataURL);
                            const blob = await response.blob();

                            if (!blob || blob.size === 0) {
                                throw new Error('Blob 크기가 0');
                            }

                            const fileSizeKB = blob.size / 1024;
                            console.log(`변환 성공! 파일 크기: ${fileSizeKB.toFixed(2)}KB`);

                            onProgress?.(100, '변환 완료!');
                            resolve(blob);
                            return;

                        } catch (fetchError) {
                            console.log('fetch 방식 실패, 수동 변환 시도:', fetchError);

                            // 3단계: 수동으로 DataURL을 Blob으로 변환
                            const base64Data = dataURL.split(',')[1];
                            const binaryString = atob(base64Data);
                            const bytes = new Uint8Array(binaryString.length);

                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }

                            const blob = new Blob([bytes], { type: mimeType });

                            if (blob.size === 0) {
                                throw new Error('수동 Blob 생성 실패');
                            }

                            const fileSizeKB = blob.size / 1024;
                            console.log(`수동 변환 성공! 파일 크기: ${fileSizeKB.toFixed(2)}KB`);

                            onProgress?.(100, '변환 완료!');
                            resolve(blob);
                        }

                    } catch (error) {
                        console.error('모든 변환 방식 실패:', error);
                        reject(new Error(`이미지 변환 실패: ${error.message}`));
                    }
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('이미지 로드 실패'));
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Web API를 사용한 미디어 변환
     */
    async convertMediaWithWebAPI(file, outputFormat, options = {}, onProgress) {
        await this.initMediaConversion();

        const inputExt = this.getFileExtension(file.name);
        const inputType = this.getFileType(inputExt);
        const outputType = this.getFileType(outputFormat);

        // GIF → 비디오 특별 처리 (GIF는 image 타입이지만 애니메이션이 있음)
        if (inputExt === 'gif' && outputType === 'video') {
            return await this.convertGifToVideo(file, outputFormat, options, onProgress);
        }

        // 비디오 변환
        if ((inputType === 'video' || outputType === 'video')) {
            return await this.convertVideoWithWebAPI(file, outputFormat, options, onProgress);
        }

        // 오디오 변환
        if ((inputType === 'audio' || outputType === 'audio')) {
            return await this.convertAudioWithWebAPI(file, outputFormat, options, onProgress);
        }

        throw new Error('지원하지 않는 미디어 변환입니다.');
    }

    /**
     * Web API를 사용한 비디오 변환
     */
    async convertVideoWithWebAPI(file, outputFormat, options = {}, onProgress) {
        onProgress?.(10, '비디오 로딩 중...');

        const videoElement = document.createElement('video');

        return new Promise((resolve, reject) => {
            videoElement.onloadedmetadata = async () => {
                try {
                    const outputType = this.getFileType(outputFormat);

                    if (outputType === 'image') {
                        // 비디오 → 이미지 변환
                        if (outputFormat.toLowerCase() === 'gif') {
                            // 비디오 → GIF 애니메이션 변환
                            const gifBlob = await this.convertVideoToGif(videoElement, options, onProgress);
                            resolve(gifBlob);
                        } else {
                            // 비디오 → 썸네일 이미지 (JPG, PNG 등)
                            const imageBlob = await this.extractVideoThumbnail(videoElement, outputFormat, onProgress);
                            resolve(imageBlob);
                        }
                    } else if (outputType === 'audio') {
                        // 비디오 → 오디오 변환 (오디오 트랙 추출)
                        const audioBlob = await this.extractAudioFromVideo(videoElement, outputFormat, options, onProgress);
                        resolve(audioBlob);
                    } else if (outputType === 'video') {
                        // 비디오 → 비디오 형식 변환 (MediaRecorder 사용)
                        const videoBlob = await this.convertVideoFormat(videoElement, outputFormat, options, onProgress);
                        resolve(videoBlob);
                    } else {
                        reject(new Error('지원하지 않는 비디오 변환 형식입니다.'));
                    }

                } catch (error) {
                    reject(error);
                }
            };

            videoElement.onerror = () => reject(new Error('비디오 로드 실패'));
            videoElement.src = URL.createObjectURL(file);
            videoElement.load();
        });
    }

    /**
     * 비디오에서 썸네일 추출
     */
    async extractVideoThumbnail(videoElement, outputFormat, onProgress) {
        onProgress?.(30, '썸네일 추출 중...');

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        // 비디오 중간 지점으로 이동
        videoElement.currentTime = videoElement.duration / 2;

        return new Promise((resolve, reject) => {
            videoElement.onseeked = () => {
                try {
                    onProgress?.(70, '이미지 변환 중...');

                    ctx.drawImage(videoElement, 0, 0);

                    canvas.toBlob(blob => {
                        if (blob) {
                            onProgress?.(100, '썸네일 추출 완료!');
                            resolve(blob);
                        } else {
                            reject(new Error('썸네일 추출 실패'));
                        }
                    }, this.getImageMimeType(outputFormat), 0.9);

                } catch (error) {
                    reject(error);
                }
            };
        });
    }

    /**
     * MediaRecorder API를 사용한 비디오 형식 변환
     */
    async convertVideoFormat(videoElement, outputFormat, options, onProgress) {
        onProgress?.(30, '비디오 스트림 처리 중...');

        // MediaRecorder가 지원하는 MIME 타입 확인
        const mimeType = this.getVideoMimeType(outputFormat);

        if (!MediaRecorder.isTypeSupported(mimeType)) {
            throw new Error(`브라우저에서 ${outputFormat} 형식을 지원하지 않습니다.`);
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        const stream = canvas.captureStream(30); // 30 FPS
        const mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
        const recordedChunks = [];

        return new Promise((resolve, reject) => {
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: mimeType });
                onProgress?.(100, '비디오 변환 완료!');
                resolve(blob);
            };

            mediaRecorder.onerror = reject;

            // 비디오 재생하면서 캔버스에 그리기
            let frameCount = 0;
            const totalFrames = Math.floor(videoElement.duration * 30);

            const drawFrame = () => {
                if (videoElement.ended) {
                    mediaRecorder.stop();
                    return;
                }

                ctx.drawImage(videoElement, 0, 0);
                frameCount++;

                const progress = 30 + (frameCount / totalFrames) * 60;
                onProgress?.(Math.min(progress, 90), `프레임 처리 중... ${frameCount}/${totalFrames}`);

                requestAnimationFrame(drawFrame);
            };

            videoElement.onplay = () => {
                mediaRecorder.start();
                drawFrame();
            };

            videoElement.play();
        });
    }

    /**
     * 비디오 형식의 MIME 타입 반환
     */
    getVideoMimeType(format) {
        const videoMimeTypes = {
            'webm': 'video/webm;codecs=vp8',
            'mp4': 'video/mp4;codecs=h264',
            'mov': 'video/quicktime'
        };
        return videoMimeTypes[format.toLowerCase()] || 'video/webm;codecs=vp8';
    }

    /**
     * Web Audio API를 사용한 오디오 변환
     */
    async convertAudioWithWebAPI(file, outputFormat, options = {}, onProgress) {
        onProgress?.(10, '오디오 로딩 중...');

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        try {
            const arrayBuffer = await file.arrayBuffer();
            onProgress?.(30, '오디오 디코딩 중...');

            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            onProgress?.(60, '오디오 변환 중...');

            // 출력 형식에 따른 변환
            let resultBlob;
            switch (outputFormat.toLowerCase()) {
                case 'wav':
                    resultBlob = this.audioBufferToWav(audioBuffer);
                    break;
                case 'mp3':
                    resultBlob = await this.audioBufferToMp3(audioBuffer, options);
                    break;
                case 'ogg':
                    resultBlob = this.audioBufferToOgg(audioBuffer, options);
                    break;
                case 'flac':
                    resultBlob = this.audioBufferToFlac(audioBuffer);
                    break;
                default:
                    // 기본적으로 WAV로 변환
                    resultBlob = this.audioBufferToWav(audioBuffer);
            }

            onProgress?.(100, '변환 완료!');
            return resultBlob;

        } catch (error) {
            audioContext.close();
            throw new Error('오디오 변환 실패: ' + error.message);
        } finally {
            audioContext.close();
        }
    }

    /**
     * AudioBuffer를 MP3로 변환 (Web Audio API + MP3 인코딩)
     */
    async audioBufferToMp3(buffer, options = {}) {
        // 실제 MP3 인코딩은 복잡하므로 WAV로 변환 후 브라우저의 MediaRecorder API 활용
        return this.audioBufferToWav(buffer);
    }

    /**
     * AudioBuffer를 OGG로 변환
     */
    audioBufferToOgg(buffer, options = {}) {
        // OGG 변환도 WAV로 대체 (브라우저 호환성을 위해)
        return this.audioBufferToWav(buffer);
    }

    /**
     * AudioBuffer를 FLAC로 변환
     */
    audioBufferToFlac(buffer) {
        // FLAC 변환도 WAV로 대체 (무손실 특성 유지)
        return this.audioBufferToWav(buffer);
    }

    /**
     * AudioBuffer를 WAV 형식으로 변환
     */
    audioBufferToWav(buffer) {
        const length = buffer.length;
        const numberOfChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;

        // WAV 헤더 생성
        const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
        const view = new DataView(arrayBuffer);

        // WAV 헤더 작성
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * numberOfChannels * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numberOfChannels * 2, true);
        view.setUint16(32, numberOfChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * numberOfChannels * 2, true);

        // 오디오 데이터 작성
        let offset = 44;
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
                view.setInt16(offset, sample * 0x7FFF, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    /**
     * 비디오에서 오디오 트랙 추출 (VIDEO → AUDIO 크로스 카테고리)
     */
    async extractAudioFromVideo(videoElement, outputFormat, options = {}, onProgress) {
        onProgress?.(10, '오디오 트랙 추출 중...');

        // AudioContext 생성
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        try {
            // MediaElementSource로 비디오의 오디오 트랙 가져오기
            const source = audioContext.createMediaElementSource(videoElement);
            const destination = audioContext.createMediaStreamDestination();
            source.connect(destination);

            onProgress?.(30, '오디오 녹음 중...');

            // MediaRecorder로 오디오 녹음
            const mimeType = this.getAudioMimeTypeForRecording(outputFormat);
            const mediaRecorder = new MediaRecorder(destination.stream, {
                mimeType: mimeType,
                audioBitsPerSecond: options.bitrate || 128000
            });

            const recordedChunks = [];

            return new Promise((resolve, reject) => {
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        recordedChunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    const blob = new Blob(recordedChunks, { type: mimeType });
                    onProgress?.(100, '오디오 추출 완료!');
                    audioContext.close();
                    resolve(blob);
                };

                mediaRecorder.onerror = (error) => {
                    audioContext.close();
                    reject(error);
                };

                // 비디오 재생 시작
                videoElement.currentTime = 0;
                videoElement.muted = false;
                mediaRecorder.start();

                videoElement.onended = () => {
                    mediaRecorder.stop();
                };

                videoElement.onplay = () => {
                    const duration = videoElement.duration;
                    const startTime = Date.now();

                    const updateProgress = () => {
                        if (videoElement.ended || videoElement.paused) return;

                        const elapsed = (Date.now() - startTime) / 1000;
                        const progress = Math.min((elapsed / duration) * 100, 99);
                        onProgress?.(30 + progress * 0.6, `오디오 추출 중... ${Math.round(progress)}%`);

                        if (!videoElement.ended) {
                            requestAnimationFrame(updateProgress);
                        }
                    };

                    updateProgress();
                };

                videoElement.play().catch(reject);
            });

        } catch (error) {
            audioContext.close();
            throw new Error('오디오 추출 실패: ' + error.message);
        }
    }

    /**
     * 비디오를 GIF 애니메이션으로 변환 (VIDEO → GIF 크로스 카테고리)
     */
    async convertVideoToGif(videoElement, options = {}, onProgress) {
        onProgress?.(10, 'GIF 변환 준비 중...');

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // GIF 크기 설정 (기본값: 원본 크기의 50%)
        const scale = options.scale || 0.5;
        canvas.width = Math.round(videoElement.videoWidth * scale);
        canvas.height = Math.round(videoElement.videoHeight * scale);

        // GIF 프레임 수 설정 (기본값: 10fps, 최대 5초)
        const fps = options.fps || 10;
        const maxDuration = options.maxDuration || 5; // 초
        const totalFrames = Math.min(Math.round(videoElement.duration * fps), fps * maxDuration);
        const frameInterval = videoElement.duration / totalFrames;

        onProgress?.(20, `GIF 프레임 추출 중... (0/${totalFrames})`);

        const frames = [];

        try {
            // 각 프레임 추출
            for (let i = 0; i < totalFrames; i++) {
                videoElement.currentTime = i * frameInterval;

                await new Promise((resolve) => {
                    videoElement.onseeked = () => {
                        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

                        // Canvas를 이미지 데이터로 변환
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        frames.push(imageData);

                        const progress = 20 + (i / totalFrames) * 60;
                        onProgress?.(progress, `GIF 프레임 추출 중... (${i + 1}/${totalFrames})`);
                        resolve();
                    };
                });
            }

            onProgress?.(80, 'GIF 인코딩 중...');

            // GIF 인코딩 (gif.js 라이브러리 사용)
            await this.loadGifJs();

            const gif = new GIF({
                workers: 2,
                quality: options.quality || 10,
                width: canvas.width,
                height: canvas.height,
                workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
            });

            // 프레임 추가
            frames.forEach((imageData) => {
                // ImageData를 canvas에 그려서 추가
                ctx.putImageData(imageData, 0, 0);
                gif.addFrame(canvas, { copy: true, delay: 1000 / fps });
            });

            return new Promise((resolve, reject) => {
                gif.on('finished', (blob) => {
                    onProgress?.(100, 'GIF 생성 완료!');
                    resolve(blob);
                });

                gif.on('error', reject);

                gif.render();
            });

        } catch (error) {
            throw new Error('GIF 변환 실패: ' + error.message);
        }
    }

    /**
     * gif.js 라이브러리 동적 로드
     */
    async loadGifJs() {
        if (window.GIF) return;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('gif.js 로드 실패'));
            document.head.appendChild(script);
        });
    }

    /**
     * GIF → MP4 변환 (FFmpeg.wasm 사용)
     *
     * 작은 GIF 파일을 빠르게 변환 (<5MB 권장)
     * - h.264 인코딩
     * - 웹 최적화 (faststart)
     * - 30fps 고정
     */
    async convertGifToVideo(file, outputFormat, options = {}, onProgress) {
        // FFmpeg 초기화 (딱 1번만, 이후엔 재사용)
        await this.initFFmpeg(onProgress);

        const inputName = 'input.gif';
        const outputName = `output.${outputFormat}`;

        try {
            onProgress?.(20, 'GIF 파일 준비 중...');

            // 입력 GIF 파일 쓰기
            this.ffmpeg.FS('writeFile', inputName, await this.fetchFile(file));

            onProgress?.(30, 'GIF → 비디오 변환 시작...');

            // FFmpeg 명령 실행 (빠른 프리셋 사용)
            const args = [
                '-i', inputName,
                '-c:v', 'libx264',         // h.264 코덱
                '-pix_fmt', 'yuv420p',     // 호환성
                '-movflags', '+faststart',  // 웹 스트리밍
                '-vf', 'fps=30',           // 30fps 고정
                '-preset', 'ultrafast',     // 빠른 인코딩 (veryfast보다 빠름)
                '-crf', '28',              // 품질 (낮춰서 속도 향상)
                outputName
            ];

            console.log('FFmpeg 명령 (GIF→MP4):', args);
            await this.ffmpeg.run(...args);

            onProgress?.(90, '변환된 비디오 추출 중...');

            // 출력 파일 읽기
            const data = this.ffmpeg.FS('readFile', outputName);

            // Blob 생성
            const blob = new Blob([data.buffer], {
                type: this.getMimeType(outputFormat)
            });

            // 정리
            this.ffmpeg.FS('unlink', inputName);
            this.ffmpeg.FS('unlink', outputName);

            onProgress?.(100, 'GIF → 비디오 변환 완료!');
            return blob;

        } catch (error) {
            console.error('GIF → 비디오 변환 오류:', error);
            throw new Error('GIF 변환 실패: ' + error.message);
        }
    }

    /**
     * 녹음용 오디오 MIME 타입 가져오기
     */
    getAudioMimeTypeForRecording(format) {
        const mimeTypes = {
            'webm': 'audio/webm',
            'mp4': 'audio/mp4',
            'ogg': 'audio/ogg',
            'wav': 'audio/wav'
        };

        const mimeType = mimeTypes[format.toLowerCase()] || 'audio/webm';

        // 브라우저 지원 확인
        if (MediaRecorder.isTypeSupported(mimeType)) {
            return mimeType;
        }

        // Fallback to webm
        return 'audio/webm';
    }

    /**
     * FFmpeg를 사용한 비디오/오디오 변환
     */
    async convertWithFFmpeg(file, outputFormat, options = {}, onProgress) {
        // FFmpeg 초기화
        await this.initFFmpeg(onProgress);
        
        const inputExt = this.getFileExtension(file.name);
        const inputName = `input.${inputExt}`;
        const outputName = `output.${outputFormat}`;
        
        try {
            onProgress?.(20, '파일 준비 중...');

            // 입력 파일 쓰기 (FFmpeg.wasm 0.12.x 새 API)
            console.log(`[Debug] 원본 파일 크기: ${file.size} bytes (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
            const fileData = new Uint8Array(await file.arrayBuffer());
            console.log(`[Debug] Uint8Array 크기: ${fileData.byteLength} bytes (${(fileData.byteLength / 1024 / 1024).toFixed(2)} MB)`);
            console.log(`[Debug] 데이터 무결성: 처음 4바이트 = ${Array.from(fileData.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

            await this.ffmpeg.writeFile(inputName, fileData);
            console.log(`[Debug] writeFile 완료: ${inputName}`);

            onProgress?.(30, '변환 시작...');

            // FFmpeg 명령 실행 (FFmpeg.wasm 0.12.x 새 API)
            const args = this.buildFFmpegCommand(inputName, outputName, outputFormat, options);
            await this.ffmpeg.exec(args);

            onProgress?.(90, '파일 추출 중...');

            // 출력 파일 읽기 (FFmpeg.wasm 0.12.x 새 API)
            const data = await this.ffmpeg.readFile(outputName);

            // Blob 생성 (Uint8Array를 직접 사용)
            const blob = new Blob([data], {
                type: this.getMimeType(outputFormat)
            });

            // 정리 (FFmpeg.wasm 0.12.x 새 API)
            try {
                await this.ffmpeg.deleteFile(inputName);
                await this.ffmpeg.deleteFile(outputName);
            } catch (cleanupError) {
                console.warn('파일 정리 중 오류 (무시):', cleanupError);
            }

            onProgress?.(100, '변환 완료!');
            return blob;

        } catch (error) {
            console.error('FFmpeg 변환 오류:', error);
            console.error('오류 상세:', error.stack);
            throw new Error('파일 변환 실패: ' + (error.message || error.toString()));
        }
    }

    /**
     * 문서 변환 (PDF 포함)
     */
    async convertDocument(file, outputFormat, options = {}, onProgress) {
        const inputExt = this.getFileExtension(file.name);

        // PDF → 이미지 변환
        if (inputExt === 'pdf' && this.getFileType(outputFormat) === 'image') {
            return await this.pdfToImage(file, outputFormat, options, onProgress);
        }

        // 이미지 → PDF 변환
        if (this.getFileType(inputExt) === 'image' && outputFormat === 'pdf') {
            return await this.imageToPdf(file, options, onProgress);
        }

        // DOCX → PDF 변환
        if (inputExt === 'docx' && outputFormat === 'pdf') {
            return await this.docxToPdf(file, options, onProgress);
        }

        // DOC → PDF 변환 (구 형식, 제한적 지원)
        if (inputExt === 'doc' && outputFormat === 'pdf') {
            return await this.docToPdf(file, options, onProgress);
        }

        // XLSX/XLS → PDF 변환
        if ((inputExt === 'xlsx' || inputExt === 'xls') && outputFormat === 'pdf') {
            return await this.excelToPdf(file, options, onProgress);
        }

        // PPTX/PPT → PDF 변환
        if ((inputExt === 'pptx' || inputExt === 'ppt') && outputFormat === 'pdf') {
            return await this.powerPointToPdf(file, options, onProgress);
        }

        // 텍스트 → PDF 변환
        if ((inputExt === 'txt' || inputExt === 'rtf') && outputFormat === 'pdf') {
            return await this.textToPdf(file, options, onProgress);
        }

        // PDF → 텍스트 변환
        if (inputExt === 'pdf' && outputFormat === 'txt') {
            return await this.pdfToText(file, onProgress);
        }

        // 기본 텍스트 변환
        if (outputFormat === 'txt') {
            onProgress?.(50, '텍스트 추출 중...');
            const text = await file.text();
            const blob = new Blob([text], { type: 'text/plain' });
            onProgress?.(100, '변환 완료!');
            return blob;
        }

        throw new Error(`지원하지 않는 문서 변환입니다: ${inputExt} → ${outputFormat}`);
    }

    /**
     * PDF를 이미지로 변환
     */
    async pdfToImage(pdfFile, imageFormat, options = {}, onProgress) {
        onProgress?.(10, 'PDF 처리 중...');

        // PDF.js 로드
        await this.loadPdfJs();

        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        onProgress?.(30, 'PDF 페이지 렌더링 중...');

        // 첫 페이지만 변환 (나중에 옵션으로 여러 페이지 지원 가능)
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        onProgress?.(70, '이미지 변환 중...');

        // Canvas toBlob()이 지원하는 형식 확인
        const supportedFormats = ['jpg', 'jpeg', 'png', 'webp'];
        const normalizedFormat = imageFormat.toLowerCase();

        if (supportedFormats.includes(normalizedFormat)) {
            // Canvas toBlob() 직접 사용
            return new Promise((resolve, reject) => {
                canvas.toBlob(blob => {
                    if (blob) {
                        onProgress?.(100, '변환 완료!');
                        resolve(blob);
                    } else {
                        reject(new Error('PDF 이미지 변환 실패'));
                    }
                }, this.getImageMimeType(imageFormat), 0.95);
            });
        } else {
            // 지원 안 되는 형식: PDF → PNG → 타겟 형식 (2단계 변환)
            onProgress?.(75, `PDF → PNG 변환 중...`);

            const pngBlob = await new Promise((resolve, reject) => {
                canvas.toBlob(blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('PDF → PNG 변환 실패'));
                    }
                }, 'image/png');
            });

            onProgress?.(85, `PNG → ${imageFormat.toUpperCase()} 변환 중...`);

            // PNG Blob을 File 객체로 변환
            const pngFile = new File([pngBlob], 'temp.png', { type: 'image/png' });

            // convertImage() 사용하여 PNG → 타겟 형식 변환
            return await this.convertImage(pngFile, imageFormat, options, (progress, message) => {
                onProgress?.(85 + progress * 0.15, message);
            });
        }
    }

    /**
     * 이미지를 PDF로 변환
     */
    async imageToPdf(imageFile, options = {}, onProgress) {
        onProgress?.(10, '이미지 로딩 중...');
        
        // jsPDF 로드
        await this.loadJsPdf();
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    onProgress?.(30, 'PDF 생성 중...');
                    
                    const { jsPDF } = window.jspdf;
                    
                    // A4 크기로 PDF 생성
                    const pdf = new jsPDF({
                        orientation: img.width > img.height ? 'landscape' : 'portrait',
                        unit: 'mm',
                        format: 'a4'
                    });
                    
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    
                    // 이미지 비율 유지하면서 페이지에 맞추기
                    const imgRatio = img.width / img.height;
                    const pageRatio = pageWidth / pageHeight;
                    
                    let finalWidth = pageWidth;
                    let finalHeight = pageHeight;
                    
                    if (imgRatio > pageRatio) {
                        finalHeight = pageWidth / imgRatio;
                    } else {
                        finalWidth = pageHeight * imgRatio;
                    }
                    
                    // 중앙 정렬
                    const x = (pageWidth - finalWidth) / 2;
                    const y = (pageHeight - finalHeight) / 2;
                    
                    onProgress?.(70, 'PDF 렌더링 중...');
                    
                    // 이미지 추가
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    pdf.addImage(imgData, 'JPEG', x, y, finalWidth, finalHeight);
                    
                    onProgress?.(90, 'PDF 저장 중...');
                    
                    // Blob으로 변환
                    const pdfBlob = pdf.output('blob');
                    
                    onProgress?.(100, '변환 완료!');
                    resolve(pdfBlob);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('이미지 로드 실패'));
            img.src = URL.createObjectURL(imageFile);
        });
    }

    /**
     * 텍스트를 PDF로 변환 (모든 언어 지원 - HTML 렌더링 방식)
     */
    async textToPdf(textFile, options = {}, onProgress) {
        onProgress?.(10, '텍스트 읽는 중...');
        
        const text = await textFile.text();
        
        // 유니코드 폰트 로드
        await this.loadUniversalFonts();
        
        // jsPDF와 html2canvas 로드
        await this.loadJsPdf();
        await this.loadHtml2Canvas();
        
        onProgress?.(30, 'PDF 생성 준비 중...');
        
        // 임시 HTML 요소 생성 (모든 언어 지원)
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = `
            position: absolute;
            left: -9999px;
            top: -9999px;
            width: 794px;
            padding: 40px;
            background: white;
            font-family: 'Noto Sans', 'Noto Sans CJK SC', 'Noto Sans CJK TC', 'Noto Sans CJK JP', 'Noto Sans CJK KR', 
                         'Noto Sans Arabic', 'Noto Sans Thai', 'Noto Sans Hebrew', 'Noto Sans Bengali',
                         'Segoe UI', 'Arial Unicode MS', 'DejaVu Sans', 
                         'Microsoft YaHei', 'SimSun', 'Malgun Gothic', 'Arial', sans-serif;
            font-size: 14px;
            line-height: 1.8;
            color: #000;
            white-space: pre-wrap;
            word-wrap: break-word;
            unicode-bidi: plaintext;
            direction: ltr;
        `;
        
        // 텍스트를 HTML로 변환 (줄바꿈 유지)
        tempDiv.textContent = text;
        document.body.appendChild(tempDiv);
        
        onProgress?.(50, 'PDF 렌더링 중...');
        
        try {
            // HTML을 캔버스로 변환
            const canvas = await window.html2canvas(tempDiv, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            // 임시 요소 제거
            document.body.removeChild(tempDiv);
            
            onProgress?.(70, 'PDF 생성 중...');
            
            const { jsPDF } = window.jspdf;
            
            // A4 크기로 PDF 생성
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // 캔버스를 PDF에 추가
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;
            
            // 첫 페이지 추가
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            
            // 추가 페이지가 필요한 경우
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            onProgress?.(90, 'PDF 저장 중...');
            
            const pdfBlob = pdf.output('blob');
            
            onProgress?.(100, '변환 완료!');
            return pdfBlob;
            
        } catch (error) {
            // 임시 요소가 남아있다면 제거
            if (tempDiv.parentNode) {
                document.body.removeChild(tempDiv);
            }
            throw error;
        }
    }

    /**
     * html2canvas 라이브러리 로드
     */
    async loadHtml2Canvas() {
        if (window.html2canvas) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = () => {
                if (window.html2canvas) {
                    resolve();
                } else {
                    reject(new Error('html2canvas 로드 실패'));
                }
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * 모든 언어를 지원하는 유니버설 폰트 로드
     */
    async loadUniversalFonts() {
        if (window.universalFontsLoaded) return;
        
        try {
            // Google Fonts에서 다국어 지원 폰트 로드
            const fonts = [
                // 라틴 문자 (영어, 스페인어, 프랑스어 등)
                'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap',
                // 한국어
                'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap',
                // 일본어
                'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap',
                // 중국어 간체
                'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap',
                // 중국어 번체
                'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=swap',
                // 아랍어
                'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&display=swap',
                // 태국어
                'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;700&display=swap',
                // 히브리어
                'https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;700&display=swap',
                // 데바나가리 (힌디어 등)
                'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&display=swap',
                // 벵골어
                'https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&display=swap'
            ];
            
            // 모든 폰트 링크 추가
            for (const fontUrl of fonts) {
                const link = document.createElement('link');
                link.href = fontUrl;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
            
            // 폰트 로딩 대기 (선택적)
            await new Promise(resolve => setTimeout(resolve, 500));
            
            window.universalFontsLoaded = true;
        } catch (error) {
            console.warn('일부 폰트 로드 실패, 시스템 폰트 사용:', error);
        }
    }

    /**
     * PDF를 텍스트로 변환
     */
    async pdfToText(pdfFile, onProgress) {
        onProgress?.(10, 'PDF 로딩 중...');
        
        // PDF.js 로드
        await this.loadPdfJs();
        
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        onProgress?.(30, '텍스트 추출 중...');
        
        let fullText = '';
        const numPages = pdf.numPages;
        
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
            
            const progress = 30 + (60 * i / numPages);
            onProgress?.(progress, `페이지 ${i}/${numPages} 처리 중...`);
        }
        
        onProgress?.(100, '변환 완료!');
        
        return new Blob([fullText], { type: 'text/plain' });
    }

    /**
     * PDF.js 라이브러리 로드
     */
    async loadPdfJs() {
        if (window.pdfjsLib) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                if (window.pdfjsLib) {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
                        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    resolve();
                } else {
                    reject(new Error('PDF.js 로드 실패'));
                }
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * jsPDF 라이브러리 로드
     */
    async loadJsPdf() {
        if (window.jspdf) return;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                if (window.jspdf) {
                    resolve();
                } else {
                    reject(new Error('jsPDF 로드 실패'));
                }
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Mammoth.js 라이브러리 로드 (DOCX 처리용)
     */
    async loadMammoth() {
        if (window.mammoth) return;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
            script.onload = () => {
                if (window.mammoth) {
                    resolve();
                } else {
                    reject(new Error('Mammoth.js 로드 실패'));
                }
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * SheetJS 라이브러리 로드 (엑셀 처리용)
     */
    async loadSheetJS() {
        if (window.XLSX) return;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
            script.onload = () => {
                if (window.XLSX) {
                    resolve();
                } else {
                    reject(new Error('SheetJS 로드 실패'));
                }
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * DOCX를 PDF로 변환
     */
    async docxToPdf(docxFile, options = {}, onProgress) {
        try {
            onProgress?.(10, 'DOCX 처리 중...');

            // Mammoth.js 및 jsPDF 로드
            await Promise.all([this.loadMammoth(), this.loadJsPdf()]);

            onProgress?.(20, 'DOCX 파싱 중...');

            // DOCX → HTML 변환
            const arrayBuffer = await docxFile.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            const html = result.value;

            if (result.messages.length > 0) {
                console.warn('DOCX 변환 경고:', result.messages);
            }

            onProgress?.(50, 'PDF 생성 중...');

            // HTML → PDF 변환
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // HTML을 임시 div에 렌더링
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            tempDiv.style.cssText = `
                width: 170mm;
                padding: 10mm;
                font-family: Arial, sans-serif;
                font-size: 12pt;
                line-height: 1.5;
                color: #000;
            `;
            document.body.appendChild(tempDiv);

            onProgress?.(70, 'HTML 렌더링 중...');

            // HTML → PDF (html2canvas 없이 텍스트만)
            const pageHeight = pdf.internal.pageSize.getHeight();
            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 10;

            // 텍스트 추출 및 PDF에 추가
            const textContent = tempDiv.textContent || tempDiv.innerText;
            const lines = pdf.splitTextToSize(textContent, pageWidth - 2 * margin);

            let y = margin;
            const lineHeight = 7;

            pdf.setFontSize(12);

            for (let i = 0; i < lines.length; i++) {
                if (y + lineHeight > pageHeight - margin) {
                    pdf.addPage();
                    y = margin;
                }
                pdf.text(lines[i], margin, y);
                y += lineHeight;
            }

            // 임시 요소 제거
            document.body.removeChild(tempDiv);

            onProgress?.(90, 'PDF 저장 중...');

            const pdfBlob = pdf.output('blob');

            onProgress?.(100, '변환 완료!');
            return pdfBlob;

        } catch (error) {
            console.error('DOCX → PDF 변환 실패:', error);
            throw new Error('DOCX → PDF 변환 실패: ' + error.message);
        }
    }

    /**
     * DOC를 PDF로 변환 (서버 사이드)
     */
    async docToPdf(docFile, options = {}, onProgress) {
        onProgress?.(10, 'DOC 파일 서버로 전송 중...');
        return await this.convertOnServer(docFile, 'pdf', onProgress);
    }

    /**
     * Excel을 PDF로 변환
     */
    async excelToPdf(excelFile, options = {}, onProgress) {
        try {
            onProgress?.(10, 'Excel 처리 중...');

            // SheetJS 및 jsPDF 로드
            await Promise.all([this.loadSheetJS(), this.loadJsPdf()]);

            onProgress?.(20, 'Excel 파싱 중...');

            // Excel 파일 읽기
            const arrayBuffer = await excelFile.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });

            // 첫 번째 시트 선택
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            onProgress?.(40, 'HTML 변환 중...');

            // HTML 테이블로 변환
            const html = XLSX.utils.sheet_to_html(worksheet);

            onProgress?.(60, 'PDF 생성 중...');

            // HTML → PDF 변환
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            // HTML을 임시 div에 렌더링
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            tempDiv.style.cssText = `
                width: 270mm;
                font-family: Arial, sans-serif;
                font-size: 10pt;
            `;
            document.body.appendChild(tempDiv);

            // 테이블 데이터를 텍스트로 추출
            const textContent = tempDiv.textContent || tempDiv.innerText;
            const lines = pdf.splitTextToSize(textContent, 277 - 20); // landscape width - margin

            let y = 10;
            const lineHeight = 6;
            const pageHeight = pdf.internal.pageSize.getHeight();

            pdf.setFontSize(10);

            for (let i = 0; i < lines.length; i++) {
                if (y + lineHeight > pageHeight - 10) {
                    pdf.addPage();
                    y = 10;
                }
                pdf.text(lines[i], 10, y);
                y += lineHeight;
            }

            // 임시 요소 제거
            document.body.removeChild(tempDiv);

            onProgress?.(90, 'PDF 저장 중...');

            const pdfBlob = pdf.output('blob');

            onProgress?.(100, '변환 완료!');
            return pdfBlob;

        } catch (error) {
            console.error('Excel → PDF 변환 실패:', error);
            throw new Error('Excel → PDF 변환 실패: ' + error.message);
        }
    }

    /**
     * PowerPoint를 PDF로 변환 (서버 사이드)
     */
    async powerPointToPdf(pptFile, options = {}, onProgress) {
        onProgress?.(10, 'PowerPoint 파일 서버로 전송 중...');
        return await this.convertOnServer(pptFile, 'pdf', onProgress);
    }

    /**
     * 서버 사이드 변환 (DOC, PPTX, PPT)
     */
    async convertOnServer(file, outputFormat, onProgress) {
        const API_URL = window.location.hostname === 'localhost'
            ? 'http://localhost:3001'
            : 'https://hqmx.net';

        try {
            onProgress?.(20, '서버 변환 준비 중...');

            // FormData 생성
            const formData = new FormData();
            formData.append('file', file);
            formData.append('outputFormat', outputFormat);

            onProgress?.(30, '서버로 업로드 중...');

            // 서버로 요청
            const response = await fetch(`${API_URL}/api/convert`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '서버 변환 실패');
            }

            onProgress?.(80, '변환된 파일 다운로드 중...');

            // Blob으로 변환
            const blob = await response.blob();

            onProgress?.(100, '변환 완료!');

            return blob;

        } catch (error) {
            console.error('서버 변환 오류:', error);
            throw new Error(`서버 변환 실패: ${error.message}`);
        }
    }

    /**
     * FFmpeg 명령어 생성
     */
    buildFFmpegCommand(input, output, format, options) {
        const args = ['-i', input];

        // 비디오 변환 시 멀티스레드 활성화 (모든 가용 코어 사용)
        if (this.getFileType(format) === 'video') {
            args.push('-threads', '0');
        }

        // 포맷별 기본 설정
        switch(format) {
            // 비디오
            case 'mp4':
                args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '21');
                break;
            case 'webm':
                args.push('-c:v', 'libvpx', '-c:a', 'libvorbis');
                break;
            case 'avi':
                args.push('-c:v', 'mpeg4', '-vtag', 'XVID');
                break;
            case 'mov':
                args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '21', '-c:a', 'aac');
                break;
            case 'mkv':
                args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '21', '-c:a', 'aac');
                break;
            case 'flv':
                args.push('-c:v', 'flv', '-c:a', 'mp3');
                break;
            case 'wmv':
                args.push('-c:v', 'wmv2', '-c:a', 'wmav2');
                break;
            case 'm4v':
                args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '21', '-c:a', 'aac');
                break;
            case 'gif':
                // 비디오 → GIF 변환
                args.push('-vf', 'fps=10,scale=320:-1:flags=lanczos');
                break;

            // 오디오
            case 'mp3':
                args.push('-c:a', 'libmp3lame', '-b:a', '192k');
                break;
            case 'wav':
                args.push('-c:a', 'pcm_s16le');
                break;
            case 'ogg':
                args.push('-c:a', 'libvorbis', '-q:a', '4');
                break;
            case 'aac':
                args.push('-c:a', 'aac', '-b:a', '192k');
                break;
            case 'flac':
                args.push('-c:a', 'flac');
                break;
            case 'm4a':
                args.push('-c:a', 'aac', '-b:a', '192k');
                break;
            case 'wma':
                args.push('-c:a', 'wmav2', '-b:a', '192k');
                break;
            case 'opus':
                args.push('-c:a', 'libopus', '-b:a', '128k');
                break;
        }

        // 품질 설정
        if (options.quality) {
            if (this.getFileType(format) === 'video') {
                const crf = { high: '18', medium: '23', low: '28' };
                args.push('-crf', crf[options.quality] || '23');
            }
        }

        // 해상도 설정
        if (options.resolution && options.resolution !== 'original') {
            const resolutions = {
                '1080p': 'scale=1920:1080',
                '720p': 'scale=1280:720',
                '480p': 'scale=854:480',
                '360p': 'scale=640:360'
            };
            if (resolutions[options.resolution]) {
                args.push('-vf', resolutions[options.resolution]);
            }
        }

        // 비트레이트 설정
        if (options.bitrate) {
            if (this.getFileType(format) === 'audio') {
                args.push('-b:a', options.bitrate + 'k');
            } else {
                args.push('-b:v', options.bitrate + 'k');
            }
        }

        args.push(output);
        console.log('FFmpeg 명령:', args);
        return args;
    }

    /**
     * 파일 확장자 추출
     */
    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    /**
     * 파일 타입 판별
     */
    getFileType(extension) {
        const types = {
            video: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', '3gp', 'm4v', 'mpg', 'mpeg', 'ogv', 'xvid', 'asf', 'rm', 'vob', 'divx', 'h264', 'm2ts'],
            audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'aiff', 'au', 'ra', 'amr', 'ac3', 'mp2', 'caf', 'opus', 'dts'],
            image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tga', 'ico', 'psd', 'heic', 'avif'],
            document: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'epub', 'mobi', 'azw', 'azw3', 'fb2'],
            data: ['xls', 'xlsx', 'csv', 'json', 'xml', 'ods', 'numbers', 'tsv', 'sql'],
            archive: ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz']
        };

        for (const [type, extensions] of Object.entries(types)) {
            if (extensions.includes(extension.toLowerCase())) {
                return type;
            }
        }
        return 'unknown';
    }

    /**
     * MIME 타입 반환
     */
    getMimeType(format) {
        const mimeTypes = {
            // 비디오
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'avi': 'video/x-msvideo',
            'mov': 'video/quicktime',
            'mkv': 'video/x-matroska',
            'flv': 'video/x-flv',
            
            // 오디오
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'ogg': 'audio/ogg',
            'flac': 'audio/flac',
            'aac': 'audio/aac',
            'm4a': 'audio/mp4',
            
            // 이미지
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'svg': 'image/svg+xml',
            
            // 문서
            'pdf': 'application/pdf',
            'txt': 'text/plain'
        };

        return mimeTypes[format.toLowerCase()] || 'application/octet-stream';
    }

    /**
     * 이미지 MIME 타입
     */
    getImageMimeType(format) {
        const types = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'bmp': 'image/bmp'
        };
        return types[format.toLowerCase()] || 'image/png';
    }

    /**
     * 지원 여부 확인
     */
    isSupported(inputFormat, outputFormat) {
        const inputType = this.getFileType(inputFormat);
        const outputType = this.getFileType(outputFormat);

        // 같은 타입 간 변환
        if (inputType === outputType && inputType !== 'unknown') {
            return true;
        }

        // 비디오 → 오디오 변환
        if (inputType === 'video' && outputType === 'audio') {
            return true;
        }

        // 특수 케이스
        if (inputFormat === 'gif' && outputType === 'video') {
            return true;
        }

        return false;
    }
}

// 전역 인스턴스 생성
window.converterEngine = new ConverterEngine();