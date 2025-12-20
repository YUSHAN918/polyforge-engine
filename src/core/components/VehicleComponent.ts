/**
 * PolyForge v1.3.0 VehicleComponent
 * 载具组件 - 定义载具的物理和控制属性
 */

import { Component, ComponentData } from '../types';

/**
 * 载具类型
 */
export type VehicleType = 'ground' | 'flying' | 'water' | 'hover';

/**
 * 轮子配置
 */
export interface WheelConfig {
  socketName: string; // 轮子挂点名称
  radius: number; // 轮子半径
  width: number; // 轮子宽度
  isSteering: boolean; // 是否为转向轮
  isPowered: boolean; // 是否为驱动轮
  suspensionLength: number; // 悬挂长度
}

/**
 * 引擎配置
 */
export interface EngineConfig {
  maxPower: number; // 最大功率（马力）
  maxTorque: number; // 最大扭矩（N·m）
  maxSpeed: number; // 最高速度（m/s）
  acceleration: number; // 加速度（m/s²）
  brakeForce: number; // 制动力（N）
}

/**
 * 转向配置
 */
export interface SteeringConfig {
  maxAngle: number; // 最大转向角度（度）
  speed: number; // 转向速度（度/秒）
  returnSpeed: number; // 回正速度（度/秒）
}

/**
 * 悬挂配置
 */
export interface SuspensionConfig {
  stiffness: number; // 刚度（N/m）
  damping: number; // 阻尼（N·s/m）
  travel: number; // 行程（m）
  restLength: number; // 静止长度（m）
}

/**
 * 飞行配置（用于飞行载具）
 */
export interface FlightConfig {
  lift: number; // 升力系数
  drag: number; // 阻力系数
  pitchSpeed: number; // 俯仰速度（度/秒）
  rollSpeed: number; // 翻滚速度（度/秒）
  yawSpeed: number; // 偏航速度（度/秒）
}

/**
 * VehicleComponent 载具组件
 * 定义载具的物理行为和控制参数
 */
export class VehicleComponent implements Component {
  public readonly type = 'Vehicle';
  public enabled: boolean = true;

  // 载具类型
  public vehicleType: VehicleType;

  // 轮子配置
  public wheels: WheelConfig[];

  // 引擎配置
  public engine: EngineConfig;

  // 转向配置
  public steering: SteeringConfig;

  // 悬挂配置
  public suspension: SuspensionConfig;

  // 飞行配置（可选，仅用于飞行载具）
  public flight?: FlightConfig;

  // 当前状态（运行时数据）
  public currentSpeed: number = 0;
  public currentThrottle: number = 0; // 0-1
  public currentSteering: number = 0; // -1 到 1
  public currentBrake: number = 0; // 0-1

  constructor(
    vehicleType: VehicleType = 'ground',
    wheels: WheelConfig[] = [],
    engine?: EngineConfig,
    steering?: SteeringConfig,
    suspension?: SuspensionConfig
  ) {
    this.vehicleType = vehicleType;
    this.wheels = wheels;
    this.engine = engine || {
      maxPower: 150,
      maxTorque: 300,
      maxSpeed: 50,
      acceleration: 10,
      brakeForce: 5000,
    };
    this.steering = steering || {
      maxAngle: 30,
      speed: 60,
      returnSpeed: 120,
    };
    this.suspension = suspension || {
      stiffness: 50000,
      damping: 3000,
      travel: 0.3,
      restLength: 0.5,
    };

    // 如果是飞行载具，初始化飞行配置
    if (vehicleType === 'flying') {
      this.flight = {
        lift: 1.0,
        drag: 0.1,
        pitchSpeed: 45,
        rollSpeed: 90,
        yawSpeed: 30,
      };
    }
  }

  serialize(): ComponentData {
    return {
      type: this.type,
      enabled: this.enabled,
      vehicleType: this.vehicleType,
      wheels: this.wheels,
      engine: this.engine,
      steering: this.steering,
      suspension: this.suspension,
      flight: this.flight,
      // 不序列化运行时状态
    };
  }

  deserialize(data: ComponentData): void {
    this.enabled = data.enabled ?? true;
    this.vehicleType = data.vehicleType || 'ground';
    this.wheels = data.wheels || [];
    this.engine = data.engine || {
      maxPower: 150,
      maxTorque: 300,
      maxSpeed: 50,
      acceleration: 10,
      brakeForce: 5000,
    };
    this.steering = data.steering || {
      maxAngle: 30,
      speed: 60,
      returnSpeed: 120,
    };
    this.suspension = data.suspension || {
      stiffness: 50000,
      damping: 3000,
      travel: 0.3,
      restLength: 0.5,
    };
    this.flight = data.flight;
  }

  /**
   * 添加轮子
   */
  addWheel(wheel: WheelConfig): void {
    this.wheels.push(wheel);
  }

  /**
   * 移除轮子
   */
  removeWheel(socketName: string): void {
    this.wheels = this.wheels.filter((w) => w.socketName !== socketName);
  }

  /**
   * 获取轮子
   */
  getWheel(socketName: string): WheelConfig | undefined {
    return this.wheels.find((w) => w.socketName === socketName);
  }

  /**
   * 设置油门（0-1）
   */
  setThrottle(value: number): void {
    this.currentThrottle = Math.max(0, Math.min(1, value));
  }

  /**
   * 设置转向（-1 到 1）
   */
  setSteering(value: number): void {
    this.currentSteering = Math.max(-1, Math.min(1, value));
  }

  /**
   * 设置刹车（0-1）
   */
  setBrake(value: number): void {
    this.currentBrake = Math.max(0, Math.min(1, value));
  }

  /**
   * 检查是否为飞行载具
   */
  isFlying(): boolean {
    return this.vehicleType === 'flying';
  }

  /**
   * 检查是否为地面载具
   */
  isGround(): boolean {
    return this.vehicleType === 'ground';
  }

  /**
   * 创建简单的四轮地面载具
   */
  static createSimpleGroundVehicle(): VehicleComponent {
    const vehicle = new VehicleComponent('ground');

    // 添加四个轮子
    vehicle.addWheel({
      socketName: 'wheel_front_left',
      radius: 0.3,
      width: 0.2,
      isSteering: true,
      isPowered: false,
      suspensionLength: 0.3,
    });
    vehicle.addWheel({
      socketName: 'wheel_front_right',
      radius: 0.3,
      width: 0.2,
      isSteering: true,
      isPowered: false,
      suspensionLength: 0.3,
    });
    vehicle.addWheel({
      socketName: 'wheel_back_left',
      radius: 0.3,
      width: 0.2,
      isSteering: false,
      isPowered: true,
      suspensionLength: 0.3,
    });
    vehicle.addWheel({
      socketName: 'wheel_back_right',
      radius: 0.3,
      width: 0.2,
      isSteering: false,
      isPowered: true,
      suspensionLength: 0.3,
    });

    return vehicle;
  }

  /**
   * 创建简单的飞行载具
   */
  static createSimpleFlyingVehicle(): VehicleComponent {
    const vehicle = new VehicleComponent('flying', [], {
      maxPower: 500,
      maxTorque: 1000,
      maxSpeed: 100,
      acceleration: 20,
      brakeForce: 3000,
    });

    vehicle.flight = {
      lift: 1.5,
      drag: 0.05,
      pitchSpeed: 60,
      rollSpeed: 120,
      yawSpeed: 45,
    };

    return vehicle;
  }
}
