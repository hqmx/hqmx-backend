import { BaseConverter } from './base-converter.js';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * 비디오 변환기 (fluent-ffmpeg 기반)
 * 서버 사이드 FFmpeg를 사용한 고성능 비디오 변환
 */
export class VideoConverter extends BaseConverter {
  // FFmpeg 포맷 이름 매핑 (파일 확장자 → FFmpeg 포맷 이름)
  static FORMAT_MAP = {
    'mkv': 'matroska',  // MKV는 matroska 컨테이너 사용
    'mp4': 'mp4',
    'avi': 'avi',
    'mov': 'mov',
    'webm': 'webm',
    'flv': 'flv',
    'wmv': 'asf',       // WMV는 ASF (Advanced Systems Format) 사용
    'm4v': 'mp4'        // M4V는 MP4와 동일
  };

  constructor(inputFormat, outputFormat, settings = {}) {
    super(inputFormat, outputFormat, settings);
    this.supportedFormats = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', 'm4v'];
  }

  isSupported() {
    return this.supportedFormats.includes(this.inputFormat) &&
           this.supportedFormats.includes(this.outputFormat);
  }

  async convert() {
    // settings에서 경로 가져오기 (convert.js에서 설정됨)
    const inputPath = this.settings.inputPath;
    const outputPath = this.settings.outputPath;

    if (!inputPath || !outputPath) {
      throw new Error('inputPath와 outputPath가 설정되지 않았습니다');
    }

    try {
      await this.updateProgress(5, 'FFmpeg 초기화 중...');
      await this.updateProgress(15, '비디오 분석 중...');

      // 출력 디렉토리 생성
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // 변환 실행
      await this.convertWithFFmpeg(inputPath, outputPath);

      await this.updateProgress(100, '비디오 변환 완료');

      console.log(`[VideoConverter] 변환 완료: ${inputPath} → ${outputPath}`);
    } catch (err) {
      console.error('[VideoConverter] 변환 실패:', err);
      throw err;
    } finally {
      // 입력 파일 정리 (multer가 업로드한 임시 파일)
      try {
        await fs.unlink(inputPath).catch(() => {});
      } catch (err) {
        console.error('[VideoConverter] 임시 파일 정리 실패:', err);
      }
    }
  }

