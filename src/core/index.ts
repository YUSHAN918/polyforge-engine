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
export { Clock } from './Clock';
export { CommandManager, CreateEntityCommand, DeleteEntityCommand, ModifyComponentCommand, AttachToSocketCommand } from './CommandManager';
export type { ICommand } from './CommandManager';

// 工具函数
export * from './utils';

// 示例组件
export { TransformComponent } from './components/TransformComponent';
export type { Matrix4 } from './components/TransformComponent';
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
export { CameraComponent } from './components/CameraComponent';
export type { CameraMode, CameraSnapshot } from './components/CameraComponent';

// 核心系统（阶段 3）
export { MovementSystem } from './systems/MovementSystem';
export { HierarchySystem } from './systems/HierarchySystem';
export { InputSystem } from './systems/InputSystem';
export type { InputAction, InputPreset } from './systems/InputSystem';
export { PhysicsSystem } from './systems/PhysicsSystem';
export { CameraSystem } from './systems/CameraSystem';
export { AudioSystem } from './systems/AudioSystem';

// 演示和测试
export { runCoreDemo } from './demo';
export { runEntityManagerTests } from './__tests__/EntityManager.test';
export { runHierarchyTests } from './__tests__/Hierarchy.test';
export { runClockTests } from './__tests__/Clock.test';
export { runCommandTests } from './__tests__/Command.test';
export { hierarchyDemo } from './hierarchyDemo';
export { clockDemo, setSpeed, pauseGame, resumeGame, togglePause, getClockStatus } from './clockDemo';
export { commandDemo, spawnBox, moveBox, deleteLastBox, undoLast, redoLast, showHistory, clearHistory } from './commandDemo';
export { inputDemo, getBoxPosition, switchPreset, showInputStatus, showCommandHistory } from './inputDemo';
export { physicsDemo, stopPhysics, startPhysics, resetPhysics, setGravity, spawnPhysicsBox, showPhysicsStatus } from './physicsDemo';
export { cameraDemo, stopCameraDemo, startCameraDemo, switchCameraMode, applyCameraPreset, getCameraSnapshot, moveCameraTarget, rotateCameraView, setCameraDistance, showCameraStatus } from './cameraDemo';
export { audioDemo } from './demos/audioDemo';

// 资产系统（阶段 7）
export { AssetRegistry, getAssetRegistry } from './assets/AssetRegistry';
export { IndexedDBStorage } from './assets/IndexedDBStorage';
export { ModelImporter } from './assets/ModelImporter';
export { AudioImporter } from './assets/AudioImporter';
export { HDRImporter } from './assets/HDRImporter';
export { FileSystemService } from './assets/FileSystemService';
export { AssetType } from './assets/types';
export type { AssetMetadata, AssetData, AssetFilter, ImportOptions, ModelMetadata, AudioMetadata, HDRMetadata, ScannedFile, ImportProgress, ProgressCallback } from './assets/types';
export { assetDemo, listAssets, clearAssets, assetStats, modelUploadDemo, audioUploadDemo, hdrUploadDemo, assetBrowserDemo } from './assetDemo';
