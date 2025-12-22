/**
 * PolyForge v1.3.0 AudioSystem Demo
 * Phase 9: 音频系统演示
 * 
 * 演示内容：
 * - 从 AssetRegistry 加载音频资产
 * - 创建发光小球在 3D 空间中环绕相机运动
 * - 播放空间音频，展示 HRTF 效果
 * - TimeScale 联动演示
 */

import { EntityManager } from '../EntityManager';
import { SystemManager } from '../SystemManager';
import { Clock } from '../Clock';
import { Entity } from '../Entity';
import { TransformComponent } from '../components/TransformComponent';
import { VisualComponent } from '../components/VisualComponent';
import { AudioSourceComponent } from '../components/AudioSourceComponent';
import { CameraComponent } from '../components/CameraComponent';
import { HierarchySystem } from '../systems/HierarchySystem';
import { AudioSystem } from '../systems/AudioSystem';
import { CameraSystem } from '../systems/CameraSystem';
import { AssetRegistry } from '../assets/AssetRegistry';
import { AssetType } from '../assets/types';

/**
 * 音频演示场景
 */
export async function audioDemo(): Promise<void> {
  console.log('🎵 === Audio System Demo ===');

  // 初始化 ECS
  const entityManager = new EntityManager();
  const clock = new Clock();
  const systemManager = new SystemManager(entityManager, clock);

  // 注册系统
  const hierarchySystem = new HierarchySystem();
  const audioSystem = new AudioSystem();
  const cameraSystem = new CameraSystem();

  systemManager.registerSystem('HierarchySystem', hierarchySystem);
  systemManager.registerSystem('AudioSystem', audioSystem);
  systemManager.registerSystem('CameraSystem', cameraSystem);

  // 初始化 AssetRegistry
  const assetRegistry = AssetRegistry.getInstance();
  await assetRegistry.initialize();
  audioSystem.setAssetRegistry(assetRegistry);
  audioSystem.setClock(clock);

  // 查询可用的音频资产
  console.log('🔍 Searching for audio assets...');
  const audioAssets = await assetRegistry.queryAssets({ type: AssetType.AUDIO });

  if (audioAssets.length === 0) {
    console.warn('⚠️ No audio assets found in AssetRegistry');
    console.log('💡 Please import an audio file first using the asset browser');
    return;
  }

  // 使用第一个音频资产
  const audioAsset = audioAssets[0];
  console.log(`✓ Using audio asset: ${audioAsset.name} (${audioAsset.id})`);

  // 创建相机实体
  const camera = entityManager.createEntity('Main Camera');
  const cameraTransform = new TransformComponent();
  cameraTransform.position = [0, 2, 10];
  camera.addComponent(cameraTransform);

  const cameraComp = new CameraComponent();
  cameraComp.mode = 'orbit';
  cameraComp.distance = 10;
  camera.addComponent(cameraComp);

  // 创建发光音频小球（环绕相机运动）
  const audioSphere = entityManager.createEntity('Audio Sphere');

  // Transform
  const sphereTransform = new TransformComponent();
  sphereTransform.position = [5, 2, 0];
  audioSphere.addComponent(sphereTransform);

  // Visual（发光小球）
  const sphereVisual = new VisualComponent();
  sphereVisual.geometry = {
    type: 'sphere',
    parameters: {
      radius: 0.5,
    },
  };
  sphereVisual.material = {
    type: 'standard',
    color: '#33ccff',
    metalness: 0.8,
    roughness: 0.2,
  };
  sphereVisual.emissive = {
    color: '#33ccff',
    intensity: 2.0,
  };
  audioSphere.addComponent(sphereVisual);

  // AudioSource（空间音频）
  const audioSource = AudioSourceComponent.createSpatialSFX(
    audioAsset.id,
    0.8,
    20  // maxDistance
  );
  audioSource.loop = true;
  audioSource.autoPlay = true;
  audioSource.affectedByTimeScale = true;
  audioSource.minDistance = 1;
  audioSource.rolloffFactor = 1.5;
  audioSphere.addComponent(audioSource);

  console.log('✓ Scene created');
  console.log('  - Camera at (0, 2, 10)');
  console.log('  - Audio Sphere at (5, 2, 0)');
  console.log('  - Spatial audio enabled with HRTF');

  // 动画参数
  let time = 0;
  const orbitRadius = 5;
  const orbitSpeed = 0.5;

  // 更新循环
  let frameCount = 0;
  const updateLoop = () => {
    // 更新系统
    systemManager.update();
    const deltaTime = clock.getDeltaTime();

    // 环绕运动
    time += deltaTime * orbitSpeed;
    const x = Math.cos(time) * orbitRadius;
    const z = Math.sin(time) * orbitRadius;
    const y = 2 + Math.sin(time * 2) * 1;  // 上下波动

    sphereTransform.position = [x, y, z];
    sphereTransform.markLocalDirty();

    // 每 60 帧打印一次状态
    frameCount++;
    if (frameCount % 60 === 0) {
      const stats = audioSystem.getStats();
      console.log(`🎵 Audio Stats: Active=${stats.activeNodes}, Cached=${stats.cachedBuffers}, Unlocked=${stats.isUnlocked}`);
    }

    requestAnimationFrame(updateLoop);
  };

  // 启动更新循环
  clock.start();
  updateLoop();

  // 暴露控制接口到全局
  (window as any).audioDemoControls = {
    setTimeScale: (scale: number) => {
      clock.setTimeScale(scale);
      console.log(`⏱️ TimeScale set to ${scale}x`);
    },
    setVolume: (volume: number) => {
      audioSource.setVolume(volume);
      console.log(`🔊 Volume set to ${volume}`);
    },
    setPitch: (pitch: number) => {
      audioSource.setPitch(pitch);
      console.log(`🎵 Pitch set to ${pitch}`);
    },
    toggleLoop: () => {
      audioSource.loop = !audioSource.loop;
      console.log(`🔁 Loop: ${audioSource.loop}`);
    },
    setMasterVolume: (volume: number) => {
      audioSystem.setMasterVolume(volume);
      console.log(`🔊 Master volume set to ${volume}`);
    },
    getStats: () => {
      const stats = audioSystem.getStats();
      console.log('=== Audio System Stats ===');
      console.log(`Active Nodes: ${stats.activeNodes}`);
      console.log(`Cached Buffers: ${stats.cachedBuffers}`);
      console.log(`Unlocked: ${stats.isUnlocked}`);
      console.log(`Master Volume: ${stats.masterVolume}`);
      return stats;
    },
    pause: () => {
      clock.pause();
      console.log('⏸️ Paused');
    },
    resume: () => {
      clock.resume();
      console.log('▶️ Resumed');
    },
  };

  console.log('');
  console.log('🎮 === Demo Controls ===');
  console.log('window.audioDemoControls.setTimeScale(0.5)  - 慢动作');
  console.log('window.audioDemoControls.setTimeScale(2.0)  - 快进');
  console.log('window.audioDemoControls.setVolume(0.5)     - 设置音量');
  console.log('window.audioDemoControls.setPitch(1.5)      - 设置音调');
  console.log('window.audioDemoControls.toggleLoop()       - 切换循环');
  console.log('window.audioDemoControls.setMasterVolume(0.5) - 主音量');
  console.log('window.audioDemoControls.getStats()         - 查看统计');
  console.log('window.audioDemoControls.pause()            - 暂停');
  console.log('window.audioDemoControls.resume()           - 恢复');
  console.log('');
  console.log('💡 Tip: 移动相机可以听到空间音频效果（HRTF）');
  console.log('💡 Tip: 调整 TimeScale 可以听到音调变化');
}

// 暴露到全局
(window as any).audioDemo = audioDemo;
