/**
 * PolyForge v1.3.0 RenderSystem Demo
 * Phase 12: 塞尔达式光影联动演示
 * 
 * 演示内容：
 * - EngineBridge 桥接层
 * - VisualComponent 渲染
 * - HDR 环境贴图应用
 * - 昼夜循环光影联动
 * - 金属质感物体的 HDR 反射
 * - 自发光辉光效果
 */

import { EntityManager } from '../EntityManager';
import { SystemManager } from '../SystemManager';
import { Clock } from '../Clock';
import { WorldStateManager } from '../WorldStateManager';
import { TransformComponent } from '../components/TransformComponent';
import { VisualComponent } from '../components/VisualComponent';
import { HierarchySystem } from '../systems/HierarchySystem';
import { getAssetRegistry } from '../assets/AssetRegistry';
import { AssetType } from '../assets/types';

// 全局变量（用于控制台交互）
let globalEntityManager: EntityManager;
let globalWorldStateManager: WorldStateManager;
let globalClock: Clock;
let globalSystemManager: SystemManager;
let globalPostProcessingSettings = {
  enabled: true,
  bloomEnabled: true,
  bloomStrength: 1.5,
  bloomRadius: 0.4,
  bloomThreshold: 0.85,
  smaaEnabled: true,
};

/**
 * 渲染系统演示场景
 */
