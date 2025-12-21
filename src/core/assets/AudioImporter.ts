/**
 * PolyForge Asset System - Audio Importer
 * 
 * 音频资产导入工具
 * 支持 MP3/WAV/OGG 格式，使用原生 Web Audio API
 * 
 * 铁律：严禁引入任何第三方音频库，必须使用原生 Web Audio API
 */

/**
 * 音频元数据接口
 */
export interface AudioMetadata {
  duration: number;        // 时长（秒）
  sampleRate: number;      // 采样率（Hz）
  numberOfChannels: number; // 声道数
  format: string;          // 文件格式（mp3/wav/ogg）
}

/**
 * 音频导入器
 * 使用原生 Web Audio API 解析音频文件
 */
export class AudioImporter {
  private audioContext: AudioContext | null = null;

  constructor() {
    console.log('[AudioImporter] Initialized with native Web Audio API');
  }

  /**
   * 获取或创建 AudioContext
   */
  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      console.log(`[AudioImporter] AudioContext created (sampleRate: ${this.audioContext.sampleRate} Hz)`);
    }
    return this.audioContext;
  }

  /**
   * 导入音频文件
   * 
   * @param file 音频文件（MP3/WAV/OGG）
   * @returns 音频数据和元数据
   */
  async importAudio(file: File): Promise<{
    blob: Blob;
    metadata: AudioMetadata;
  }> {
    console.log(`[AudioImporter] Importing audio: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

    try {
      // 1. 验证音频格式
      const format = this.validateAudioFormat(file);
      console.log(`[AudioImporter] Format validated: ${format}`);

      // 2. 读取文件为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // 3. 使用 Web Audio API 解码音频
      const audioContext = this.getAudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

      // 4. 提取元数据
      const metadata: AudioMetadata = {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        format,
      };

      console.log('[AudioImporter] Metadata extracted:', metadata);

      // 5. 将文件转换为 Blob（保持原始格式）
      const blob = new Blob([arrayBuffer], { type: file.type });

      return {
        blob,
        metadata,
      };
    } catch (error) {
      console.error('[AudioImporter] Import failed:', error);
      throw new Error(`Failed to import audio: ${(error as Error).message}`);
    }
  }

  /**
   * 验证音频格式
   * 
   * @param file 音频文件
   * @returns 格式字符串（mp3/wav/ogg）
   */
  private validateAudioFormat(file: File): string {
    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();

    // 支持的格式
    const supportedFormats = [
      { ext: '.mp3', mime: 'audio/mpeg', format: 'mp3' },
      { ext: '.wav', mime: 'audio/wav', format: 'wav' },
      { ext: '.ogg', mime: 'audio/ogg', format: 'ogg' },
    ];

    // 检查文件扩展名和 MIME 类型
    for (const { ext, mime, format } of supportedFormats) {
      if (fileName.endsWith(ext) || mimeType.includes(mime)) {
        return format;
      }
    }

    throw new Error(`Unsupported audio format: ${fileName}. Supported formats: MP3, WAV, OGG`);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      console.log('[AudioImporter] AudioContext closed');
    }
  }
}
