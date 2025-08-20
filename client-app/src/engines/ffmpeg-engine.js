// FFmpeg.wasm 기반 비디오/오디오 변환 엔진

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

class FFmpegEngine {
  constructor() {
    this.ffmpeg = null;
    this.loaded = false;
    this.loading = false;
    this.onProgress = null;
  }

  /**
   * FFmpeg 초기화 및 로딩
   */
  async load(onProgress) {
    if (this.loaded) return true;
    if (this.loading) {
      // 이미 로딩 중인 경우 완료까지 대기
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.loaded;
    }

    this.loading = true;
    this.onProgress = onProgress;

    try {
      this.ffmpeg = new FFmpeg();
      
      // 진행률 콜백 설정
      this.ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg:', message);
        this.parseProgress(message);
      });

      this.onProgress?.(10, 'FFmpeg 라이브러리 다운로드 중...');

      // CDN에서 FFmpeg 코어 파일 로드
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.loaded = true;
      this.loading = false;
      this.onProgress?.(30, 'FFmpeg 로딩 완료');
      
      console.log('✅ FFmpeg 로딩 완료');
      return true;

    } catch (error) {
      this.loading = false;
      console.error('❌ FFmpeg 로딩 실패:', error);
      throw new Error(`FFmpeg 로딩 실패: ${error.message}`);
    }
  }

  /**
   * 파일 변환 실행
   */
  async convert(file, outputFormat, options = {}) {
    if (!this.loaded) {
      throw new Error('FFmpeg가 로드되지 않았습니다');
    }

    const inputName = `input.${this.getFileExtension(file.name)}`;
    const outputName = `output.${outputFormat}`;

    try {
      this.onProgress?.(35, '파일 분석 중...');

      // 입력 파일을 FFmpeg 파일시스템에 쓰기
      await this.ffmpeg.writeFile(inputName, await fetchFile(file));

      this.onProgress?.(40, '변환 설정 적용 중...');

      // FFmpeg 명령어 생성
      const command = this.buildCommand(inputName, outputName, outputFormat, options);
      console.log('FFmpeg 명령어:', command.join(' '));

      this.onProgress?.(45, '변환 시작...');

      // FFmpeg 실행
      await this.ffmpeg.exec(command);

      this.onProgress?.(90, '변환된 파일 생성 중...');

      // 출력 파일 읽기
      const outputData = await this.ffmpeg.readFile(outputName);

      // 파일시스템 정리
      try {
        await this.ffmpeg.deleteFile(inputName);
        await this.ffmpeg.deleteFile(outputName);
      } catch (cleanupError) {
        console.warn('파일 정리 실패:', cleanupError);
      }

      this.onProgress?.(95, '최종 처리 중...');

      // Blob으로 변환하여 반환
      const mimeType = this.getMimeType(outputFormat);
      const blob = new Blob([outputData.buffer], { type: mimeType });

      this.onProgress?.(100, '변환 완료!');
      
      return blob;

    } catch (error) {
      console.error('변환 오류:', error);
      
      // 파일시스템 정리 시도
      try {
        await this.ffmpeg.deleteFile(inputName);
        await this.ffmpeg.deleteFile(outputName);
      } catch (cleanupError) {
        console.warn('에러 후 정리 실패:', cleanupError);
      }

      throw new Error(`변환 실패: ${error.message}`);
    }
  }

  /**
   * FFmpeg 명령어 생성
   */
  buildCommand(inputName, outputName, outputFormat, options) {
    const command = ['-i', inputName];

    // 공통 옵션
    command.push('-y'); // 출력 파일 덮어쓰기

    // 비디오 변환 설정
    if (this.isVideoFormat(outputFormat)) {
      this.addVideoOptions(command, outputFormat, options);
    }

    // 오디오 변환 설정
    if (this.isAudioFormat(outputFormat)) {
      this.addAudioOptions(command, outputFormat, options);
    }

    // 출력 파일
    command.push(outputName);

    return command;
  }

  /**
   * 비디오 옵션 추가
   */
  addVideoOptions(command, outputFormat, options) {
    // 코덱 설정
    if (options.videoCodec) {
      command.push('-c:v', options.videoCodec);
    } else {
      // 기본 코덱
      const defaultCodecs = {
        'mp4': 'libx264',
        'webm': 'libvpx-vp9',
        'avi': 'libx264'
      };
      const codec = defaultCodecs[outputFormat] || 'libx264';
      command.push('-c:v', codec);
    }

    // 품질 설정
    if (options.quality) {
      const crfValues = {
        'high': '18',
        'medium': '23',
        'low': '28'
      };
      command.push('-crf', crfValues[options.quality] || '23');
    }

    // 해상도 설정
    if (options.resolution && options.resolution !== 'original') {
      const resolutions = {
        '1080p': '1920x1080',
        '720p': '1280x720',
        '480p': '854x480',
        '360p': '640x360'
      };
      if (resolutions[options.resolution]) {
        command.push('-s', resolutions[options.resolution]);
      }
    }

    // 비트레이트 설정
    if (options.bitrate) {
      command.push('-b:v', `${options.bitrate}k`);
    }

    // 프리셋 설정 (인코딩 속도)
    command.push('-preset', options.preset || 'medium');
  }

  /**
   * 오디오 옵션 추가
   */
  addAudioOptions(command, outputFormat, options) {
    // 오디오 전용 변환인 경우 비디오 스트림 제거
    if (this.isAudioFormat(outputFormat) && !this.isVideoFormat(outputFormat)) {
      command.push('-vn');
    }

    // 오디오 코덱 설정
    if (options.audioCodec) {
      command.push('-c:a', options.audioCodec);
    } else {
      const defaultAudioCodecs = {
        'mp3': 'libmp3lame',
        'aac': 'aac',
        'ogg': 'libvorbis',
        'wav': 'pcm_s16le'
      };
      const codec = defaultAudioCodecs[outputFormat];
      if (codec) {
        command.push('-c:a', codec);
      }
    }

    // 오디오 비트레이트
    if (options.audioBitrate) {
      command.push('-b:a', `${options.audioBitrate}k`);
    }

    // 샘플레이트
    if (options.sampleRate) {
      command.push('-ar', options.sampleRate);
    }

    // 채널 설정
    if (options.channels) {
      const channelMap = {
        'mono': '1',
        'stereo': '2'
      };
      if (channelMap[options.channels]) {
        command.push('-ac', channelMap[options.channels]);
      }
    }
  }

  /**
   * 진행률 파싱 (FFmpeg 로그에서 추출)
   */
  parseProgress(message) {
    // FFmpeg 진행률 메시지 파싱
    const timeMatch = message.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (timeMatch && this.duration) {
      const [, hours, minutes, seconds] = timeMatch;
      const currentTime = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
      const progress = Math.min(95, Math.round((currentTime / this.duration) * 100));
      
      if (progress > 45) { // 변환 단계에서만 업데이트
        this.onProgress?.(45 + (progress - 45) * 0.5, `변환 중... ${progress - 45}%`);
      }
    }

    // 지속시간 파싱 (첫 번째 분석에서)
    const durationMatch = message.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (durationMatch) {
      const [, hours, minutes, seconds] = durationMatch;
      this.duration = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
    }
  }

  /**
   * 파일 확장자 추출
   */
  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
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
      
      // 오디오
      'mp3': 'audio/mpeg',
      'aac': 'audio/aac',
      'ogg': 'audio/ogg',
      'wav': 'audio/wav',
      'flac': 'audio/flac'
    };

    return mimeTypes[format] || 'application/octet-stream';
  }

  /**
   * 비디오 형식 확인
   */
  isVideoFormat(format) {
    const videoFormats = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', '3gp'];
    return videoFormats.includes(format.toLowerCase());
  }

  /**
   * 오디오 형식 확인
   */
  isAudioFormat(format) {
    const audioFormats = ['mp3', 'aac', 'ogg', 'wav', 'flac', 'm4a', 'wma'];
    return audioFormats.includes(format.toLowerCase());
  }

  /**
   * 지원되는 변환인지 확인
   */
  canConvert(inputFormat, outputFormat) {
    const supportedFormats = [
      // 비디오
      'mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', '3gp',
      // 오디오
      'mp3', 'aac', 'ogg', 'wav', 'flac', 'm4a', 'wma'
    ];

    return supportedFormats.includes(inputFormat.toLowerCase()) && 
           supportedFormats.includes(outputFormat.toLowerCase());
  }

  /**
   * 메모리 정리
   */
  async cleanup() {
    if (this.ffmpeg) {
      try {
        await this.ffmpeg.terminate();
        this.ffmpeg = null;
        this.loaded = false;
        console.log('✅ FFmpeg 정리 완료');
      } catch (error) {
        console.warn('FFmpeg 정리 중 오류:', error);
      }
    }
  }
}

// 싱글톤 인스턴스
let ffmpegInstance = null;

export function getFFmpegEngine() {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpegEngine();
  }
  return ffmpegInstance;
}

export { FFmpegEngine };