export async function renderDemo(): Promise<void> {
  console.log('🎨 === RenderSystem Demo ===');
  console.log('塞尔达式光影联动 + HDR 反射演示');

  // ✅ 核心修复：初始化 AssetRegistry（避免竞态问题）
  console.log('🔧 Initializing AssetRegistry...');
  const assetRegistry = getAssetRegistry();
  await assetRegistry.initialize();
  console.log('✓ AssetRegistry initialized');

  // 初始化 ECS
  const entityManager = new EntityManager();
  const clock = new Clock();
  const systemManager = new SystemManager(entityManager, clock);
  const worldStateManager = new WorldStateManager();

  // 保存到全局变量
  globalEntityManager = entityManager;
  globalWorldStateManager = worldStateManager;
  globalClock = clock;
  globalSystemManager = systemManager;

  // 注册系统
  const hierarchySystem = new HierarchySystem();
  systemManager.registerSystem('HierarchySystem', hierarchySystem);

  // 创建场景（此时 AssetRegistry 已就绪）
  await createDemoScene();

  // 启用昼夜循环（快速模式：30 秒一天）
  worldStateManager.setDayNightCycleEnabled(true);
  worldStateManager.setDayDuration(30);

  console.log('✓ Day-night cycle enabled (30 seconds per day)');
  console.log('');

  // 更新循环
  let frameCount = 0;
  const updateLoop = () => {
    // 更新系统
    systemManager.update();
    const deltaTime = clock.getDeltaTime();

    // 更新环境状态
    worldStateManager.update(deltaTime);

    // 每 60 帧打印一次状态
    frameCount++;
    if (frameCount % 60 === 0) {
      const time = worldStateManager.getTimeOfDay();
      const hours = Math.floor(time);
      const minutes = Math.floor((time - hours) * 60);
      const intensity = (worldStateManager.getState().lightIntensity * 100).toFixed(1);
      const colorTemp = worldStateManager.getState().colorTemperature.toFixed(0);
      console.log(`🌍 Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} | Light: ${intensity}% | Temp: ${colorTemp}K`);
    }

    requestAnimationFrame(updateLoop);
  };

  // 启动更新循环
  clock.start();
  updateLoop();

  // 暴露控制接口到全局
  (window as any).renderDemoControls = {
    setTimeOfDay: (hours: number) => {
      worldStateManager.setTimeOfDay(hours);
      console.log(`🕐 Time set to ${hours.toFixed(2)}h`);
    },
    setDayDuration: (seconds: number) => {
      worldStateManager.setDayDuration(seconds);
      console.log(`⏱️ Day duration set to ${seconds}s`);
    },
    toggleDayNightCycle: () => {
      const enabled = !worldStateManager['dayNightCycleEnabled'];
      worldStateManager.setDayNightCycleEnabled(enabled);
      console.log(`🌍 Day-night cycle: ${enabled ? 'enabled' : 'disabled'}`);
    },
    setLightIntensity: (intensity: number) => {
      worldStateManager.setLightIntensity(intensity);
      console.log(`💡 Light intensity set to ${(intensity * 100).toFixed(1)}%`);
    },
    getState: () => {
      const state = worldStateManager.getState();
      console.log('=== World State ===');
      console.log(`Time: ${state.timeOfDay.toFixed(2)}h`);
      console.log(`Light Intensity: ${(state.lightIntensity * 100).toFixed(1)}%`);
      console.log(`Color Temperature: ${state.colorTemperature}K`);
      console.log(`Ambient Color: ${state.ambientColor}`);
      console.log(`Directional Color: ${state.directionalColor}`);
      return state;
    },
    debug: () => {
      worldStateManager.debug();
    },
    
    // 实体控制
    listEntities: () => {
      const entities = entityManager.getActiveEntities();
      console.log('=== Active Entities ===');
      entities.forEach((entity) => {
        console.log(`- ${entity.name} (${entity.id})`);
      });
      return entities;
    },
    
    // 资产查询
    listAssets: async () => {
      const assetRegistry = getAssetRegistry();
      const models = await assetRegistry.queryAssets({ type: AssetType.MODEL });
      const hdrs = await assetRegistry.queryAssets({ type: AssetType.HDR });
      
      console.log('=== Available Assets ===');
      console.log(`Models: ${models.length}`);
      models.forEach((asset) => {
        console.log(`  - ${asset.name} (${asset.id})`);
      });
      console.log(`HDR Environments: ${hdrs.length}`);
      hdrs.forEach((asset) => {
        console.log(`  - ${asset.name} (${asset.id})`);
      });
      
      return { models, hdrs };
    },
    
    // 后处理控制
    togglePostProcessing: () => {
      globalPostProcessingSettings.enabled = !globalPostProcessingSettings.enabled;
      console.log(`🎬 Post-processing: ${globalPostProcessingSettings.enabled ? 'enabled' : 'disabled'}`);
      console.log('⚠️ Reload the page to apply changes');
      return globalPostProcessingSettings;
    },
    
    toggleBloom: () => {
      globalPostProcessingSettings.bloomEnabled = !globalPostProcessingSettings.bloomEnabled;
      console.log(`✨ Bloom: ${globalPostProcessingSettings.bloomEnabled ? 'enabled' : 'disabled'}`);
      console.log('⚠️ Reload the page to apply changes');
      return globalPostProcessingSettings;
    },
    
    setBloomStrength: (strength: number) => {
      globalPostProcessingSettings.bloomStrength = strength;
      console.log(`✨ Bloom strength set to ${strength.toFixed(2)}`);
      console.log('⚠️ Reload the page to apply changes');
      return globalPostProcessingSettings;
    },
    
    setBloomThreshold: (threshold: number) => {
      globalPostProcessingSettings.bloomThreshold = threshold;
      console.log(`✨ Bloom threshold set to ${threshold.toFixed(2)}`);
      console.log('⚠️ Reload the page to apply changes');
      return globalPostProcessingSettings;
    },
    
    toggleSMAA: () => {
      globalPostProcessingSettings.smaaEnabled = !globalPostProcessingSettings.smaaEnabled;
      console.log(`🔲 SMAA: ${globalPostProcessingSettings.smaaEnabled ? 'enabled' : 'disabled'}`);
      console.log('⚠️ Reload the page to apply changes');
      return globalPostProcessingSettings;
    },
    
    getPostProcessingSettings: () => {
      console.log('=== Post-Processing Settings ===');
      console.log(`Enabled: ${globalPostProcessingSettings.enabled}`);
      console.log(`Bloom Enabled: ${globalPostProcessingSettings.bloomEnabled}`);
      console.log(`Bloom Strength: ${globalPostProcessingSettings.bloomStrength}`);
      console.log(`Bloom Radius: ${globalPostProcessingSettings.bloomRadius}`);
      console.log(`Bloom Threshold: ${globalPostProcessingSettings.bloomThreshold}`);
      console.log(`SMAA Enabled: ${globalPostProcessingSettings.smaaEnabled}`);
      return globalPostProcessingSettings;
    },
  };

  console.log('');
  console.log('🎮 === Demo Controls ===');
  console.log('window.renderDemoControls.setTimeOfDay(18)     - 设置时间（18:00 日落）');
  console.log('window.renderDemoControls.setDayDuration(60)   - 设置一天时长（60秒）');
  console.log('window.renderDemoControls.toggleDayNightCycle() - 切换昼夜循环');
  console.log('window.renderDemoControls.setLightIntensity(0.5) - 设置光照强度');
  console.log('window.renderDemoControls.getState()           - 查看当前状态');
  console.log('window.renderDemoControls.debug()              - 调试信息');
  console.log('window.renderDemoControls.listEntities()       - 列出所有实体');
  console.log('window.renderDemoControls.listAssets()         - 列出所有资产');
  console.log('');
  console.log('🎬 === Post-Processing Controls ===');
  console.log('window.renderDemoControls.togglePostProcessing() - 切换后处理');
  console.log('window.renderDemoControls.toggleBloom()        - 切换辉光效果');
  console.log('window.renderDemoControls.setBloomStrength(2.0) - 设置辉光强度');
  console.log('window.renderDemoControls.setBloomThreshold(0.5) - 设置辉光阈值');
  console.log('window.renderDemoControls.toggleSMAA()         - 切换抗锯齿');
  console.log('window.renderDemoControls.getPostProcessingSettings() - 查看后处理设置');
  console.log('');
  console.log('💡 Tip: 观察金属物体表面的 HDR 反射随太阳位置实时流转！');
  console.log('💡 Tip: 在深夜时刻，自发光部分会产生辉光效果！');
  console.log('💡 Tip: 调整 bloomThreshold 可以控制哪些物体产生辉光！');
}

