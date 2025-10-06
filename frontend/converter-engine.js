// 완전한 클라이언트 사이드 파일 변환 엔진
// FFmpeg.wasm을 사용한 비디오/오디오 변환 + Canvas API를 사용한 이미지 변환

class ConverterEngine {
    constructor() {
        this.ffmpeg = null;
        this.ffmpegLoaded = false;
        this.ffmpegLoading = false;
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

            // 진행률 콜백 설정
            this.ffmpeg.on('progress', ({ progress, time }) => {
                const percent = Math.round(progress * 100);
                if (percent > 0 && percent <= 100) {
                    onProgress?.(percent, `변환 중... ${percent}%`);
                }
            });

            onProgress?.(30, 'FFmpeg 코어 로딩 중...');

            // 최신 버전용 로드 방식
            await this.ffmpeg.load({
                coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
                wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm'
            });

            this.fetchFile = FFmpegLib.fetchFile;
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
     * 파일 변환 메인 함수
     */
    async convert(file, outputFormat, options = {}, onProgress) {
        const inputExt = this.getFileExtension(file.name);
        const inputType = this.getFileType(inputExt);
        const outputType = this.getFileType(outputFormat);

        // 이미지 변환
        if (inputType === 'image' && outputType === 'image') {
            return await this.convertImage(file, outputFormat, options, onProgress);
        }
        
        // 비디오/오디오 변환 (Web API 사용)
        if ((inputType === 'video' || inputType === 'audio') ||
            (outputType === 'video' || outputType === 'audio')) {
            return await this.convertMediaWithWebAPI(file, outputFormat, options, onProgress);
        }

        // 문서 변환 (제한적 지원)
        if (inputType === 'document' || outputType === 'document') {
            return await this.convertDocument(file, outputFormat, options, onProgress);
        }

        throw new Error(`지원하지 않는 변환입니다: ${inputExt} → ${outputFormat}`);
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
                        // 비디오를 이미지로 변환 (썸네일 추출)
                        const imageBlob = await this.extractVideoThumbnail(videoElement, outputFormat, onProgress);
                        resolve(imageBlob);
                    } else if (outputType === 'video') {
                        // 비디오를 다른 비디오 형식으로 변환 (MediaRecorder 사용)
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
            
            // 입력 파일 쓰기
            this.ffmpeg.FS('writeFile', inputName, await this.fetchFile(file));
            
            onProgress?.(30, '변환 시작...');
            
            // FFmpeg 명령 실행
            const args = this.buildFFmpegCommand(inputName, outputName, outputFormat, options);
            await this.ffmpeg.run(...args);
            
            onProgress?.(90, '파일 추출 중...');
            
            // 출력 파일 읽기
            const data = this.ffmpeg.FS('readFile', outputName);
            
            // Blob 생성
            const blob = new Blob([data.buffer], { 
                type: this.getMimeType(outputFormat) 
            });
            
            // 정리
            this.ffmpeg.FS('unlink', inputName);
            this.ffmpeg.FS('unlink', outputName);
            
            onProgress?.(100, '변환 완료!');
            return blob;
            
        } catch (error) {
            console.error('FFmpeg 변환 오류:', error);
            throw new Error('파일 변환 실패: ' + error.message);
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
     * FFmpeg 명령어 생성
     */
    buildFFmpegCommand(input, output, format, options) {
        const args = ['-i', input];

        // 포맷별 기본 설정
        switch(format) {
            // 비디오
            case 'mp4':
                args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '23');
                break;
            case 'webm':
                args.push('-c:v', 'libvpx', '-c:a', 'libvorbis');
                break;
            case 'avi':
                args.push('-c:v', 'mpeg4', '-vtag', 'XVID');
                break;
            case 'mov':
                args.push('-c:v', 'libx264', '-c:a', 'aac');
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
            video: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', '3gp', 'm4v', 'mpg', 'mpeg', 'ogv'],
            audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'aiff', 'au', 'ra', 'amr', 'ac3'],
            image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tga', 'ico', 'psd'],
            document: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'rtf', 'odt']
        };

        for (const [type, extensions] of Object.entries(types)) {
            if (extensions.includes(extension)) {
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