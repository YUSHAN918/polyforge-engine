/**
 * PolyForge v1.3.0 AudioSystem
 * Phase 9: 音频系统
 * 
 * 功能：
 * - 全局 AudioContext 管理（浏览器交互解锁）
 * - 3D 空间音频（HRTF + 距离衰减）
 * - TimeScale 联动（pitch 自动调整）
 * - 音源节点池管理（避免重复创建）
 * - 自动同步 CameraSystem 位置到 AudioListener
 */

import type { System, Entity } from '../types';
import { AudioSourceComponent } from '../components/AudioSourceComponent';
import { TransformComponent } from '../components/TransformComponent';
import { CameraComponent } from '../components/CameraComponent';
import { Clock } from '../Clock';
import { AssetRegistry } from '../assets/AssetRegistry';

/**
 * 音频节点池条目
 */
interface AudioNodeEntry {
  entityId: string;
  assetId: string;
  buffer: AudioBuffer;
  sourceNode: AudioBufferSourceNode;
  gainNode: GainNode;
  pannerNode?: PannerNode;
  startTime: number;
  offset: number; // 🔥 New: Track played time for pause/resume
  isPlaying: boolean;
  manualStopped?: boolean; // 🔥 New: Flag to prevent onended cleanup during manual pause
}

/**
 * AudioSystem 音频系统
 * 负责管理所有音频源的播放、空间化和 TimeScale 联动
 */
export class AudioSystem implements System {
  public readonly name = 'AudioSystem';
  public readonly priority = 200;  // 在相机系统之后
  public enabled = true;
  public readonly requiredComponents = ['AudioSource', 'Transform'];

  // Web Audio API
  private audioContext?: AudioContext;
  private masterGainNode?: GainNode;
  private isUnlocked = false;

  // 音源节点池
  private activeNodes: Map<string, AudioNodeEntry> = new Map();

  // 音频缓冲区缓存
  private audioBufferCache: Map<string, AudioBuffer> = new Map();

  // Clock 引用（用于 TimeScale 联动）
  private clock?: Clock;

  // AssetRegistry 引用
  private assetRegistry?: AssetRegistry;

  // 主音量
  private masterVolume = 1.0;

  // 全局播放倍速 (用于律动控制)
  private globalPlaybackRate = 1.0;

  // 相机实体（用于 AudioListener 同步）
  private cameraEntity?: Entity;

  constructor() {
    // 延迟初始化 AudioContext（等待用户交互）
  }