/**
 * 创建演示场景
 */
async function createDemoScene(): Promise<void> {
  console.log('🏗️ Creating demo scene...');

  // ✅ 健壮性检查：确保 AssetRegistry 已初始化
  const assetRegistry = getAssetRegistry();
  if (!assetRegistry['initialized']) {
    console.warn('⚠️ AssetRegistry not initialized, initializing now...');
    await assetRegistry.initialize();
  }

  // 查询可用的模型资产
  const modelAssets = await assetRegistry.queryAssets({ type: AssetType.MODEL });
  console.log(`📦 Found ${modelAssets.length} model assets`);
  
  // 查询可用的 HDR 资产
  const hdrAssets = await assetRegistry.queryAssets({ type: AssetType.HDR });
  console.log(`🌅 Found ${hdrAssets.length} HDR assets`);
  
  // 创建地面
  const ground = globalEntityManager.createEntity('Ground');
  const groundTransform = new TransformComponent();
  groundTransform.position = [0, -0.5, 0];
  groundTransform.scale = [30, 1, 30];
  ground.addComponent(groundTransform);

  const groundVisual = new VisualComponent();
  groundVisual.geometry = {
    type: 'box',
    parameters: { width: 1, height: 1, depth: 1 },
  };
  groundVisual.material = {
    type: 'standard',
    color: '#404040',
    metalness: 0.1,
    roughness: 0.9,
  };
  ground.addComponent(groundVisual);

  console.log('✓ Ground created');

  // 创建中心展示物体（金属球体）
  const centerSphere = globalEntityManager.createEntity('Metal Sphere');
  const centerTransform = new TransformComponent();
  centerTransform.position = [0, 1.5, 0];
  centerTransform.scale = [1.5, 1.5, 1.5];
  centerSphere.addComponent(centerTransform);

  const centerVisual = new VisualComponent();
  centerVisual.geometry = {
    type: 'sphere',
    parameters: { radius: 1, segments: 64 },
  };
  centerVisual.material = {
    type: 'physical',
    color: '#c0c0c0',
    metalness: 1.0,  // 完全金属
    roughness: 0.1,  // 高光泽
  };
  centerSphere.addComponent(centerVisual);

  console.log('✓ Metal sphere created (HDR reflections)');

  // 如果有手枪模型，加载它
  const gunAsset = modelAssets.find(asset => 
    asset.name.toLowerCase().includes('gun') || 
    asset.name.toLowerCase().includes('pistol') ||
    asset.name.toLowerCase().includes('weapon')
  );

  if (gunAsset) {
    const gun = globalEntityManager.createEntity('Pistol');
    const gunTransform = new TransformComponent();
    gunTransform.position = [3, 1, 0];
    gunTransform.rotation = [0, 45, 0];
    gun.addComponent(gunTransform);

    const gunVisual = new VisualComponent();
    gunVisual.geometry = {
      type: 'custom',
      assetId: gunAsset.id,
    };
    gunVisual.material = {
      type: 'physical',
      color: '#ffffff',
      metalness: 0.9,
      roughness: 0.2,
    };
    gun.addComponent(gunVisual);

    console.log(`✓ Pistol model loaded (${gunAsset.name})`);
  } else {
    // 如果没有手枪模型，创建一个金属立方体
    const metalCube = globalEntityManager.createEntity('Metal Cube');
    const cubeTransform = new TransformComponent();
    cubeTransform.position = [3, 1, 0];
    cubeTransform.rotation = [0, 45, 0];
    metalCube.addComponent(cubeTransform);

    const cubeVisual = new VisualComponent();
    cubeVisual.geometry = {
      type: 'box',
      parameters: { width: 1, height: 1, depth: 1 },
    };
    cubeVisual.material = {
      type: 'physical',
      color: '#808080',
      metalness: 0.9,
      roughness: 0.2,
    };
    metalCube.addComponent(cubeVisual);

    console.log('✓ Metal cube created (fallback)');
  }

  // 创建发光球体（夜晚辉光效果）
  const glowSphere = globalEntityManager.createEntity('Glow Sphere');
  const glowTransform = new TransformComponent();
  glowTransform.position = [-3, 1.5, 0];
  glowSphere.addComponent(glowTransform);

  const glowVisual = new VisualComponent();
  glowVisual.geometry = {
    type: 'sphere',
    parameters: { radius: 0.5, segments: 32 },
  };
  glowVisual.material = {
    type: 'standard',
    color: '#00ffff',
    metalness: 0.5,
    roughness: 0.5,
  };
  glowVisual.setEmissive('#00ffff', 2.0);
  glowVisual.postProcessing.bloom = true;
  glowSphere.addComponent(glowVisual);

  console.log('✓ Glow sphere created (bloom effect)');

  // 创建一圈装饰物体
  const count = 8;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const pillar = globalEntityManager.createEntity(`Pillar ${i + 1}`);
    const pillarTransform = new TransformComponent();
    pillarTransform.position = [x, 1, z];
    pillarTransform.scale = [0.5, 2, 0.5];
    pillar.addComponent(pillarTransform);

    const pillarVisual = new VisualComponent();
    pillarVisual.geometry = {
      type: 'cylinder',
      parameters: { radius: 1, height: 1, segments: 16 },
    };
    pillarVisual.material = {
      type: 'standard',
      color: '#8b4513',
      metalness: 0.3,
      roughness: 0.7,
    };
    pillar.addComponent(pillarVisual);
  }

  console.log(`✓ ${count} pillars created`);

  // 创建天空球（如果没有 HDR）
  const skyDome = globalEntityManager.createEntity('Sky Dome');
  const skyTransform = new TransformComponent();
  skyTransform.position = [0, 0, 0];
  skyTransform.scale = [100, 100, 100];
  skyDome.addComponent(skyTransform);

  const skyVisual = new VisualComponent();
  skyVisual.geometry = {
    type: 'sphere',
    parameters: { radius: 1, segments: 32 },
  };
  skyVisual.material = {
    type: 'basic',
    color: '#87ceeb',
  };
  skyVisual.castShadow = false;
  skyVisual.receiveShadow = false;
  skyDome.addComponent(skyVisual);

  console.log('✓ Sky dome created');

  console.log('');
  console.log('✅ Demo scene created successfully!');
  console.log(`   - ${globalEntityManager.getEntityCount()} entities`);
  console.log('');
}

// 暴露到全局
(window as any).renderDemo = renderDemo;

/**
 * 获取后处理设置（供 App.tsx 使用）
 */
export function getPostProcessingSettings() {
  return globalPostProcessingSettings;
}
