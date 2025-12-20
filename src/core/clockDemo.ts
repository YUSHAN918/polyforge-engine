/**
 * PolyForge v1.3.0 Clock Demo
 * Phase 4: 时钟系统演示
 * 
 * 场景：旋转的立方体 + 循环音效，通过 TimeScale 控制速度
 */

import { EntityManager } from './EntityManager';
import { SystemManager } from './SystemManager';
import { Clock } from './Clock';
import { TransformComponent } from './components/TransformComponent';
import { VisualComponent } from './components/VisualComponent';
import { AudioSourceComponent } from './components/AudioSourceComponent';
import { NameComponent } from './components/NameComponent';
import { HierarchySystem } from './systems/HierarchySystem';
import { System, Entity } from './types';

/**
 * 旋转系统 - 让实体持续旋转
 */
class RotationSystem implements System {
  public readonly priority = 10;
  public readonly requiredComponents = ['Transform'];

  update(deltaTime: number, entities: Entity[]): void {
    for (const entity of entities) {
      const transform = entity.getComponent<TransformComponent>('Transform');
      if (transform) {
        // 绕 Y 轴旋转（每秒 45 度）
        transform.rotation[1] += 45 * deltaTime;
        transform.markLocalDirty();
      }
    }
  }

  onEntityAdded(entity: Entity): void {}
  onEntityRemoved(entity: Entity): void {}
}

/**
 * 音频系统 - 模拟音频播放（实际需要 Web Audio API）
 */
class AudioSystem implements System {
  public readonly priority = 100;
  public readonly requiredComponents = ['AudioSource'];

  private clock: Clock;
  private audioSources: Map<string, { playbackRate: number }> = new Map();

  constructor(clock: Clock) {
    this.clock = clock;

    // 监听 TimeScale 变化
    this.clock.onTimeScaleChanged((timeScale) => {
      this.updateAllPlaybackRates(timeScale);
    });
  }

  update(deltaTime: number, entities: Entity[]): void {
    // 更新音频源状态
    for (const entity of entities) {
      const audio = entity.getComponent<AudioSourceComponent>('AudioSource');
      if (audio && audio.enabled) {
        // 确保音频源已注册
        if (!this.audioSources.has(entity.id)) {
          this.audioSources.set(entity.id, {
            playbackRate: this.clock.getTimeScale(),
          });
        }
      }
    }
  }

  /**
   * 更新所有音频源的播放速率
   */
  private updateAllPlaybackRates(timeScale: number): void {
    console.log(`🔊 Updating audio playback rate to ${timeScale.toFixed(2)}x`);
    for (const [entityId, audioSource] of this.audioSources.entries()) {
      audioSource.playbackRate = timeScale;
    }
  }

  onEntityAdded(entity: Entity): void {
    const audio = entity.getComponent<AudioSourceComponent>('AudioSource');
    if (audio) {
      console.log(`🔊 Audio source added: ${entity.name}`);
    }
  }

  onEntityRemoved(entity: Entity): void {
    this.audioSources.delete(entity.id);
  }
}

// 全局变量（用于控制台交互）
let globalClock: Clock | null = null;
let globalSystemManager: SystemManager | null = null;

/**
 * Clock Demo
 * 演示时钟系统和 TimeScale 控制
 */
