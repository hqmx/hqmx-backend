/**
 * FFmpegConverter - FFmpeg 기반 비디오/오디오 변환기
 *
 * fluent-ffmpeg 라이브러리를 사용하여 FFmpeg를 제어
 * 진행률 추적 및 실시간 업데이트 지원
 */

import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export class FFmpegConverter {
  constructor(inputPath, outputPath, options = {}) {
    this.inputPath = inputPath;
    this.outputPath = outputPath;
    this.options = options;
    this.progressCallback = null;
    this.duration = null;
  }

  /**
   * 진행률 콜백 설정
   * @param {Function} callback - (progress, message) => void
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  /**
   * ffprobe로 비디오 duration 추출 (진행률 계산용)
   */
  async getDuration() {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${this.inputPath}"`
      );
      this.duration = parseFloat(stdout.trim());
      return this.duration;
    } catch (err) {
      console.warn('[FFmpeg] Could not get duration:', err.message);
      return null;
    }
  }

  /**
   * 변환 실행
   * @returns {Promise<string>} 출력 파일 경로
   */
  async convert() {
    // duration 미리 추출 (진행률 계산용)
    await this.getDuration();

    return new Promise((resolve, reject) => {
      const command = ffmpeg(this.inputPath)
        .output(this.outputPath);

      // 형식별 옵션 적용
      this.applyFormatOptions(command);

      // 진행률 추적
      command.on('progress', (progress) => {
        if (this.progressCallback) {
          let percent = 0;

          // duration이 있으면 정확한 계산
          if (this.duration && progress.timemark) {
            const currentTime = this.parseTimemark(progress.timemark);
            percent = Math.min(99, Math.round((currentTime / this.duration) * 100));
          } else if (progress.percent) {
            // FFmpeg가 제공하는 계산된 percent 사용
            percent = Math.min(99, Math.round(progress.percent));
          }

          this.progressCallback(percent, `Converting... ${progress.timemark || ''}`);
        }
      });

      // 변환 완료
      command.on('end', () => {
        if (this.progressCallback) {
          this.progressCallback(100, 'Conversion completed!');
        }
        console.log(`[FFmpeg] Conversion completed: ${this.outputPath}`);
        resolve(this.outputPath);
      });

      // 에러 처리
      command.on('error', (err) => {
        console.error('[FFmpeg] Conversion error:', err);
        reject(new Error(`FFmpeg conversion failed: ${err.message}`));
      });

      // FFmpeg 실행
      command.run();
    });
  }

  /**
   * 형식별 FFmpeg 옵션 적용
   * @param {FfmpegCommand} command - fluent-ffmpeg 명령 객체
   */
  applyFormatOptions(command) {
    const { outputFormat, quality = {}, codec = {} } = this.options;
    const format = outputFormat.toLowerCase();

    // 비디오 변환
    if (['mp4', 'avi', 'mov', 'webm', 'mkv', 'flv'].includes(format)) {
      command
        .videoCodec(codec.video || this.getDefaultVideoCodec(format))
        .audioCodec(codec.audio || this.getDefaultAudioCodec(format))
        .videoBitrate(quality.video || '1000k')
        .audioBitrate(quality.audio || '128k')
        .outputOptions(['-preset', 'fast']); // fast preset for server performance

      // 형식별 특수 설정
      if (format === 'webm') {
        command.videoCodec('libvpx-vp9').audioCodec('libopus');
      }
    }

    // 오디오 변환
    else if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(format)) {
      command
        .noVideo() // 비디오 제거
        .audioCodec(codec.audio || this.getDefaultAudioCodec(format))
        .audioBitrate(quality.audio || '192k');

      if (format === 'wav') {
        command.audioCodec('pcm_s16le'); // WAV는 PCM 코덱
      }
    }

    // GIF 변환 (비디오 → GIF)
    else if (format === 'gif') {
      command
        .videoCodec('gif')
        .fps(quality.fps || 10)
        .size(quality.size || '480x?'); // width 480, height auto
    }

    // 시간 옵션
    if (this.options.startTime) {
      command.setStartTime(this.options.startTime);
    }
    if (this.options.duration) {
      command.setDuration(this.options.duration);
    }
  }

  /**
   * 형식별 기본 비디오 코덱 반환
   */
  getDefaultVideoCodec(format) {
    const codecs = {
      mp4: 'libx264',
      webm: 'libvpx-vp9',
      avi: 'mpeg4',
      mov: 'libx264',
      mkv: 'libx264',
      flv: 'flv'
    };
    return codecs[format] || 'libx264';
  }

  /**
   * 형식별 기본 오디오 코덱 반환
   */
  getDefaultAudioCodec(format) {
    const codecs = {
      mp4: 'aac',
      webm: 'libopus',
      mp3: 'libmp3lame',
      aac: 'aac',
      ogg: 'libvorbis',
      flac: 'flac',
      m4a: 'aac',
      wav: 'pcm_s16le'
    };
    return codecs[format] || 'aac';
  }

  /**
   * timemark를 초로 변환 (예: "00:01:23.45" → 83.45)
   * @param {string} timemark - HH:MM:SS.ms 형식
   * @returns {number} 초 단위 시간
   */
  parseTimemark(timemark) {
    const parts = timemark.split(':');
    if (parts.length !== 3) return 0;

    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * FFmpeg 버전 확인 (정적 메서드)
   * @returns {Promise<string>} FFmpeg 버전
   */
  static async checkFFmpegVersion() {
    try {
      const { stdout } = await execAsync('ffmpeg -version');
      const versionLine = stdout.split('\n')[0];
      console.log('[FFmpeg] Version:', versionLine);
      return versionLine;
    } catch (err) {
      throw new Error('FFmpeg is not installed or not in PATH');
    }
  }

  /**
   * 지원 코덱 목록 확인
   * @returns {Promise<Array>} 코덱 목록
   */
  static async getSupportedCodecs() {
    try {
      const { stdout } = await execAsync('ffmpeg -codecs');
      return stdout;
    } catch (err) {
      console.error('[FFmpeg] Could not get codecs:', err);
      return '';
    }
  }
}

export default FFmpegConverter;
