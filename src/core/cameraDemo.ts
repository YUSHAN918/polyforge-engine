/**
 * PolyForge v1.3.0 Camera Demo
 * Phase 10: 相机系统演示
 * 
 * 教学目标：
 * 1. 演示多种相机模式的切换
 * 2. 展示平滑跟随和过渡效果
 * 3. 演示参数自定义和快照功能
 * 4. 提供交互式控制函数供实验
 * 
 * 场景描述：
 * - 1 个物理方块作为跟随目标
 * - 1 个相机实体
 * - 演示第三人称、横版卷轴、等距视角等模式
 */

import { EntityManager } from './EntityManager';
import { SystemManager } from './SystemManager';
import { TransformComponent } from './components/TransformComponent';
import { VisualComponent } from './components/VisualComponent';
import { PhysicsComponent } from './components/PhysicsComponent';
import { NameComponent } from './components/NameComponent';
import { CameraComponent, type CameraMode, type CameraSnapshot } from './components/CameraComponent';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { CameraSystem } from './systems/CameraSystem';
import { Clock } from './Clock';

// ============================================================================
// 全局变量 - 用于交互式控制
// ============================================================================
let globalEntityManager: EntityManager | null = null;
let globalSystemManager: SystemManager | null = null;
let globalPhysicsSystem: PhysicsSystem | null = null;
let globalCameraSystem: CameraSystem | null = null;
let globalClock: Clock | null = null;
let globalCameraEntity: any | null = null;
let globalTargetEntity: any | null = null;
let animationFrameId: number | null = null;

// 预设快照
const presetSnapshots: Map<string, CameraSnapshot> = new Map();

/**
 * Camera Demo 主函数
 * 
 * 演示流程：
 * 1. 初始化 ECS 管理器
 * 2. 初始化物理系统和相机系统
 * 3. 创建跟随目标（物理方块）
 * 4. 创建相机实体
 * 5. 启动更新循环
 */
