/**
 * PolyForge v1.3.0 WorldStateManager
 * Phase 11: 全局环境状态管理器
 * 
 * 功能：
 * - 管理全局环境参数（时间、光照、色温）
 * - 昼夜循环系统
 * - 环境状态序列化
 * - 节拍脉冲接口（预留）
 * - 全场景存档支持
 */

/**
 * 环境状态数据
 */
export interface WorldState {
  // 时间参数
  timeOfDay: number;        // 一天中的时间 0-24（小时）
  dayDuration: number;      // 一天的持续时间（秒）

  // 光照参数
  lightIntensity: number;   // 光照强度 0-1
  ambientColor: string;     // 环境光颜色（十六进制）
  directionalColor: string; // 方向光颜色（十六进制）

  // 色温参数
  colorTemperature: number; // 色温 1000-20000K

  // 天气参数（预留）
  weather: 'clear' | 'rain' | 'snow' | 'fog';
  weatherIntensity: number; // 天气强度 0-1

  // 昼夜参数
  beatPulseEnabled: boolean;
  beatPulseIntensity: number; // 节拍脉冲强度 0-1

  // 物理环境参数
  gravityY: number;          // 重力强度 (通常 -9.8)

  // 后处理参数 (Post-Processing)
  bloomStrength: number;     // 泛光强度 0-5
  bloomThreshold: number;    // 泛光阈值 0-1
}

/**
 * 环境状态变化回调
 */
export type WorldStateChangeCallback = (state: WorldState) => void;

/**
 * 节拍脉冲回调（预留）
 */
export type BeatPulseCallback = (beatTime: number, intensity: number) => void;

/**
 * WorldStateManager 全局环境状态管理器
 * 负责管理昼夜、光照、色温等全局环境参数
 */
export class WorldStateManager {
  // 当前环境状态
  private state: WorldState;

  // 状态变化回调列表
  private changeCallbacks: WorldStateChangeCallback[] = [];

  // 节拍脉冲回调列表（预留）
  private beatPulseCallbacks: BeatPulseCallback[] = [];

  // 昼夜循环控制
  private dayNightCycleEnabled: boolean = false;
  private accumulatedTime: number = 0;

  constructor() {
    // 初始化默认状态（正午）
    this.state = {
      timeOfDay: 12.0,
      dayDuration: 120, // 2分钟一天（演示用）
      lightIntensity: 1.0,
      ambientColor: '#ffffff',
      directionalColor: '#ffffff',
      colorTemperature: 6500, // 日光色温
      weather: 'clear',
      weatherIntensity: 0,
      beatPulseEnabled: false,
      beatPulseIntensity: 0.5,
      gravityY: -9.81,
      bloomStrength: 0.5,      // 默认泛光强度
      bloomThreshold: 0.85,    // 默认泛光阈值
    };
  }

  // ============================================================================
  // 状态访问
  // ============================================================================

  /**
   * 获取当前环境状态
   */
  getState(): Readonly<WorldState> {
    return { ...this.state };
  }

  /**
   * 设置环境状态
   */
  setState(newState: Partial<WorldState>): void {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...newState };

    // 触发回调
    this.notifyStateChanged();

