/**
 * PolyForge v1.3.0 Core Module
 * 核心模块导出
 */

// 核心类型
export * from './types';

// 核心类
export { Entity } from './Entity';
export { EntityManager } from './EntityManager';
export { SystemManager } from './SystemManager';
export { SerializationService } from './SerializationService';
export type { SerializedWorld } from './SerializationService';

// 工具函数
export * from './utils';

// 示例组件
export { TransformComponent } from './components/TransformComponent';
export { NameComponent } from './components/NameComponent';

// 核心组件（阶段 2）
export { VisualComponent } from './components/VisualComponent';
export type {
  GeometryData,
  MaterialData,
  EmissiveConfig,
  PostProcessingConfig,
} from './components/VisualComponent';
export { RigComponent } from './components/RigComponent';
export type {
  RigType,
  BoneDefinition,
  IKChain,
  BoneConstraint,
} from './components/RigComponent';
export { PhysicsComponent } from './components/PhysicsComponent';
export type {
  BodyType,
  ColliderShape,
  ColliderConfig,
} from './components/PhysicsComponent';
export { VehicleComponent } from './components/VehicleComponent';
export type {
  VehicleType,
  WheelConfig,
  EngineConfig,
  SteeringConfig,
  SuspensionConfig,
  FlightConfig,
} from './components/VehicleComponent';
export { AudioSourceComponent } from './components/AudioSourceComponent';
export type { AudioType } from './components/AudioSourceComponent';

// 示例系统
export { MovementSystem } from './systems/MovementSystem';

// 演示和测试
export { runCoreDemo } from './demo';
export { runEntityManagerTests } from './__tests__/EntityManager.test';