export async function cameraDemo(): Promise<void> {
  console.log('\n=== PolyForge Phase 10: Camera System Demo ===\n');

  // ============================================================================
  // 步骤 1: 初始化 ECS 核心管理器
  // ============================================================================
  const entityManager = new EntityManager();
  const clock = new Clock();
  const systemManager = new SystemManager(entityManager, clock);
  const physicsSystem = new PhysicsSystem();
  const cameraSystem = new CameraSystem();

  // 保存到全局变量
  globalEntityManager = entityManager;
  globalSystemManager = systemManager;
  globalPhysicsSystem = physicsSystem;
  globalCameraSystem = cameraSystem;
  globalClock = clock;

  // ============================================================================
  // 步骤 2: 注册组件类型
  // ============================================================================
  entityManager.registerComponent('Transform', TransformComponent);
  entityManager.registerComponent('Visual', VisualComponent);
  entityManager.registerComponent('Physics', PhysicsComponent);
  entityManager.registerComponent('Name', NameComponent);
  entityManager.registerComponent('Camera', CameraComponent);

  console.log('✓ Managers initialized\n');

  // ============================================================================
  // 步骤 3: 初始化物理系统
  // ============================================================================
  console.log('Initializing Rapier physics engine...');
  await physicsSystem.initialize();

  // 注册系统
  systemManager.registerSystem('PhysicsSystem', physicsSystem);
  systemManager.registerSystem('CameraSystem', cameraSystem);

  console.log('✓ PhysicsSystem and CameraSystem registered\n');

  // ============================================================================
  // 步骤 4: 创建地板
  // ============================================================================
  console.log('=== Creating Ground ===\n');

  const ground = entityManager.createEntity('Ground');
  const groundTransform = new TransformComponent([0, -1, 0], [0, 0, 0], [20, 0.5, 20]);
  entityManager.addComponent(ground.id, groundTransform);

  const groundVisual = new VisualComponent();
  groundVisual.geometry = { type: 'box', parameters: { width: 20, height: 0.5, depth: 20 } };
  groundVisual.material = { type: 'standard', color: '#404040' };
  entityManager.addComponent(ground.id, groundVisual);

  const groundPhysics = new PhysicsComponent(
    'static',
    { shape: 'box', size: [20, 0.5, 20], offset: [0, 0, 0] },
    1.0,
    0.5,
    0.3
  );
  entityManager.addComponent(ground.id, groundPhysics);
  entityManager.addComponent(ground.id, new NameComponent('Ground', 'Static ground'));

  console.log('✓ Ground created\n');

  // ============================================================================
  // 步骤 5: 创建跟随目标（动力学方块）
  // ============================================================================
  console.log('=== Creating Target Box ===\n');

  const target = entityManager.createEntity('TargetBox');
  globalTargetEntity = target;

  // Transform: 初始位置
  const targetTransform = new TransformComponent([0, 3, 0], [0, 0, 0], [1, 1, 1]);
  entityManager.addComponent(target.id, targetTransform);

  // Visual: 红色方块
  const targetVisual = new VisualComponent();
  targetVisual.geometry = { type: 'box', parameters: { width: 1, height: 1, depth: 1 } };
  targetVisual.material = { type: 'standard', color: '#FF4444' };
  entityManager.addComponent(target.id, targetVisual);

  // Physics: 动力学刚体
  const targetPhysics = new PhysicsComponent(
    'dynamic',
    { shape: 'box', size: [1, 1, 1], offset: [0, 0, 0] },
    1.0,
    0.5,
    0.3
  );
  entityManager.addComponent(target.id, targetPhysics);
  entityManager.addComponent(target.id, new NameComponent('Target', 'Camera follow target'));

  console.log(`✓ Target box created: ${target.id}\n`);

  // ============================================================================
  // 步骤 6: 创建相机实体
  // ============================================================================
  console.log('=== Creating Camera ===\n');

  const camera = entityManager.createEntity('MainCamera');
  globalCameraEntity = camera;

  // Transform: 初始位置
  const cameraTransform = new TransformComponent([0, 5, 10], [-20, 0, 0], [1, 1, 1]);
  entityManager.addComponent(camera.id, cameraTransform);

  // Camera: 相机组件
  const cameraComponent = new CameraComponent();
  cameraComponent.mode = 'thirdPerson';
  cameraComponent.targetEntityId = target.id;
  cameraComponent.offset = [0, 2, 5];
  cameraComponent.distance = 5;
  cameraComponent.pitch = -20;
  cameraComponent.yaw = 0;
  cameraComponent.smoothSpeed = 5.0;
  entityManager.addComponent(camera.id, cameraComponent);

  entityManager.addComponent(camera.id, new NameComponent('Camera', 'Main camera'));

  console.log(`✓ Camera created: ${camera.id}`);
  console.log(`  Mode: ${cameraComponent.mode}`);
  console.log(`  Target: ${target.id}\n`);

  // ============================================================================
  // 步骤 7: 创建预设快照
  // ============================================================================
  console.log('=== Creating Preset Snapshots ===\n');

  // 第三人称预设
  presetSnapshots.set('thirdPerson', {
    mode: 'thirdPerson',
    fov: 60,
    offset: [0, 2, 5],
    distance: 5,
    minDistance: 2,
    maxDistance: 20,
    pitch: -20,
    yaw: 0,
    smoothSpeed: 5.0,
  });

  // 横版卷轴预设
  presetSnapshots.set('sidescroll', {
    mode: 'sidescroll',
    fov: 60,
    offset: [0, 2, 0],
    distance: 10,
    minDistance: 5,
    maxDistance: 20,
    pitch: 0,
    yaw: 0,
    lockAxis: 'z',
    smoothSpeed: 3.0,
  });

  // 等距视角预设（暗黑上帝视角）
  presetSnapshots.set('isometric', {
    mode: 'isometric',
    fov: 60,
    offset: [0, 0, 0],
    distance: 15,
    minDistance: 10,
    maxDistance: 30,
    pitch: -45,
    yaw: 45,
    lockAxis: 'y',
    smoothSpeed: 4.0,
  });

  // 第一人称预设
  presetSnapshots.set('firstPerson', {
    mode: 'firstPerson',
    fov: 75,
    offset: [0, 0, 0],
    distance: 0,
    minDistance: 0,
    maxDistance: 0,
    pitch: 0,
    yaw: 0,
    smoothSpeed: 8.0,
  });

  console.log('✓ Preset snapshots created:');
  console.log('  - thirdPerson (第三人称)');
  console.log('  - sidescroll (横版卷轴)');
  console.log('  - isometric (等距视角)');
  console.log('  - firstPerson (第一人称)\n');

  // ============================================================================
  // 步骤 8: 启动更新循环
  // ============================================================================
  console.log('=== Starting Camera Demo ===\n');

  console.log('✓ Camera demo started\n');
  console.log('=== Camera Demo Running! ===\n');
  console.log('✅ Ground created');
  console.log('✅ Target box created (dynamic)');
  console.log('✅ Camera created (third person mode)');
  console.log('✅ Physics and camera systems running\n');

  console.log('💡 Observe:');
  console.log('  - Camera smoothly follows the target box');
  console.log('  - Target box affected by physics');
  console.log('  - Smooth transitions between camera modes\n');

  console.log('💡 Controls:');
  console.log('  window.switchCameraMode(mode)    - Switch camera mode');
  console.log('    Modes: "thirdPerson", "sidescroll", "isometric", "firstPerson", "orbit"');
  console.log('  window.applyCameraPreset(name)   - Apply preset snapshot');
  console.log('    Presets: "thirdPerson", "sidescroll", "isometric", "firstPerson"');
  console.log('  window.getCameraSnapshot()       - Get current camera config');
  console.log('  window.moveCameraTarget(x,y,z)   - Move target box');
  console.log('  window.rotateCameraView(pitch,yaw) - Rotate camera view');
  console.log('  window.setCameraDistance(dist)   - Set camera distance');
  console.log('  window.showCameraStatus()        - Show camera status\n');

  // 启动更新循环
  startCameraLoop();
}

