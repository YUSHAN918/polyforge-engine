/**
 * PolyForge v1.3.0 WorldStateManager Demo
 * Phase 11: 全局环境状态管理演示
 * 
 * 演示内容：
 * - 昼夜循环系统
 * - 光照自动调整
 * - 全场景存档（Global Snapshot）
 * - 刷新页面后恢复场景
 */

import { EntityManager } from '../EntityManager';
import { SystemManager } from '../SystemManager';
import { SerializationService, SerializedWorld } from '../SerializationService';
import { Clock } from '../Clock';
import { WorldStateManager } from '../WorldStateManager';
import { TransformComponent } from '../components/TransformComponent';
import { VisualComponent } from '../components/VisualComponent';
import { HierarchySystem } from '../systems/HierarchySystem';

// 全局变量（用于控制台交互）
let globalEntityManager: EntityManager;
let globalSerializationService: SerializationService;
let globalWorldStateManager: WorldStateManager;
let globalClock: Clock;
let globalSystemManager: SystemManager;

// LocalStorage 键名
const SNAPSHOT_KEY = 'polyforge_world_snapshot';

/**
 * 世界状态演示场景
 */
export async function worldStateDemo(): Promise<void> {
  console.log('🌍 === World State Manager Demo ===');

  // 初始化 ECS
  const entityManager = new EntityManager();
  const clock = new Clock();
  const systemManager = new SystemManager(entityManager, clock);
  const serializationService = new SerializationService(entityManager);
  const worldStateManager = new WorldStateManager();

  // 保存到全局变量
  globalEntityManager = entityManager;
  globalSerializationService = serializationService;
  globalWorldStateManager = worldStateManager;
  globalClock = clock;
  globalSystemManager = systemManager;

  // 🆕 注册核心组件（必须在任何实体创建之前）
  entityManager.registerComponent('Transform', TransformComponent);
  entityManager.registerComponent('Visual', VisualComponent);
  console.log('✓ Core components registered');

  // 注册系统
  const hierarchySystem = new HierarchySystem();
  systemManager.registerSystem('HierarchySystem', hierarchySystem);

  // 检查是否有保存的场景
  const savedSnapshot = localStorage.getItem(SNAPSHOT_KEY);
  if (savedSnapshot) {
    console.log('💾 Found saved snapshot, loading...');
    try {
      const data = JSON.parse(savedSnapshot) as SerializedWorld;
      serializationService.deserialize(data);
      
      // 恢复环境状态
      if (data.worldState) {
        worldStateManager.deserialize(data.worldState);
      }
      
      console.log('✓ Snapshot loaded successfully');
      console.log(`  - ${data.entities.length} entities restored`);
      console.log(`  - Time of day: ${worldStateManager.getTimeOfDay().toFixed(2)}h`);
    } catch (error) {
      console.error('❌ Failed to load snapshot:', error);
      createDefaultScene();
    }
  } else {
    console.log('🆕 No saved snapshot found, creating default scene...');
    createDefaultScene();
  }

  // 创建默认场景
  function createDefaultScene(): void {
    // 创建地面
    const ground = entityManager.createEntity('Ground');
    const groundTransform = new TransformComponent();
    groundTransform.position = [0, -0.5, 0];
    groundTransform.scale = [20, 1, 20];
    ground.addComponent(groundTransform);

    const groundVisual = new VisualComponent();
    groundVisual.geometry = {
      type: 'box',
      parameters: { width: 1, height: 1, depth: 1 },
    };
    groundVisual.material = {
      type: 'standard',
      color: '#808080',
      metalness: 0.2,
      roughness: 0.8,
    };
    ground.addComponent(groundVisual);

    // 创建太阳指示器（发光球体）
    const sun = entityManager.createEntity('Sun Indicator');
    const sunTransform = new TransformComponent();
    sunTransform.position = [0, 5, 0];
    sun.addComponent(sunTransform);

    const sunVisual = new VisualComponent();
    sunVisual.geometry = {
      type: 'sphere',
      parameters: { radius: 0.5 },
    };
    sunVisual.material = {
      type: 'standard',
      color: '#ffff00',
      metalness: 0.8,
      roughness: 0.2,
    };
    sunVisual.emissive = {
      color: '#ffff00',
      intensity: 2.0,
    };
    sun.addComponent(sunVisual);

    // 创建几个装饰立方体
    for (let i = 0; i < 5; i++) {
      const cube = entityManager.createEntity(`Cube${i + 1}`);
      const cubeTransform = new TransformComponent();
      cubeTransform.position = [
        (Math.random() - 0.5) * 10,
        0.5,
        (Math.random() - 0.5) * 10,
      ];
      cubeTransform.rotation = [
        Math.random() * 360,
        Math.random() * 360,
        Math.random() * 360,
      ];
      cube.addComponent(cubeTransform);

      const cubeVisual = new VisualComponent();
      cubeVisual.geometry = {
        type: 'box',
        parameters: { width: 1, height: 1, depth: 1 },
      };
      cubeVisual.material = {
        type: 'standard',
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
        metalness: 0.5,
        roughness: 0.5,
      };
      cube.addComponent(cubeVisual);
    }

    console.log('✓ Default scene created');
  }

  // 监听环境状态变化
  worldStateManager.onStateChanged((state) => {
    // 更新太阳指示器的发光强度
    const sun = entityManager.getActiveEntities().find(e => e.name === 'Sun Indicator');
    if (sun) {
      const visual = sun.getComponent<VisualComponent>('Visual');
      if (visual) {
        visual.emissive.intensity = state.lightIntensity * 3.0;
      }
    }
  });

  // 启用昼夜循环
  worldStateManager.setDayNightCycleEnabled(true);
  worldStateManager.setDayDuration(60); // 1分钟一天

  console.log('✓ Day-night cycle enabled (60 seconds per day)');
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
      console.log(`🌍 Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} | Light: ${intensity}%`);
    }

    requestAnimationFrame(updateLoop);
  };

  // 启动更新循环
  clock.start();
  updateLoop();

  // 暴露控制接口到全局
  (window as any).worldStateControls = {
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
    
    // 全场景存档功能
    saveSnapshot: () => {
      console.log('💾 Saving global snapshot...');
      
      // 序列化实体
      const worldData = serializationService.serialize({
        name: 'World State Demo',
        description: 'Saved from worldStateDemo',
      });
      
      // 添加环境状态
      worldData.worldState = worldStateManager.serialize();
      
      // 保存到 LocalStorage
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(worldData));
      
      console.log('✓ Snapshot saved to LocalStorage');
      console.log(`  - ${worldData.entities.length} entities`);
      console.log(`  - Time: ${worldStateManager.getTimeOfDay().toFixed(2)}h`);
      console.log('💡 Refresh the page and run worldStateDemo() again to restore!');
    },
    
    loadSnapshot: () => {
      console.log('📂 Loading snapshot...');
      
      const savedSnapshot = localStorage.getItem(SNAPSHOT_KEY);
      if (!savedSnapshot) {
        console.warn('⚠️ No saved snapshot found');
        return;
      }
      
      try {
        const data = JSON.parse(savedSnapshot) as SerializedWorld;
        
        // 清空当前场景
        entityManager.clear();
        
        // 恢复实体
        serializationService.deserialize(data, false);
        
        // 恢复环境状态
        if (data.worldState) {
          worldStateManager.deserialize(data.worldState);
        }
        
        console.log('✓ Snapshot loaded');
        console.log(`  - ${data.entities.length} entities restored`);
        console.log(`  - Time: ${worldStateManager.getTimeOfDay().toFixed(2)}h`);
      } catch (error) {
        console.error('❌ Failed to load snapshot:', error);
      }
    },
    
    clearSnapshot: () => {
      localStorage.removeItem(SNAPSHOT_KEY);
      console.log('🗑️ Snapshot cleared from LocalStorage');
    },
  };

  console.log('');
  console.log('🎮 === Demo Controls ===');
  console.log('window.worldStateControls.setTimeOfDay(18)     - 设置时间（18:00）');
  console.log('window.worldStateControls.setDayDuration(30)   - 设置一天时长（30秒）');
  console.log('window.worldStateControls.toggleDayNightCycle() - 切换昼夜循环');
  console.log('window.worldStateControls.setLightIntensity(0.5) - 设置光照强度');
  console.log('window.worldStateControls.getState()           - 查看当前状态');
  console.log('window.worldStateControls.debug()              - 调试信息');
  console.log('');
  console.log('💾 === Global Snapshot ===');
  console.log('window.worldStateControls.saveSnapshot()       - 保存全场景快照');
  console.log('window.worldStateControls.loadSnapshot()       - 加载快照');
  console.log('window.worldStateControls.clearSnapshot()      - 清除快照');
  console.log('');
  console.log('💡 Tip: 调用 saveSnapshot() 后刷新页面，再次运行 worldStateDemo() 即可恢复场景！');
}

// 暴露到全局
(window as any).worldStateDemo = worldStateDemo;
