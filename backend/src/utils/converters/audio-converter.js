import { BaseConverter } from './base-converter.js';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * 오디오 변환기 (fluent-ffmpeg 기반)
 * 서버 사이드 FFmpeg를 사용한 고성능 오디오 변환
 */
export class AudioConverter extends BaseConverter {
  // FFmpeg 포맷 이름 매핑 (파일 확장자 → FFmpeg 포맷 이름)
  static FORMAT_MAP = {
    'mp3': 'mp3',
    'wav': 'wav',
    'flac': 'flac',
    'aac': 'adts',      // AAC는 ADTS (Audio Data Transport Stream) 사용
    'ogg': 'ogg',
    'm4a': 'ipod',      // M4A는 iPod/MP4 컨테이너 사용
    'wma': 'asf',       // WMA는 ASF 컨테이너 사용
    'opus': 'opus'
  };

  constructor(inputFormat, outputFormat, settings = {}) {
    super(inputFormat, outputFormat, settings);
    this.supportedFormats = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus'];
  }

  isSupported() {
    return this.supportedFormats.includes(this.inputFormat) &&
           this.supportedFormats.includes(this.outputFormat);
  }

  async convert(inputData) {
    const tempId = uuidv4();
    const inputPath = `/tmp/converter/inputs/${tempId}.${this.inputFormat}`;
    const outputPath = `/tmp/converter/outputs/${tempId}.${this.outputFormat}`;

    try {
      await this.updateProgress(10, '오디오 분석 중...');

      // ArrayBuffer → 임시 파일 저장
      const buffer = Buffer.from(inputData);
      await fs.mkdir(path.dirname(inputPath), { recursive: true });
      await fs.writeFile(inputPath, buffer);

      await this.updateProgress(25, '오디오 디코딩 중...');

      // 변환 실행
      const result = await this.convertWithFFmpeg(inputPath, outputPath);

      await this.updateProgress(100, '오디오 변환 완료');

      return result;
    } finally {
      // 입력 파일만 정리 (출력 파일은 다운로드 후 Cron job이 삭제)
      try {
        await fs.unlink(inputPath).catch(() => {});
      } catch (err) {
        console.error('[AudioConverter] 임시 파일 정리 실패:', err);
      }
    }
  }

  /**
   * FFmpeg로 실제 변환 수행
   * @param {String} inputPath
   * @param {String} outputPath
   * @returns {Promise<ArrayBuffer>}
   */
  async convertWithFFmpeg(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      // FFmpeg 프로세스를 큐에 등록 (취소 가능하도록)
      if (this.settings.jobId && this.settings.conversionQueue) {
        this.settings.conversionQueue.setFFmpegProcess(this.settings.jobId, command);
        console.log(`[AudioConverter] FFmpeg process registered for job ${this.settings.jobId}`);
      }

      // 출력 형식 설정 (FORMAT_MAP을 통해 FFmpeg 포맷 이름으로 변환)
      const ffmpegFormat = AudioConverter.FORMAT_MAP[this.outputFormat] || this.outputFormat;
      console.log(`[AudioConverter] 출력 형식: ${this.outputFormat} → FFmpeg 포맷: ${ffmpegFormat}`);
      command = command.toFormat(ffmpegFormat);

      // 품질 설정 (VBR quality)
      if (this.settings.quality) {
        const qualityMap = { high: 0, medium: 2, low: 4 };
        const q = qualityMap[this.settings.quality] || 2;
        command = command.audioQuality(q);
      }

      // 비트레이트 설정
      if (this.settings.bitrate) {
        command = command.audioBitrate(this.settings.bitrate);
      }

      // 샘플레이트 설정
      if (this.settings.sampleRate) {
        command = command.audioFrequency(parseInt(this.settings.sampleRate));
      }

      // 채널 설정
      if (this.settings.channels) {
        const channels = this.settings.channels === 'mono' ? 1 : 2;
        command = command.audioChannels(channels);
      }

      // 진행률 콜백
      command.on('progress', (progress) => {
        if (progress.percent) {
          const percent = Math.min(90, Math.max(50, Math.round(progress.percent)));
          this.updateProgress(percent, `오디오 처리 중... ${percent}%`).catch(() => {});
        }
      });

      // 에러 핸들링
      command.on('error', (err) => {
        console.error('[AudioConverter] FFmpeg 에러:', err.message);
        reject(new Error(`오디오 변환 실패: ${err.message}`));
      });

      // 완료 핸들링
      command.on('end', async () => {
        try {
          // 출력 파일 읽기
          const outputBuffer = await fs.readFile(outputPath);
          console.log(`[AudioConverter] 변환 완료: ${outputBuffer.length} bytes`);

          // Buffer → ArrayBuffer
          const arrayBuffer = outputBuffer.buffer.slice(
            outputBuffer.byteOffset,
            outputBuffer.byteOffset + outputBuffer.byteLength
          );

          resolve(arrayBuffer);
        } catch (err) {
          reject(new Error(`출력 파일 읽기 실패: ${err.message}`));
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
          command.push('-q:a', '0');
          break;
        case 'medium':
          command.push('-q:a', '2');
          break;
        case 'low':
          command.push('-q:a', '4');
          break;
      }
    }
    
    // 비트레이트 설정
    if (this.settings.bitrate) {
      command.push('-b:a', this.settings.bitrate + 'k');
    }
    
    // 샘플레이트 설정
    if (this.settings.sampleRate) {
      command.push('-ar', this.settings.sampleRate);
    }
    
    // 채널 설정
    if (this.settings.channels) {
      const channelMap = {
        'mono': '1',
        'stereo': '2'
      };
      command.push('-ac', channelMap[this.settings.channels]);
    }
    
    command.push('output.' + this.outputFormat);
    
    return command;
  }

  /**
   * 모의 오디오 변환 (실제 구현으로 교체 필요)
   * @param {ArrayBuffer} inputData 
   * @returns {Promise<ArrayBuffer>}
   */
  async simulateAudioConversion(inputData) {
    // 실제로는 FFmpeg.wasm을 통한 오디오 변환을 수행
    
    const steps = [60, 70, 80];
    for (const progress of steps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      await this.updateProgress(progress, `오디오 처리 중... ${progress}%`);
    }
    
    // 실제 구현 예시:
    // const ffmpeg = createFFmpeg({ log: true });
    // await ffmpeg.load();
    // ffmpeg.FS('writeFile', 'input.mp3', new Uint8Array(inputData));
    // await ffmpeg.run(...this.buildFFmpegCommand());
    // const output = ffmpeg.FS('readFile', 'output.wav');
    // return output.buffer;
    
    return inputData; // 임시로 원본 데이터 반환
  }

  validateSettings() {
    const errors = [];
    
    if (this.settings.quality && !['high', 'medium', 'low'].includes(this.settings.quality)) {
      errors.push('잘못된 품질 설정입니다');
    }
    
    if (this.settings.bitrate && (this.settings.bitrate < 32 || this.settings.bitrate > 320)) {
      errors.push('비트레이트는 32-320 kbps 사이여야 합니다');
    }
    
    if (this.settings.sampleRate && !['44100', '48000', '96000'].includes(this.settings.sampleRate)) {
      errors.push('지원되지 않는 샘플레이트입니다');
    }
    
    if (this.settings.channels && !['mono', 'stereo'].includes(this.settings.channels)) {
      errors.push('잘못된 채널 설정입니다');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}