/**
 * 启动相机更新循环
 */
function startCameraLoop(): void {
  if (!globalSystemManager) return;

  const loop = () => {
    if (!globalSystemManager) return;

    // SystemManager 内部会调用 Clock.tick()
    globalSystemManager.update();

    // 继续循环
    animationFrameId = requestAnimationFrame(loop);
  };

  loop();
  console.log('✓ Camera loop started (60 FPS)\n');
}

/**
 * 停止相机演示
 */
export function stopCameraDemo(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    console.log('⏸️  Camera demo stopped');
  }
}

/**
 * 启动相机演示
 */
export function startCameraDemo(): void {
  if (animationFrameId === null) {
    startCameraLoop();
    console.log('▶️  Camera demo started');
  }
}

/**
 * 切换相机模式
 * 
 * 支持的模式：
 * - "orbit": 编辑器风格旋转
 * - "firstPerson": 第一人称
 * - "thirdPerson": 第三人称
 * - "isometric": 等距视角（暗黑上帝视角）
 * - "sidescroll": 横版卷轴（DNF 视角）
 */
export function switchCameraMode(mode: CameraMode): void {
  if (!globalCameraEntity || !globalCameraSystem) {
    console.warn('⚠️  Camera demo not initialized. Run await cameraDemo() first.');
    return;
  }

  const camera = globalCameraEntity.getComponent<CameraComponent>('Camera');
  if (!camera) return;

  globalCameraSystem.switchMode(camera, mode);
  console.log(`📷 Camera mode switched to: ${mode}`);
}

/**
 * 应用相机预设
 */
export function applyCameraPreset(presetName: string): void {
  if (!globalCameraEntity || !globalCameraSystem) {
    console.warn('⚠️  Camera demo not initialized. Run await cameraDemo() first.');
    return;
  }

  const snapshot = presetSnapshots.get(presetName);
  if (!snapshot) {
    console.warn(`⚠️  Preset "${presetName}" not found. Available: thirdPerson, sidescroll, isometric, firstPerson`);
    return;
  }

  const camera = globalCameraEntity.getComponent<CameraComponent>('Camera');
  if (!camera) return;

  globalCameraSystem.applyCameraSnapshot(camera, snapshot);
  console.log(`📷 Applied preset: ${presetName}`);
}

