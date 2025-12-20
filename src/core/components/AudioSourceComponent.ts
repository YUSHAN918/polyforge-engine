/**
 * PolyForge v1.3.0 AudioSourceComponent
 * 音频源组件 - 定义实体的音频播放属性
 */

import { Component, ComponentData } from '../types';

/**
 * 音频类型
 */
export type AudioType = 'sfx' | 'music' | 'voice' | 'ambient';

/**
 * AudioSourceComponent 音频源组件
 * 定义实体的音频播放行为，支持空间音频和 TimeScale 联动
 */
export class AudioSourceComponent implements Component {
  public readonly type = 'AudioSource';
  public enabled: boolean = true;

  // 音频资产
  public assetId: string; // 音频资产 ID

  // 音频类型
  public audioType: AudioType;

  // 基础属性
  public volume: number; // 音量 0-1
  public pitch: number; // 音调 0.5-2.0（1.0 为原始音调）
  public loop: boolean; // 是否循环播放

  // 空间音频属性
  public spatial: boolean; // 是否为 3D 空间音频
  public maxDistance: number; // 最大听到距离（米）
  public minDistance: number; // 最小距离（在此距离内音量最大）
  public rolloffFactor: number; // 衰减因子（距离衰减速度）
  public coneInnerAngle: number; // 内锥角（度）
  public coneOuterAngle: number; // 外锥角（度）
  public coneOuterGain: number; // 外锥增益 0-1

  // 播放控制
  public autoPlay: boolean; // 是否自动播放
  public playOnAwake: boolean; // 是否在实体激活时播放

  // TimeScale 联动
  public affectedByTimeScale: boolean; // 是否受 TimeScale 影响

  // 运行时状态（不序列化）
  public isPlaying: boolean = false;
  public currentTime: number = 0;
  public duration: number = 0;

  // Web Audio API 节点（运行时填充）
  public audioNode?: AudioBufferSourceNode;
  public gainNode?: GainNode;
  public pannerNode?: PannerNode;

  constructor(
    assetId: string = '',
    audioType: AudioType = 'sfx',
    volume: number = 1.0,
    spatial: boolean = false
  ) {
    this.assetId = assetId;
    this.audioType = audioType;
    this.volume = volume;
    this.pitch = 1.0;
    this.loop = false;
    this.spatial = spatial;
    this.maxDistance = 50;
    this.minDistance = 1;
    this.rolloffFactor = 1;
    this.coneInnerAngle = 360;
    this.coneOuterAngle = 360;
    this.coneOuterGain = 0;
    this.autoPlay = false;
    this.playOnAwake = false;
    this.affectedByTimeScale = true;
  }

  serialize(): ComponentData {
    return {
      type: this.type,
      enabled: this.enabled,
      assetId: this.assetId,
      audioType: this.audioType,
      volume: this.volume,
      pitch: this.pitch,
      loop: this.loop,
      spatial: this.spatial,
      maxDistance: this.maxDistance,
      minDistance: this.minDistance,
      rolloffFactor: this.rolloffFactor,
      coneInnerAngle: this.coneInnerAngle,
      coneOuterAngle: this.coneOuterAngle,
      coneOuterGain: this.coneOuterGain,
      autoPlay: this.autoPlay,
      playOnAwake: this.playOnAwake,
      affectedByTimeScale: this.affectedByTimeScale,
      // 不序列化运行时状态和 Web Audio 节点
    };
  }

  deserialize(data: ComponentData): void {
    this.enabled = data.enabled ?? true;
    this.assetId = data.assetId || '';
    this.audioType = data.audioType || 'sfx';
    this.volume = data.volume ?? 1.0;
    this.pitch = data.pitch ?? 1.0;
    this.loop = data.loop ?? false;
    this.spatial = data.spatial ?? false;
    this.maxDistance = data.maxDistance ?? 50;
    this.minDistance = data.minDistance ?? 1;
    this.rolloffFactor = data.rolloffFactor ?? 1;
    this.coneInnerAngle = data.coneInnerAngle ?? 360;
    this.coneOuterAngle = data.coneOuterAngle ?? 360;
    this.coneOuterGain = data.coneOuterGain ?? 0;
    this.autoPlay = data.autoPlay ?? false;
    this.playOnAwake = data.playOnAwake ?? false;
    this.affectedByTimeScale = data.affectedByTimeScale ?? true;
  }

  /**
   * 设置音量
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 设置音调
   */
  setPitch(pitch: number): void {
    this.pitch = Math.max(0.5, Math.min(2.0, pitch));
  }

  /**
   * 设置空间音频参数
   */
  setSpatialAudio(
    maxDistance: number,
    minDistance: number = 1,
    rolloffFactor: number = 1
  ): void {
    this.spatial = true;
    this.maxDistance = maxDistance;
    this.minDistance = minDistance;
    this.rolloffFactor = rolloffFactor;
  }

  /**
   * 设置方向性音频（锥形）
   */
  setDirectionalAudio(
    innerAngle: number,
    outerAngle: number,
    outerGain: number = 0
  ): void {
    this.coneInnerAngle = innerAngle;
    this.coneOuterAngle = outerAngle;
    this.coneOuterGain = Math.max(0, Math.min(1, outerGain));
  }

  /**
   * 启用/禁用 TimeScale 影响
   */
  setAffectedByTimeScale(affected: boolean): void {
    this.affectedByTimeScale = affected;
  }

  /**
   * 检查是否为空间音频
   */
  isSpatial(): boolean {
    return this.spatial;
  }

  /**
   * 检查是否受 TimeScale 影响
   */
  isAffectedByTimeScale(): boolean {
    return this.affectedByTimeScale;
  }

  /**
   * 创建简单的音效
   */
  static createSFX(assetId: string, volume: number = 1.0): AudioSourceComponent {
    return new AudioSourceComponent(assetId, 'sfx', volume, false);
  }

  /**
   * 创建空间音效
   */
  static createSpatialSFX(
    assetId: string,
    volume: number = 1.0,
    maxDistance: number = 50
  ): AudioSourceComponent {
    const audio = new AudioSourceComponent(assetId, 'sfx', volume, true);
    audio.setSpatialAudio(maxDistance);
    return audio;
  }

  /**
   * 创建背景音乐
   */
  static createMusic(assetId: string, volume: number = 0.5): AudioSourceComponent {
    const audio = new AudioSourceComponent(assetId, 'music', volume, false);
    audio.loop = true;
    audio.autoPlay = true;
    return audio;
  }

  /**
   * 创建环境音效
   */
  static createAmbient(
    assetId: string,
    volume: number = 0.3,
    maxDistance: number = 100
  ): AudioSourceComponent {
    const audio = new AudioSourceComponent(assetId, 'ambient', volume, true);
    audio.loop = true;
    audio.autoPlay = true;
    audio.setSpatialAudio(maxDistance);
    return audio;
  }
}
