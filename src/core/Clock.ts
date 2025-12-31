/**
 * PolyForge v1.3.0 Clock
 * 时钟系统 - 管理游戏时间、TimeScale 和暂停
 */

/**
 * Clock 时钟类
 * 管理游戏时间流逝、TimeScale 缩放和暂停功能
 */
export class Clock {
  /** 总运行时间（秒） */
  private _elapsedTime: number = 0;

  /** 上一帧的时间戳（毫秒） */
  private _lastTime: number = 0;

  /** 当前帧的 deltaTime（秒） */
  private _deltaTime: number = 0;

  /** 时间缩放倍率（1.0 = 正常速度，0.5 = 半速，2.0 = 两倍速） */
  private _timeScale: number = 1.0;

  /** 是否暂停 */
  private _paused: boolean = false;

  /** 是否已启动 */
  private _started: boolean = false;

  /** 帧计数器 */
  private _frameCount: number = 0;

  /** TimeScale 变化回调列表 */
  private _timeScaleCallbacks: Array<(timeScale: number) => void> = [];

  constructor() {
    this._lastTime = performance.now();
  }

  // ============================================================================
  // 时间更新
  // ============================================================================

  /**
   * 启动时钟
   */
  start(): void {
    if (this._started) return;
    this._started = true;
    this._lastTime = performance.now();
    console.log('⏰ Clock started');
  }

  /**
   * 更新时钟（每帧调用）
   * @returns 经过 TimeScale 缩放后的 deltaTime
   */
  tick(): number {
    if (!this._started) {
      this.start();
    }

    const currentTime = performance.now();
    const rawDeltaTime = (currentTime - this._lastTime) / 1000; // 转换为秒
    this._lastTime = currentTime;

    // 如果暂停，deltaTime 为 0
    if (this._paused) {
      this._deltaTime = 0;
      return 0;
    }

    // 应用 TimeScale
    this._deltaTime = rawDeltaTime * this._timeScale;

    // 更新总运行时间（使用缩放后的时间）
    this._elapsedTime += this._deltaTime;

    // 增加帧计数
    this._frameCount++;

    return this._deltaTime;
  }

  /**
   * 手动步进时钟（用于固定步进或测试）
   * @param deltaTime 手动指定的增量时间
   */
  tickManual(deltaTime: number): void {
    this._deltaTime = deltaTime;
    this._elapsedTime += deltaTime;
    this._frameCount++;
  }

  /**
   * 重置时钟
   */
  reset(): void {
    this._elapsedTime = 0;
    this._lastTime = performance.now();
    this._deltaTime = 0;
    this._frameCount = 0;
    console.log('⏰ Clock reset');
  }

  // ============================================================================
  // TimeScale 控制
  // ============================================================================

  /**
   * 设置时间缩放倍率
   * @param scale 缩放倍率（0.0 - 10.0）
   */
  setTimeScale(scale: number): void {
    // 限制范围
    scale = Math.max(0, Math.min(10, scale));

    if (this._timeScale === scale) return;

    this._timeScale = scale;
    console.log(`⏰ TimeScale changed: ${scale.toFixed(2)}x`);

    // 触发回调
    this._notifyTimeScaleChanged();
  }

  /**
   * 获取当前时间缩放倍率
   */
  getTimeScale(): number {
    return this._timeScale;
  }

  /**
   * 注册 TimeScale 变化回调
   */
  onTimeScaleChanged(callback: (timeScale: number) => void): void {
    this._timeScaleCallbacks.push(callback);
  }

  /**
   * 移除 TimeScale 变化回调
   */
  offTimeScaleChanged(callback: (timeScale: number) => void): void {
    const index = this._timeScaleCallbacks.indexOf(callback);
    if (index !== -1) {
      this._timeScaleCallbacks.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器 TimeScale 已改变
   */
  private _notifyTimeScaleChanged(): void {
    for (const callback of this._timeScaleCallbacks) {
      callback(this._timeScale);
    }
  }

  // ============================================================================
  // 暂停/恢复
  // ============================================================================

  /**
   * 暂停游戏
   */
  pause(): void {
    if (this._paused) return;
    this._paused = true;
    console.log('⏸️  Game paused');
  }

  /**
   * 恢复游戏
   */
  resume(): void {
    if (!this._paused) return;
    this._paused = false;
    this._lastTime = performance.now(); // 重置时间，避免大的 deltaTime 跳跃
    console.log('▶️  Game resumed');
  }

  /**
   * 切换暂停状态
   */
  togglePause(): void {
    if (this._paused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * 检查是否暂停
   */
  isPaused(): boolean {
    return this._paused;
  }

  // ============================================================================
  // 时间查询
  // ============================================================================

  /**
   * 获取总运行时间（秒）
   */
  getElapsedTime(): number {
    return this._elapsedTime;
  }

  /**
   * 获取当前帧的 deltaTime（秒，已应用 TimeScale）
   */
  getDeltaTime(): number {
    return this._deltaTime;
  }

  /**
   * 获取总帧数
   */
  getFrameCount(): number {
    return this._frameCount;
  }

  /**
   * 获取当前帧的原始 deltaTime（秒，未应用 TimeScale）
   */
  getRawDeltaTime(): number {
    return this._timeScale !== 0 ? this._deltaTime / this._timeScale : 0;
  }

  /**
   * 获取当前 FPS
   */
  getFPS(): number {
    const rawDelta = this.getRawDeltaTime();
    return rawDelta > 0 ? 1 / rawDelta : 0;
  }

  // ============================================================================
  // 调试信息
  // ============================================================================

  /**
   * 获取时钟状态
   */
  getStatus(): {
    elapsedTime: number;
    deltaTime: number;
    timeScale: number;
    paused: boolean;
    fps: number;
  } {
    return {
      elapsedTime: this._elapsedTime,
      deltaTime: this._deltaTime,
      timeScale: this._timeScale,
      paused: this._paused,
      fps: this.getFPS(),
    };
  }

  /**
   * 打印调试信息
   */
  debug(): void {
    const status = this.getStatus();
    console.log('=== Clock Debug Info ===');
    console.log(`Elapsed Time: ${status.elapsedTime.toFixed(2)}s`);
    console.log(`Delta Time: ${status.deltaTime.toFixed(4)}s`);
    console.log(`Time Scale: ${status.timeScale.toFixed(2)}x`);
    console.log(`Paused: ${status.paused}`);
    console.log(`FPS: ${status.fps.toFixed(1)}`);
  }
}