  /**
   * FFmpeg로 실제 변환 수행
   * @param {String} inputPath
   * @param {String} outputPath
   * @returns {Promise<void>}
   */
  async convertWithFFmpeg(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      // FFmpeg 프로세스를 큐에 등록 (취소 가능하도록)
      if (this.settings.jobId && this.settings.conversionQueue) {
        this.settings.conversionQueue.setFFmpegProcess(this.settings.jobId, command);
        console.log(`[VideoConverter] FFmpeg process registered for job ${this.settings.jobId}`);
      }

      // 출력 형식 설정 (FORMAT_MAP을 통해 FFmpeg 포맷 이름으로 변환)
      const ffmpegFormat = VideoConverter.FORMAT_MAP[this.outputFormat] || this.outputFormat;
      console.log(`[VideoConverter] 출력 형식: ${this.outputFormat} → FFmpeg 포맷: ${ffmpegFormat}`);
      command = command.toFormat(ffmpegFormat);

      // 🎯 품질 우선 설정 + 멀티스레딩
      const preset = this.settings.preset || 'medium'; // medium: 품질과 속도의 균형 (기본값)
      command = command.videoCodec('libx264').outputOptions([
        `-preset ${preset}`,
        '-threads 0',  // 모든 CPU 코어 사용
        '-movflags +faststart'  // 웹 스트리밍 최적화
      ]);

      // 품질 설정 (CRF) - 기본값: high quality
      if (this.settings.quality) {
        const crfMap = { high: 18, medium: 23, low: 28 };
        const crf = crfMap[this.settings.quality] || 18;
        command = command.outputOptions([`-crf ${crf}`]);
      } else {
        // 기본 CRF 18 (high quality - 원본 화질 최대한 유지)
        command = command.outputOptions(['-crf 18']);
      }

      // 해상도 설정
      if (this.settings.resolution && this.settings.resolution !== 'original') {
        const resolutionMap = {
          '1080p': '1920x1080',
          '720p': '1280x720',
          '480p': '854x480',
          '360p': '640x360'
        };
        command = command.size(resolutionMap[this.settings.resolution]);
      }

      // 비트레이트 설정
      if (this.settings.bitrate) {
        command = command.videoBitrate(this.settings.bitrate);
      }

      // 진행률 콜백
      command.on('progress', (progress) => {
        console.log('[VideoConverter] FFmpeg progress event:', JSON.stringify(progress));
        if (progress.percent) {
          const percent = Math.min(95, Math.max(40, Math.round(progress.percent)));
          console.log(`[VideoConverter] Updating progress: ${percent}%`);
          this.updateProgress(percent, `변환 진행 중... ${percent}%`).catch(() => {});
        } else if (progress.timemark) {
          // percent가 없으면 timemark로 진행률 표시
          console.log(`[VideoConverter] FFmpeg timemark: ${progress.timemark}`);
          this.updateProgress(50, `변환 진행 중... ${progress.timemark}`).catch(() => {});
        }
      });

      // 에러 핸들링
      command.on('error', (err) => {
        console.error('[VideoConverter] FFmpeg 에러:', err.message);
        reject(new Error(`비디오 변환 실패: ${err.message}`));
      });

      // 완료 핸들링
      command.on('end', async () => {
        try {
          // 출력 파일 존재 확인
          const stats = await fs.stat(outputPath);
          console.log(`[VideoConverter] 변환 완료: ${stats.size} bytes → ${outputPath}`);
          resolve();
        } catch (err) {
          reject(new Error(`출력 파일 확인 실패: ${err.message}`));
        }
      });

      // 변환 시작
      command.save(outputPath);
    });
  }

  /**
   * FFmpeg 명령어 생성
   * @returns {string[]}
   */
  buildFFmpegCommand() {
    const command = ['-i', 'input.' + this.inputFormat];
    
    // 품질 설정
    if (this.settings.quality) {
      switch (this.settings.quality) {
        case 'high':
          command.push('-crf', '18');
          break;
        case 'medium':
          command.push('-crf', '23');
          break;
        case 'low':
          command.push('-crf', '28');
          break;
      }
    }
    
    // 해상도 설정
    if (this.settings.resolution && this.settings.resolution !== 'original') {
      const resolutionMap = {
        '1080p': '1920x1080',
        '720p': '1280x720',
        '480p': '854x480',
        '360p': '640x360'
      };
      command.push('-s', resolutionMap[this.settings.resolution]);
    }
    
    // 코덱 설정
    if (this.settings.codec) {
      command.push('-c:v', this.settings.codec);
    }
    
    // 비트레이트 설정
    if (this.settings.bitrate) {
      command.push('-b:v', this.settings.bitrate + 'k');
    }
    
    command.push('output.' + this.outputFormat);
    
    return command;
  }

  /**
   * 모의 비디오 변환 (실제 구현으로 교체 필요)
   * @param {ArrayBuffer} inputData 
   * @returns {Promise<ArrayBuffer>}
   */
  async simulateVideoConversion(inputData) {
    // 실제로는 FFmpeg.wasm을 통한 비디오 변환을 수행
    
    // 진행률을 단계별로 업데이트
    const steps = [45, 50, 60, 70, 80, 85];
    for (const progress of steps) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.updateProgress(progress, `변환 진행 중... ${progress}%`);
    }
    
    // 실제 구현 예시:
    // const ffmpeg = createFFmpeg({ log: true });
    // await ffmpeg.load();
    // ffmpeg.FS('writeFile', 'input.mp4', new Uint8Array(inputData));
    // await ffmpeg.run(...this.buildFFmpegCommand());
    // const output = ffmpeg.FS('readFile', 'output.mp4');
    // return output.buffer;
    
    return inputData; // 임시로 원본 데이터 반환
  }

  validateSettings() {
    const errors = [];
    
    if (this.settings.quality && !['high', 'medium', 'low'].includes(this.settings.quality)) {
      errors.push('잘못된 품질 설정입니다');
    }
    
    if (this.settings.resolution && !['original', '1080p', '720p', '480p', '360p'].includes(this.settings.resolution)) {
      errors.push('잘못된 해상도 설정입니다');
    }
    
    if (this.settings.codec && !['h264', 'h265', 'vp9', 'av1'].includes(this.settings.codec)) {
      errors.push('지원되지 않는 코덱입니다');
    }
    
    if (this.settings.bitrate && (this.settings.bitrate < 100 || this.settings.bitrate > 50000)) {
      errors.push('비트레이트는 100-50000 kbps 사이여야 합니다');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}