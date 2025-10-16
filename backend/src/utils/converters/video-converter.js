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
   * 비디오 duration을 초 단위로 파싱
   * @param {String} inputPath
   * @returns {Promise<number>}
   */
  async getVideoDuration(inputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          console.error('[VideoConverter] ffprobe 에러:', err.message);
          resolve(null); // 에러 시 null 반환 (진행률 계산 불가하지만 변환은 계속)
        } else {
          const duration = metadata.format.duration;
          console.log(`[VideoConverter] 비디오 duration: ${duration}초`);
          resolve(duration);
        }
      });
    });
  }

  /**
   * timemark를 초 단위로 변환 (00:01:23.45 → 83.45초)
   * @param {String} timemark
   * @returns {number}
   */
  parseTimemark(timemark) {
    const parts = timemark.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parseFloat(parts[2]);
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  }

  /**
   * FFmpeg로 실제 변환 수행
   * @param {String} inputPath
   * @param {String} outputPath
   * @returns {Promise<void>}
   */
  async convertWithFFmpeg(inputPath, outputPath) {
    return new Promise(async (resolve, reject) => {
      // 파일 크기 확인 (메모리 최적화용)
      const inputStats = await fs.stat(inputPath);
      const fileSizeMB = inputStats.size / (1024 * 1024);
      console.log(`[VideoConverter] 입력 파일 크기: ${fileSizeMB.toFixed(2)} MB`);

      // 비디오 duration 파싱 (진행률 계산용)
      const videoDuration = await this.getVideoDuration(inputPath);

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

      // 🎯 파일 크기 기반 자동 최적화
      let preset, crf;

      if (fileSizeMB > 300) {
        // 대용량 파일 (>300MB): 메모리 절약 우선
        preset = 'veryfast';  // faster → veryfast (더 빠르고 메모리 효율적)
        crf = 32;  // 28 → 32 (더 낮은 품질, 더 작은 메모리)
        console.log(`[VideoConverter] 대용량 파일 모드: preset=${preset}, crf=${crf}`);

        // 메모리 제한 옵션 + 해상도 다운스케일
        command = command.videoCodec('libx264')
          .size('1280x720')  // 강제 720p (메모리 절약)
          .outputOptions([
            `-preset ${preset}`,
            `-crf ${crf}`,
            '-threads 2',  // CPU 코어 제한
            '-max_muxing_queue_size 512',  // 큐 크기 더 줄임
            '-bufsize 1M',  // 버퍼 크기 더 줄임
            '-movflags +faststart',
            '-g 60'  // GOP 크기 제한 (메모리 절약)
          ]);
      } else if (fileSizeMB > 100) {
        // 중간 파일 (100-300MB): 균형 모드
        preset = 'medium';
        crf = 23;
        console.log(`[VideoConverter] 중간 파일 모드: preset=${preset}, crf=${crf}`);

        command = command.videoCodec('libx264').outputOptions([
          `-preset ${preset}`,
          `-crf ${crf}`,
          '-threads 0',
          '-movflags +faststart'
        ]);
      } else {
        // 작은 파일 (<100MB): 품질 우선
        preset = this.settings.preset || 'medium';
        crf = this.settings.quality ?
          { high: 18, medium: 23, low: 28 }[this.settings.quality] : 18;
        console.log(`[VideoConverter] 작은 파일 모드: preset=${preset}, crf=${crf}`);

        command = command.videoCodec('libx264').outputOptions([
          `-preset ${preset}`,
          `-crf ${crf}`,
          '-threads 0',
          '-movflags +faststart'
        ]);
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

        let percent = 50; // 기본값
        let message = `변환 진행 중... ${percent}%`;

        // timemark 기반 진행률 계산 (가장 정확)
        if (progress.timemark && videoDuration) {
          const currentTime = this.parseTimemark(progress.timemark);
          percent = Math.round((currentTime / videoDuration) * 100);
          percent = Math.min(95, Math.max(40, percent)); // 40-95% 범위로 제한

          // ⭐️ 사용자에게 보이는 메시지 생성 (시간 포함)
          message = `변환 진행 중... ${currentTime.toFixed(1)}s / ${videoDuration.toFixed(1)}s (${percent}%)`;

          console.log(`[VideoConverter] Timemark 기반 진행률: ${currentTime.toFixed(1)}s / ${videoDuration.toFixed(1)}s = ${percent}%`);
        }
        // FFmpeg percent 사용 (보조)
        else if (progress.percent) {
          percent = Math.min(95, Math.max(40, Math.round(progress.percent)));
          message = `변환 진행 중... ${percent}%`;
          console.log(`[VideoConverter] FFmpeg percent: ${percent}%`);
        }
        // 둘 다 없으면 timemark 텍스트만 표시
        else if (progress.timemark) {
          message = `변환 진행 중... ${progress.timemark}`;
          console.log(`[VideoConverter] FFmpeg timemark: ${progress.timemark}`);
        }

        this.updateProgress(percent, message).catch(() => {});
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