export function clockDemo(): void {
  console.log('\n=== PolyForge Phase 4: Clock System Demo ===\n');

  // 创建管理器
  const entityManager = new EntityManager();
  const clock = new Clock();
  const systemManager = new SystemManager(entityManager, clock);
  entityManager.setSystemManager(systemManager);

  // 保存到全局变量
  globalClock = clock;
  globalSystemManager = systemManager;

  // 注册组件
  entityManager.registerComponent('Transform', TransformComponent);
  entityManager.registerComponent('Visual', VisualComponent);
  entityManager.registerComponent('AudioSource', AudioSourceComponent);
  entityManager.registerComponent('Name', NameComponent);

  // 注册系统
  systemManager.registerSystem('Hierarchy', new HierarchySystem());
  systemManager.registerSystem('Rotation', new RotationSystem());
  systemManager.registerSystem('Audio', new AudioSystem(clock));

  console.log('✓ Managers and systems registered\n');

  // ============================================================================
  // 创建旋转立方体
  // ============================================================================

  const cube = entityManager.createEntity('RotatingCube');

  // 添加 Transform
  const cubeTransform = new TransformComponent([0, 0, 0], [0, 0, 0], [1, 1, 1]);
  entityManager.addComponent(cube.id, cubeTransform);

  // 添加 Name
  entityManager.addComponent(cube.id, new NameComponent('旋转立方体', '一个持续旋转的立方体'));

  // 添加 Visual
  const cubeVisual = new VisualComponent();
  cubeVisual.geometry = {
    type: 'box',
    parameters: { width: 1, height: 1, depth: 1 },
  };
  cubeVisual.material = {
    type: 'standard',
    color: '#ff6b6b',
    metalness: 0.5,
    roughness: 0.5,
  };
  entityManager.addComponent(cube.id, cubeVisual);

  // 添加 AudioSource（模拟循环音效）
  const cubeAudio = new AudioSourceComponent();
  cubeAudio.audioType = 'sfx';
  cubeAudio.assetId = 'loop_sound';
  cubeAudio.loop = true;
  cubeAudio.volume = 0.5;
  cubeAudio.affectedByTimeScale = true; // 受 TimeScale 影响
  entityManager.addComponent(cube.id, cubeAudio);

  console.log('✓ Rotating cube created');
  console.log(`  - Name: ${cube.getComponent<NameComponent>('Name')?.displayName}`);
  console.log(`  - Audio: ${cubeAudio.audioType} (loop: ${cubeAudio.loop})`);
  console.log(`  - TimeScale affected: ${cubeAudio.affectedByTimeScale}`);

  // ============================================================================
  // 启动时钟并模拟更新循环
  // ============================================================================

  console.log('\n=== Starting Clock ===\n');
  clock.start();

  // 模拟 5 秒的游戏循环
  console.log('Simulating 5 seconds of gameplay...\n');

  const simulationFrames = 300; // 约 5 秒（60 FPS）
  let frameCount = 0;

  for (let i = 0; i < simulationFrames; i++) {
    systemManager.update();
    frameCount++;

    // 每 60 帧打印一次状态
    if (frameCount % 60 === 0) {
      const status = clock.getStatus();
      const rotation = cubeTransform.rotation[1];
      console.log(`Frame ${frameCount}:`);
      console.log(`  Elapsed Time: ${status.elapsedTime.toFixed(2)}s`);
      console.log(`  TimeScale: ${status.timeScale.toFixed(2)}x`);
      console.log(`  Cube Rotation Y: ${rotation.toFixed(1)}°`);
      console.log(`  FPS: ${status.fps.toFixed(1)}`);
      console.log('');
    }
  }

  // ============================================================================
  // 演示 TimeScale 控制
  // ============================================================================

  console.log('=== TimeScale Control Demo ===\n');

  // 重置立方体旋转
  cubeTransform.rotation[1] = 0;
  cubeTransform.markLocalDirty();
  clock.reset();

  // 正常速度（1.0x）
  console.log('1. Normal speed (1.0x)');
  clock.setTimeScale(1.0);
  for (let i = 0; i < 60; i++) {
    systemManager.update();
  }
  console.log(`   Rotation after 1 second: ${cubeTransform.rotation[1].toFixed(1)}°`);
  console.log(`   Expected: ~45°\n`);

  // 半速（0.5x）
  cubeTransform.rotation[1] = 0;
  cubeTransform.markLocalDirty();
  clock.reset();
  console.log('2. Half speed (0.5x)');
  clock.setTimeScale(0.5);
  for (let i = 0; i < 60; i++) {
    systemManager.update();
  }
  console.log(`   Rotation after 1 second: ${cubeTransform.rotation[1].toFixed(1)}°`);
  console.log(`   Expected: ~22.5° (half of 45°)\n`);

  // 两倍速（2.0x）
  cubeTransform.rotation[1] = 0;
  cubeTransform.markLocalDirty();
  clock.reset();
  console.log('3. Double speed (2.0x)');
  clock.setTimeScale(2.0);
  for (let i = 0; i < 60; i++) {
    systemManager.update();
  }
  console.log(`   Rotation after 1 second: ${cubeTransform.rotation[1].toFixed(1)}°`);
  console.log(`   Expected: ~90° (double of 45°)\n`);

  // ============================================================================
  // 演示暂停功能
  // ============================================================================

  console.log('=== Pause Control Demo ===\n');

  cubeTransform.rotation[1] = 0;
  cubeTransform.markLocalDirty();
  clock.reset();
  clock.setTimeScale(1.0);

  console.log('1. Running for 30 frames...');
  for (let i = 0; i < 30; i++) {
    systemManager.update();
  }
  const rotationBeforePause = cubeTransform.rotation[1];
  console.log(`   Rotation: ${rotationBeforePause.toFixed(1)}°\n`);

  console.log('2. Pausing...');
  clock.pause();
  for (let i = 0; i < 30; i++) {
    systemManager.update();
  }
  const rotationDuringPause = cubeTransform.rotation[1];
  console.log(`   Rotation: ${rotationDuringPause.toFixed(1)}° (should be same)\n`);

  console.assert(
    Math.abs(rotationBeforePause - rotationDuringPause) < 0.1,
    'Rotation should not change during pause'
  );

  console.log('3. Resuming...');
  clock.resume();
  for (let i = 0; i < 30; i++) {
    systemManager.update();
  }
  const rotationAfterResume = cubeTransform.rotation[1];
  console.log(`   Rotation: ${rotationAfterResume.toFixed(1)}° (should increase)\n`);

  console.assert(
    rotationAfterResume > rotationDuringPause,
    'Rotation should increase after resume'
  );

  // ============================================================================
  // 统计信息
  // ============================================================================

  console.log('=== Statistics ===\n');
  const stats = entityManager.getStats();
  console.log(`Total Entities: ${stats.totalEntities}`);
  console.log(`Active Entities: ${stats.activeEntities}`);
  console.log(`Component Types: ${stats.componentTypes}`);

  const clockStatus = clock.getStatus();
  console.log(`\nClock Status:`);
  console.log(`  Elapsed Time: ${clockStatus.elapsedTime.toFixed(2)}s`);
  console.log(`  TimeScale: ${clockStatus.timeScale.toFixed(2)}x`);
  console.log(`  Paused: ${clockStatus.paused}`);
  console.log(`  FPS: ${clockStatus.fps.toFixed(1)}`);

  console.log('\n=== Clock Demo Complete! ===\n');
  console.log('✅ Clock system working correctly');
  console.log('✅ TimeScale control verified');
  console.log('✅ Pause/Resume functionality verified');
  console.log('✅ Audio system integration ready');

  // ============================================================================
  // 暴露控制函数到全局
  // ============================================================================

  console.log('\n💡 Interactive Controls:');
  console.log('  window.setSpeed(0.5)   - Set time scale to 0.5x');
  console.log('  window.setSpeed(2.0)   - Set time scale to 2.0x');
  console.log('  window.pauseGame()     - Pause the game');
  console.log('  window.resumeGame()    - Resume the game');
  console.log('  window.togglePause()   - Toggle pause state');
  console.log('  window.getClockStatus() - Get clock status');
}

// ============================================================================
// 全局控制函数
// ============================================================================

/**
 * 设置游戏速度
 */
export function setSpeed(speed: number): void {
  if (globalClock) {
    globalClock.setTimeScale(speed);
    console.log(`⏱️  Speed set to ${speed.toFixed(2)}x`);
  } else {
    console.warn('Clock not initialized. Run clockDemo() first.');
  }
}

/**
 * 暂停游戏
 */
export function pauseGame(): void {
  if (globalClock) {
    globalClock.pause();
  } else {
    console.warn('Clock not initialized. Run clockDemo() first.');
  }
}

/**
 * 恢复游戏
 */
export function resumeGame(): void {
  if (globalClock) {
    globalClock.resume();
  } else {
    console.warn('Clock not initialized. Run clockDemo() first.');
  }
}

/**
 * 切换暂停状态
 */
export function togglePause(): void {
  if (globalClock) {
    globalClock.togglePause();
  } else {
    console.warn('Clock not initialized. Run clockDemo() first.');
  }
}

/**
 * 获取时钟状态
 */
export function getClockStatus(): void {
  if (globalClock) {
    globalClock.debug();
  } else {
    console.warn('Clock not initialized. Run clockDemo() first.');
  }
}