    console.log('🌍 World state updated:', newState);
  }

  /**
   * 重置为默认状态
   */
  reset(): void {
    this.setState({
      timeOfDay: 12.0,
      lightIntensity: 1.0,
      ambientColor: '#ffffff',
      directionalColor: '#ffffff',
      colorTemperature: 6500,
      weather: 'clear',
      weatherIntensity: 0,
    });
    console.log('🌍 World state reset to default');
  }

  // ============================================================================
  // 时间管理
  // ============================================================================

  /**
   * 设置一天中的时间
   * @param hours 小时 0-24
   */
  setTimeOfDay(hours: number): void {
    // 限制范围 0-24
    hours = ((hours % 24) + 24) % 24;
    this.setState({ timeOfDay: hours });

    // 自动更新光照
    this.updateLightingFromTime();
  }

  /**
   * 获取一天中的时间
   */
  getTimeOfDay(): number {
    return this.state.timeOfDay;
  }

  /**
   * 设置一天的持续时间
   * @param seconds 秒数
   */
  setDayDuration(seconds: number): void {
    this.setState({ dayDuration: Math.max(1, seconds) });
  }

  /**
   * 启用/禁用昼夜循环
   */
  setDayNightCycleEnabled(enabled: boolean): void {
    this.dayNightCycleEnabled = enabled;
    console.log(`🌍 Day-night cycle: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * 更新昼夜循环（每帧调用）
   */
  update(deltaTime: number): void {
    if (!this.dayNightCycleEnabled) return;

    // 累积时间
    this.accumulatedTime += deltaTime;

    // 计算时间进度（0-1）
    const progress = this.accumulatedTime / this.state.dayDuration;

    // 更新一天中的时间
    const newTimeOfDay = (progress * 24) % 24;
    this.state.timeOfDay = newTimeOfDay;

    // 更新光照
    this.updateLightingFromTime();

    // 触发回调
    this.notifyStateChanged();

    // 重置累积时间（完成一天）
    if (progress >= 1.0) {
      this.accumulatedTime = 0;
      console.log('🌍 Day cycle completed');
    }
  }

  // ============================================================================
  // 光照管理
  // ============================================================================

  /**
   * 根据时间自动更新光照
   */
  private updateLightingFromTime(): void {
    const time = this.state.timeOfDay;

    // 计算光照强度（正弦曲线）
    // 6:00 = 日出，12:00 = 正午，18:00 = 日落，0:00 = 午夜
    const sunAngle = ((time - 6) / 12) * Math.PI; // 0 = 日出，π = 日落
    const intensity = Math.max(0, Math.sin(sunAngle));

    // 计算色温（日出日落偏暖，正午偏冷）
    let colorTemp: number;
    if (time >= 5 && time <= 7) {
      // 日出：暖色 2000-4000K
      colorTemp = 2000 + (time - 5) * 1000;
    } else if (time >= 17 && time <= 19) {
      // 日落：暖色 4000-2000K
      colorTemp = 4000 - (time - 17) * 1000;
    } else if (time >= 7 && time <= 17) {
      // 白天：冷色 5000-6500K
      colorTemp = 5000 + ((time - 12) / 5) * 1500;
    } else {
      // 夜晚：月光 4000K
      colorTemp = 4000;
    }

    // 计算光照颜色
    const ambientColor = this.colorTemperatureToHex(colorTemp, intensity * 0.3);
    const directionalColor = this.colorTemperatureToHex(colorTemp, intensity);

    // 更新状态（不触发回调，避免递归）
    this.state.lightIntensity = intensity;
    this.state.colorTemperature = colorTemp;
    this.state.ambientColor = ambientColor;
    this.state.directionalColor = directionalColor;
  }

  /**
   * 色温转十六进制颜色
   * @param kelvin 色温（K）
   * @param intensity 强度 0-1
   */
  private colorTemperatureToHex(kelvin: number, intensity: number = 1.0): string {
    // 简化的色温转换算法
    const temp = kelvin / 100;
    let r: number, g: number, b: number;

    // 红色通道
    if (temp <= 66) {
      r = 255;
    } else {
      r = temp - 60;
      r = 329.698727446 * Math.pow(r, -0.1332047592);
      r = Math.max(0, Math.min(255, r));
    }

    // 绿色通道
    if (temp <= 66) {
      g = temp;
      g = 99.4708025861 * Math.log(g) - 161.1195681661;
      g = Math.max(0, Math.min(255, g));
    } else {
      g = temp - 60;
      g = 288.1221695283 * Math.pow(g, -0.0755148492);
      g = Math.max(0, Math.min(255, g));
    }

    // 蓝色通道
    if (temp >= 66) {
      b = 255;
    } else if (temp <= 19) {
      b = 0;
    } else {
      b = temp - 10;
      b = 138.5177312231 * Math.log(b) - 305.0447927307;
      b = Math.max(0, Math.min(255, b));
    }

    // 应用强度
    r = Math.round(r * intensity);
    g = Math.round(g * intensity);
    b = Math.round(b * intensity);

    // 转换为十六进制
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * 设置光照强度
   */
  setLightIntensity(intensity: number): void {
    this.setState({ lightIntensity: Math.max(0, Math.min(1, intensity)) });
  }

  /**
   * 设置环境光颜色
   */
  setAmbientColor(color: string): void {
    this.setState({ ambientColor: color });
  }

  /**
   * 设置方向光颜色
   */
  setDirectionalColor(color: string): void {
    this.setState({ directionalColor: color });
  }

  // ============================================================================
  // 天气管理（预留）
  // ============================================================================

  /**
   * 设置天气
   */
  setWeather(weather: WorldState['weather'], intensity: number = 0.5): void {
    this.setState({
      weather,
      weatherIntensity: Math.max(0, Math.min(1, intensity)),
    });
  }

  // ============================================================================
  // 节拍脉冲接口（预留）
  // ============================================================================

  /**
   * 启用/禁用节拍脉冲
   */
  setBeatPulseEnabled(enabled: boolean): void {
    this.setState({ beatPulseEnabled: enabled });
  }

  /**
   * 设置节拍脉冲强度
   */
  setBeatPulseIntensity(intensity: number): void {
    this.setState({ beatPulseIntensity: Math.max(0, Math.min(1, intensity)) });
  }

  // ============================================================================
  // 后处理接口 (Post-Processing)
  // ============================================================================

  /**
   * 设置泛光强度
   */
  setBloomStrength(strength: number): void {
    this.setState({ bloomStrength: Math.max(0, Math.min(5, strength)) });
  }

  /**
   * 设置泛光阈值
   */
  setBloomThreshold(threshold: number): void {
    this.setState({ bloomThreshold: Math.max(0, Math.min(1, threshold)) });
  }

  /**
   * 触发节拍脉冲（由 AudioSystem 调用）
   * @param beatTime 节拍时间
   * @param intensity 脉冲强度
   */
  triggerBeatPulse(beatTime: number, intensity: number): void {
    if (!this.state.beatPulseEnabled) return;

    // 触发所有节拍脉冲回调
    for (const callback of this.beatPulseCallbacks) {
      callback(beatTime, intensity * this.state.beatPulseIntensity);
    }
  }

  /**
   * 注册节拍脉冲回调
   */
  onBeatPulse(callback: BeatPulseCallback): void {
    this.beatPulseCallbacks.push(callback);
  }

  /**
   * 移除节拍脉冲回调
   */
  offBeatPulse(callback: BeatPulseCallback): void {
    const index = this.beatPulseCallbacks.indexOf(callback);
    if (index !== -1) {
      this.beatPulseCallbacks.splice(index, 1);
    }
  }

  // ============================================================================
  // 状态变化通知
  // ============================================================================

  /**
   * 注册状态变化回调
   */
  onStateChanged(callback: WorldStateChangeCallback): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * 移除状态变化回调
   */
  offStateChanged(callback: WorldStateChangeCallback): void {
    const index = this.changeCallbacks.indexOf(callback);
    if (index !== -1) {
      this.changeCallbacks.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器状态已改变
   */
  private notifyStateChanged(): void {
    for (const callback of this.changeCallbacks) {
      callback(this.state);
    }
  }

  // ============================================================================
  // 序列化
  // ============================================================================

  /**
   * 序列化环境状态
   */
  serialize(): WorldState {
    return { ...this.state };
  }

  /**
   * 反序列化环境状态
   */
  deserialize(data: WorldState): void {
    this.state = { ...data };
    this.notifyStateChanged();
    console.log('🌍 World state deserialized');
  }

  // ============================================================================
  // 调试信息
  // ============================================================================

  /**
   * 获取调试信息
   */
  getDebugInfo(): string {
    const time = this.state.timeOfDay;
    const hours = Math.floor(time);
    const minutes = Math.floor((time - hours) * 60);

    return `
=== World State Debug Info ===
Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}
Light Intensity: ${(this.state.lightIntensity * 100).toFixed(1)}%
Color Temperature: ${this.state.colorTemperature}K
Ambient Color: ${this.state.ambientColor}
Directional Color: ${this.state.directionalColor}
Weather: ${this.state.weather} (${(this.state.weatherIntensity * 100).toFixed(1)}%)
Day-Night Cycle: ${this.dayNightCycleEnabled ? 'enabled' : 'disabled'}
Beat Pulse: ${this.state.beatPulseEnabled ? 'enabled' : 'disabled'}
    `.trim();
  }

  /**
   * 打印调试信息
   */
  debug(): void {
    console.log(this.getDebugInfo());
  }
}