  /**
   * 初始化 AudioContext（需要用户交互）
   */
  private initAudioContext(): void {
    if (this.audioContext) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.connect(this.audioContext.destination);
      this.masterGainNode.gain.value = this.masterVolume;

      console.log('🔊 AudioContext initialized');
    } catch (error) {
      console.error('❌ Failed to initialize AudioContext:', error);
    }
  }

  /**
   * 解锁 AudioContext（浏览器交互策略）
   */
  public async unlockAudioContext(): Promise<void> {
    if (this.isUnlocked || !this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('🔓 AudioContext unlocked');
      } catch (error) {
        console.error('❌ Failed to unlock AudioContext:', error);
        return;
      }
    }

    this.isUnlocked = true;
  }


  /**
   * 设置 Clock 引用
   */
  public setClock(clock: Clock): void {
    this.clock = clock;
  }

  /**
   * 设置 AssetRegistry 引用
   */
  public setAssetRegistry(registry: AssetRegistry): void {
    this.assetRegistry = registry;
  }

  /**
   * 设置主音量
   */

  /**
   * System 接口：实体添加回调
   */
  public onEntityAdded(entity: Entity): void {
    const audio = entity.getComponent<AudioSourceComponent>('AudioSource');

    if (audio && audio.autoPlay) {
      // 延迟播放，等待 AudioContext 解锁
      setTimeout(() => {
        this.playAudio(entity);
      }, 100);
    }
  }

  /**
   * System 接口：实体移除回调
   */
  public onEntityRemoved(entity: Entity): void {
    // 停止并清理该实体的所有音频节点
    this.stopAudio(entity);
    this.cleanupEntityNodes(entity.id);
  }

  /**
   * System 接口：更新
   */
  public update(deltaTime: number, entities?: Entity[]): void {
    if (!entities) return;

    // 确保 AudioContext 已初始化
    if (!this.audioContext) {
      this.initAudioContext();
      return;
    }

    // 尝试解锁 AudioContext
    if (!this.isUnlocked) {
      this.unlockAudioContext();
    }

    // 查找相机实体（用于 AudioListener 同步）
    this.updateCameraEntity(entities);

    // 更新所有音频源
    for (const entity of entities) {
      const audio = entity.getComponent<AudioSourceComponent>('AudioSource');
      const transform = entity.getComponent<TransformComponent>('Transform');

      if (!audio || !audio.enabled || !transform) continue;

      // 更新音频节点属性
      this.updateAudioNode(entity, audio, transform);

      // 检查是否需要播放
      if (audio.autoPlay && !audio.isPlaying) {
        this.playAudio(entity);
      }
    }

    // 清理已结束的音频节点
    this.cleanupFinishedNodes();
  }

  /**
   * 更新相机实体（用于 AudioListener 同步）
   */
  private updateCameraEntity(entities: Entity[]): void {
    // 查找带 Camera 组件的实体
    for (const entity of entities) {
      if (entity.hasComponent('Camera')) {
        this.cameraEntity = entity;
        this.updateAudioListener();
        break;
      }
    }
  }

  /**
   * 更新 AudioListener 位置（同步相机位置）
   */
  private updateAudioListener(): void {
    if (!this.audioContext || !this.cameraEntity) return;

    const transform = this.cameraEntity.getComponent<TransformComponent>('Transform');
    if (!transform) return;

    const listener = this.audioContext.listener;
    const pos = transform.getWorldPosition();

    // 设置监听器位置
    if (listener.positionX) {
      listener.positionX.value = pos[0];
      listener.positionY.value = pos[1];
      listener.positionZ.value = pos[2];
    } else {
      // 旧版 API
      (listener as any).setPosition(pos[0], pos[1], pos[2]);
    }

    // 设置监听器朝向（基于相机旋转）
    const rot = transform.rotation;
    const yaw = rot[1] * Math.PI / 180;
    const pitch = rot[0] * Math.PI / 180;

    const forwardX = Math.sin(yaw) * Math.cos(pitch);
    const forwardY = -Math.sin(pitch);
    const forwardZ = Math.cos(yaw) * Math.cos(pitch);

    const upX = 0;
    const upY = 1;
    const upZ = 0;

    if (listener.forwardX) {
      listener.forwardX.value = forwardX;
      listener.forwardY.value = forwardY;
      listener.forwardZ.value = forwardZ;
      listener.upX.value = upX;
      listener.upY.value = upY;
      listener.upZ.value = upZ;
    } else {
      // 旧版 API
      (listener as any).setOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ);
    }
  }

  /**
   * 更新音频节点属性
   */
  private updateAudioNode(entity: Entity, audio: AudioSourceComponent, transform: TransformComponent): void {
    const nodeEntry = this.activeNodes.get(entity.id);
    if (!nodeEntry || !nodeEntry.isPlaying) return;

    // 更新音量
    if (nodeEntry.gainNode) {
      nodeEntry.gainNode.gain.value = audio.volume;
    }

    // 更新 playbackRate（pitch * timeScale * globalPlaybackRate）
    if (nodeEntry.sourceNode) {
      const timeScale = (audio.affectedByTimeScale && this.clock) ? this.clock.getTimeScale() : 1.0;
      nodeEntry.sourceNode.playbackRate.value = audio.pitch * timeScale * this.globalPlaybackRate;
    }

    // 更新空间音频
    if (audio.spatial && nodeEntry.pannerNode) {
      const pos = transform.getWorldPosition();

      if (nodeEntry.pannerNode.positionX) {
        nodeEntry.pannerNode.positionX.value = pos[0];
        nodeEntry.pannerNode.positionY.value = pos[1];
        nodeEntry.pannerNode.positionZ.value = pos[2];
      } else {
        // 旧版 API
        (nodeEntry.pannerNode as any).setPosition(pos[0], pos[1], pos[2]);
      }

      // 更新距离参数
      nodeEntry.pannerNode.maxDistance = audio.maxDistance;
      nodeEntry.pannerNode.refDistance = audio.minDistance;
      nodeEntry.pannerNode.rolloffFactor = audio.rolloffFactor;

      // 更新方向性参数
      nodeEntry.pannerNode.coneInnerAngle = audio.coneInnerAngle;
      nodeEntry.pannerNode.coneOuterAngle = audio.coneOuterAngle;
      nodeEntry.pannerNode.coneOuterGain = audio.coneOuterGain;
    }
  }

  /**
   * 播放音频
   */
  public async playAudio(entity: Entity): Promise<void> {
    if (!this.audioContext || !this.masterGainNode) {
      console.warn('⚠️ AudioContext not initialized');
      return;
    }

    const audio = entity.getComponent<AudioSourceComponent>('AudioSource');
    const transform = entity.getComponent<TransformComponent>('Transform');

    if (!audio || !transform) return;

    // 尝试解锁 AudioContext
    await this.unlockAudioContext();

    // 加载音频缓冲区
    const buffer = await this.loadAudioBuffer(audio.assetId);
    if (!buffer) {
      console.error(`❌ Failed to load audio asset: ${audio.assetId}`);
      return;
    }

    // 停止旧的音频节点
    this.stopAudio(entity);

    // 创建音频节点
    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.loop = audio.loop;

    // 创建增益节点
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = audio.volume;

    // 连接节点
    let lastNode: AudioNode = sourceNode;

    // 如果是空间音频，创建 PannerNode
    let pannerNode: PannerNode | undefined;
    if (audio.spatial) {
      pannerNode = this.audioContext.createPanner();
      pannerNode.panningModel = 'HRTF';  // 高保真空间音效
      pannerNode.distanceModel = 'inverse';
      pannerNode.maxDistance = audio.maxDistance;
      pannerNode.refDistance = audio.minDistance;
      pannerNode.rolloffFactor = audio.rolloffFactor;
      pannerNode.coneInnerAngle = audio.coneInnerAngle;
      pannerNode.coneOuterAngle = audio.coneOuterAngle;
      pannerNode.coneOuterGain = audio.coneOuterGain;

      // 设置位置
      const pos = transform.getWorldPosition();
      if (pannerNode.positionX) {
        pannerNode.positionX.value = pos[0];
        pannerNode.positionY.value = pos[1];
        pannerNode.positionZ.value = pos[2];
      } else {
        (pannerNode as any).setPosition(pos[0], pos[1], pos[2]);
      }

      sourceNode.connect(pannerNode);
      lastNode = pannerNode;
    }

    // 连接增益节点
    lastNode.connect(gainNode);
    gainNode.connect(this.masterGainNode);

    // 设置 playbackRate（pitch * timeScale * globalPlaybackRate）
    const timeScale = (audio.affectedByTimeScale && this.clock) ? this.clock.getTimeScale() : 1.0;
    sourceNode.playbackRate.value = audio.pitch * timeScale * this.globalPlaybackRate;

    // 播放
    sourceNode.start(0);

    // 保存到节点池
    const nodeEntry: AudioNodeEntry = {
      entityId: entity.id,
      assetId: audio.assetId,
      buffer,
      sourceNode,
      gainNode,
      pannerNode,
      startTime: this.audioContext.currentTime,
      offset: 0, // 🔥 Initialize offset
      isPlaying: true,
    };

    this.activeNodes.set(entity.id, nodeEntry);

    // 监听播放结束
    sourceNode.onended = () => {
      // 🔥 Security Check: 只有当前节点生成的结束事件才触发清理
      // 防止 resumeAudio/togglePause 时由于 stop() 异步触发陈旧的 cleanup
      if (nodeEntry.sourceNode !== sourceNode) return;

      // 🔥 关键修复：只有在非手动停止（即自然播放完成或非暂停状态下）才执行清理
      if (nodeEntry.isPlaying && !audio.loop) {
        nodeEntry.isPlaying = false;
        audio.isPlaying = false;
        this.cleanupEntityNodes(entity.id);
      }
    };

    // 更新组件状态
    audio.isPlaying = true;
    audio.audioNode = sourceNode;
    audio.gainNode = gainNode;
    audio.pannerNode = pannerNode;

    console.log(`🔊 Playing audio: ${audio.assetId} (spatial: ${audio.spatial})`);
  }

  /**
   * 停止音频
   */
  public stopAudio(entity: Entity): void {
    const nodeEntry = this.activeNodes.get(entity.id);
    if (!nodeEntry) return;

    try {
      if (nodeEntry.sourceNode && nodeEntry.isPlaying) {
        nodeEntry.sourceNode.stop();
      }
    } catch (error) {
      // 节点可能已经停止
    }

    nodeEntry.isPlaying = false;

    const audio = entity.getComponent<AudioSourceComponent>('AudioSource');
    if (audio) {
      audio.isPlaying = false;
    }
  }

  /**
   * 加载音频缓冲区
   */
  private async loadAudioBuffer(assetId: string): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    // 检查缓存
    if (this.audioBufferCache.has(assetId)) {
      return this.audioBufferCache.get(assetId)!;
    }

    // 从 AssetRegistry 加载
    if (!this.assetRegistry) {
      console.error('❌ AssetRegistry not set');
      return null;
    }

    try {
      const blob = await this.assetRegistry.getAsset(assetId);
      if (!blob) {
        console.error(`❌ Audio asset not found: ${assetId}`);
        return null;
      }

      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // 缓存
      this.audioBufferCache.set(assetId, audioBuffer);

      return audioBuffer;
    } catch (error) {
      console.error(`❌ Failed to load audio buffer: ${assetId}`, error);
      return null;
    }
  }

  /**
   * 清理实体的音频节点
   */
  private cleanupEntityNodes(entityId: string): void {
    const nodeEntry = this.activeNodes.get(entityId);
    if (!nodeEntry) return;

    // 断开所有节点
    try {
      if (nodeEntry.sourceNode) {
        nodeEntry.sourceNode.disconnect();
      }
      if (nodeEntry.gainNode) {
        nodeEntry.gainNode.disconnect();
      }
      if (nodeEntry.pannerNode) {
        nodeEntry.pannerNode.disconnect();
      }
    } catch (error) {
      // 节点可能已经断开
    }

    this.activeNodes.delete(entityId);
  }

  /**
   * 清理已结束的音频节点
   */
  private cleanupFinishedNodes(): void {
    const toRemove: string[] = [];

    for (const [entityId, nodeEntry] of this.activeNodes.entries()) {
      if (!nodeEntry.isPlaying && !nodeEntry.sourceNode.loop) {
        toRemove.push(entityId);
      }
    }

    for (const entityId of toRemove) {
      this.cleanupEntityNodes(entityId);
    }
  }

  /**
   * 清理所有音频资源
   */
  public dispose(): void {
    // 停止所有音频
    for (const [entityId] of this.activeNodes.entries()) {
      this.cleanupEntityNodes(entityId);
    }

    this.activeNodes.clear();
    this.audioBufferCache.clear();

    // 关闭 AudioContext
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = undefined;
    }

    console.log('🔇 AudioSystem disposed');
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    activeNodes: number;
    cachedBuffers: number;
    isUnlocked: boolean;
    masterVolume: number;
  } {
    return {
      activeNodes: this.activeNodes.size,
      cachedBuffers: this.audioBufferCache.size,
      isUnlocked: this.isUnlocked,
      masterVolume: this.masterVolume,
    };
  }

  /**
   * 获取调试信息（供可视化使用）
   */
  public getDebugInfo(): Array<{
    id: string;
    position: [number, number, number];
    maxDistance: number;
    minDistance: number;
    isPlaying: boolean;
    volume: number;
  }> {
    const info: Array<any> = [];

    for (const [entityId, nodeEntry] of this.activeNodes.entries()) {
      if (!nodeEntry.pannerNode) continue;

      const panner = nodeEntry.pannerNode;
      // 注意：读取 AudioParam.value 可能不是最新值，但在 update 中我们刚设置过
      const x = panner.positionX.value;
      const y = panner.positionY.value;
      const z = panner.positionZ.value;

      info.push({
        id: entityId,
        position: [x, y, z],
        maxDistance: panner.maxDistance,
        minDistance: panner.refDistance,
        isPlaying: nodeEntry.isPlaying,
        volume: nodeEntry.gainNode ? nodeEntry.gainNode.gain.value : 0
      });
    }

    return info;
  }

  /**
   * 设置全局播放倍速
   */
  public setPlaybackRate(rate: number): void {
    this.globalPlaybackRate = rate;

    // 🔥 核心重构：当倍速改变时，必须立即对所有活动节点“提交”当前进度
    // 否则 elapsed * newRate 会导致进度线上产生瞬间位移
    for (const entry of this.activeNodes.values()) {
      if (entry.isPlaying) {
        const elapsed = this.audioContext!.currentTime - entry.startTime;
        entry.offset += elapsed * entry.sourceNode.playbackRate.value;
        entry.startTime = this.audioContext!.currentTime;

        // 更新物理节点速率
        entry.sourceNode.playbackRate.value = rate;
      } else {
        // 如果是暂停状态，仅更新引用，下次 resume 会自动拉取
        entry.sourceNode.playbackRate.value = rate;
      }
    }
    console.log(`🎵 [AudioSystem] Global playback rate: ${rate}x`);
  }

  /**
   * 设置主音量
   */
  public setMasterVolume(volume: number): void {
    this.masterVolume = volume;
    if (this.masterGainNode) {
      this.masterGainNode.gain.setTargetAtTime(volume, this.audioContext!.currentTime, 0.02);
    }
    console.log(`🔊 [AudioSystem] Master volume: ${volume.toFixed(2)}`);
  }

  /**
   * 获取音频播放状态 (用于进度条)
   * @param id 实体 ID 或 资产 ID (预览逻辑通常使用 assetsId_preview 形式)
   */
  public getPlaybackState(id: string): { currentTime: number; duration: number; isPlaying: boolean } | null {
    if (!this.audioContext) return null;

    // 尝试直接按 ID 查找
    let entry = this.activeNodes.get(id);

    // 如果没找到，尝试按资产 ID 模糊匹配 (预览音频 ID 通常包含资产 ID)
    if (!entry) {
      for (const e of this.activeNodes.values()) {
        if (e.assetId === id || id.includes(e.assetId)) {
          entry = e;
          break;
        }
      }
    }

    if (!entry) return null;

    let currentTime = 0;
    if (entry.isPlaying) {
      const elapsed = this.audioContext.currentTime - entry.startTime;
      currentTime = entry.offset + (elapsed * entry.sourceNode.playbackRate.value);
    } else {
      currentTime = entry.offset;
    }

    const duration = entry.buffer.duration;

    return {
      currentTime: currentTime % duration,
      duration,
      isPlaying: entry.isPlaying
    };
  }

  /**
   * 切换暂停/播放状态 (支持断点续播)
   */
  public togglePause(id?: string): void {
    if (!this.audioContext) return;

    // 🔥 交互自动解锁
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const entry = this.findEntry(id);
    if (!entry) return;

    if (entry.isPlaying) {
      // --- PAUSE ---
      const elapsed = this.audioContext.currentTime - entry.startTime;
      entry.offset += elapsed * entry.sourceNode.playbackRate.value;
      entry.isPlaying = false;

      // 🔥 关键：锁定由手动触发的暂停，防止 onended 执行清理
      entry.manualStopped = true;

      // 🔥 关键：在物理停止前标记 isPlaying=false，确保 onended 回调不会误删此活跃节点

      try {
        entry.sourceNode.stop();
      } catch (e) { /* already stopped */ }

      console.log(`⏸️ [AudioSystem] Paused at ${entry.offset.toFixed(2)}s (ID: ${id})`);
    } else {
      // --- RESUME ---
      console.log(`▶️ [AudioSystem] Resuming... (ID: ${id})`);
      this.resumeAudio(entry);
    }
  }

  /**
   * 设置循环状态
   */
  public setLooping(id: string | undefined, isLooping: boolean): void {
    const entry = this.findEntry(id);
    if (entry) {
      entry.sourceNode.loop = isLooping;
      // Also ensure internal state is updated for next resume
      // (sourceNode is just a transient object)

      // 同时更新组件状态 (如果能找到实体)
      const entity = Array.from(this.activeNodes.keys()).find(k => k === entry.entityId);
      if (entity) {
        // Assume caller handled component update or we do it via entityManager if we had ref
      }
      console.log(`🔁 [AudioSystem] Looping set to: ${isLooping}`);
    }
  }

  private findEntry(id?: string): AudioNodeEntry | null {
    if (!id) {
      return this.activeNodes.size > 0 ? Array.from(this.activeNodes.values())[0] : null;
    }
    let entry = this.activeNodes.get(id);
    if (!entry) {
      // Search by assetId or partial ID
      for (const e of this.activeNodes.values()) {
        if (e.assetId === id || id.includes(e.assetId) || e.entityId.includes(id)) {
          entry = e;
          break;
        }
      }
    }
    return entry || null;
  }

  private resumeAudio(entry: AudioNodeEntry): void {
    if (!this.audioContext || !this.masterGainNode) return;

    // 🔥 交互自动解锁
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // 1. Create NEW source (AudioBufferSourceNode is one-time use)
    const newSource = this.audioContext.createBufferSource();
    newSource.buffer = entry.buffer;
    newSource.loop = entry.sourceNode.loop;
    newSource.playbackRate.value = entry.sourceNode.playbackRate.value;

    // 2. Reconnect
    // Note: pannerNode is already connected to gainNode, gainNode to master
    newSource.connect(entry.pannerNode || entry.gainNode);

    // 3. Start from offset
    const offset = entry.offset % entry.buffer.duration;
    newSource.start(0, offset);

    // 4. Update entry
    entry.sourceNode = newSource;
    entry.startTime = this.audioContext.currentTime;
    entry.isPlaying = true;
    entry.manualStopped = false; // 🔥 解锁

    newSource.onended = () => {
      // 🔥 Security Check: 只有当前节点生成的结束事件才触发清理
      // 防止 resumeAudio/togglePause 时由于 stop() 异步触发陈旧的 cleanup
      if (entry.sourceNode !== newSource) return;

      // 🔥 关键修复：只有在非手动停止且自然播放完成时才执行清理
      if (!entry.manualStopped && !newSource.loop) {
        entry.isPlaying = false;
        this.cleanupEntityNodes(entry.entityId);
      }
    };

    console.log(`▶️ [AudioSystem] Resumed from ${offset.toFixed(2)}s`);
  }
}