/**
 * 获取当前相机快照
 */
export function getCameraSnapshot(): CameraSnapshot | null {
  if (!globalCameraEntity) {
    console.warn('⚠️  Camera demo not initialized. Run await cameraDemo() first.');
    return null;
  }

  const camera = globalCameraEntity.getComponent<CameraComponent>('Camera');
  if (!camera) return null;

  const snapshot = camera.getSnapshot();
  console.log('\n=== Camera Snapshot ===');
  console.log(JSON.stringify(snapshot, null, 2));
  console.log('');
  return snapshot;
}

/**
 * 移动相机目标
 */
export function moveCameraTarget(x: number, y: number, z: number): void {
  if (!globalTargetEntity || !globalPhysicsSystem) {
    console.warn('⚠️  Camera demo not initialized. Run await cameraDemo() first.');
    return;
  }

  const transform = globalTargetEntity.getComponent<TransformComponent>('Transform');
  if (!transform) return;

  transform.position[0] = x;
  transform.position[1] = y;
  transform.position[2] = z;
  transform.markLocalDirty();

  // 同步到物理引擎
  globalPhysicsSystem.syncTransformToPhysics(globalTargetEntity);

  // 重置速度
  const rigidBody = globalPhysicsSystem.getRigidBody(globalTargetEntity.id);
  if (rigidBody) {
    rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  console.log(`📦 Target moved to [${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
}

/**
 * 旋转相机视角
 */
export function rotateCameraView(pitch: number, yaw: number): void {
  if (!globalCameraEntity) {
    console.warn('⚠️  Camera demo not initialized. Run await cameraDemo() first.');
    return;
  }

  const camera = globalCameraEntity.getComponent<CameraComponent>('Camera');
  if (!camera) return;

  camera.pitch = pitch;
  camera.yaw = yaw;

  console.log(`📷 Camera rotation: pitch=${pitch}°, yaw=${yaw}°`);
}

/**
 * 设置相机距离
 */
export function setCameraDistance(distance: number): void {
  if (!globalCameraEntity) {
    console.warn('⚠️  Camera demo not initialized. Run await cameraDemo() first.');
    return;
  }

  const camera = globalCameraEntity.getComponent<CameraComponent>('Camera');
  if (!camera) return;

  camera.distance = Math.max(camera.minDistance, Math.min(distance, camera.maxDistance));

  console.log(`📷 Camera distance: ${camera.distance.toFixed(1)}`);
}

/**
 * 显示相机状态
 */
export function showCameraStatus(): void {
  if (!globalCameraEntity || !globalTargetEntity) {
    console.warn('⚠️  Camera demo not initialized. Run await cameraDemo() first.');
    return;
  }

  const camera = globalCameraEntity.getComponent<CameraComponent>('Camera');
  const cameraTransform = globalCameraEntity.getComponent<TransformComponent>('Transform');
  const targetTransform = globalTargetEntity.getComponent<TransformComponent>('Transform');

  if (!camera || !cameraTransform || !targetTransform) return;

  console.log('\n=== Camera System Status ===\n');
  console.log(`Mode: ${camera.mode}`);
  console.log(`FOV: ${camera.fov}°`);
  console.log(`Distance: ${camera.distance.toFixed(1)}`);
  console.log(`Pitch: ${camera.pitch.toFixed(1)}°`);
  console.log(`Yaw: ${camera.yaw.toFixed(1)}°`);
  console.log(`Smooth Speed: ${camera.smoothSpeed.toFixed(1)}`);
  
  const cameraPos = cameraTransform.position;
  console.log(`\nCamera Position: [${cameraPos.map(v => v.toFixed(2)).join(', ')}]`);
  
  const targetPos = targetTransform.position;
  console.log(`Target Position: [${targetPos.map(v => v.toFixed(2)).join(', ')}]`);
  
  console.log('');
}
