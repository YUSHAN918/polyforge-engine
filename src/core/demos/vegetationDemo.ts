/**
 * PolyForge v1.3.0 - Vegetation Demo
 * Phase 11.3: 植被系统演示
 * 
 * 演示内容：
 * - 在地形上生成草地
 * - 塞尔达式风场摆动
 * - 实时对齐地形高度
 */

import { EntityManager } from '../EntityManager';
import { SystemManager } from '../SystemManager';
import { Clock } from '../Clock';
import { WorldStateManager } from '../WorldStateManager';
import { TerrainSystem } from '../systems/TerrainSystem';
import { VegetationSystem } from '../systems/VegetationSystem';
import { CameraSystem } from '../systems/CameraSystem';
import { TransformComponent } from '../components/TransformComponent';
import { TerrainComponent } from '../components/TerrainComponent';
import { VegetationComponent } from '../components/VegetationComponent';
import { CameraComponent } from '../components/CameraComponent';

/**
 * 植被演示控制器
 */
export interface VegetationDemoControls {
  // 植被生成
  spawnGrass: (density: number) => void;
  spawnFlowers: (density: number) => void;
  clearVegetation: () => void;
  
  // 地形控制
  createMountain: () => void;
  createValley: () => void;
  flattenTerrain: () => void;
  
  // 风场控制
  setWindStrength: (strength: number) => void;
  setWindSpeed: (speed: number) => void;
  
  // 信息查询
  getInfo: () => void;
  listEntities: () => void;
}

/**
 * 运行植被演示
 */
export async function vegetationDemo(): Promise<VegetationDemoControls> {
  console.log('🌾 Starting Vegetation Demo...');

  // 创建核心系统
  const entityManager = new EntityManager();
  const clock = new Clock();
  const systemManager = new SystemManager(entityManager, clock);
  const worldStateManager = new WorldStateManager();

  // 🆕 注册核心组件（必须在序列化之前）
  entityManager.registerComponent('Transform', TransformComponent);
  // 注意：Terrain 和 Vegetation 组件需要参数，不在此注册
  console.log('✓ Core components registered');

  // 创建地形系统、植被系统和相机系统
  const terrainSystem = new TerrainSystem();
  const vegetationSystem = new VegetationSystem(worldStateManager);
  const cameraSystem = new CameraSystem();

  systemManager.registerSystem('TerrainSystem', terrainSystem);
  systemManager.registerSystem('VegetationSystem', vegetationSystem);
  systemManager.registerSystem('CameraSystem', cameraSystem);

  // 创建地形实体
  const terrainEntity = entityManager.createEntity('MainTerrain');
  
  const transform = new TransformComponent();
  transform.position = [0, 0, 0];
  terrainEntity.addComponent(transform);

  const terrain = new TerrainComponent({
    width: 50,
    depth: 50,
    widthSegments: 100,
    depthSegments: 100,
  });
  terrainEntity.addComponent(terrain);

  // 生成初始地形（小山丘）
  terrainSystem.generateRandomTerrain(terrainEntity, 3);

  console.log('✓ Terrain created');

  // 🎥 创建上帝视角相机
  const cameraEntity = entityManager.createEntity('GodCamera');
  
  const cameraTransform = new TransformComponent();
  cameraTransform.position = [0, 100, 0]; // 高空俯瞰
  cameraEntity.addComponent(cameraTransform);

  const camera = new CameraComponent();
  camera.mode = 'orbit'; // 上帝视角模式
  camera.distance = 100; // 距离目标 100 单位
  camera.pitch = -60; // 向下倾斜 60 度
  camera.yaw = 0; // 正面朝向
  camera.fov = 60;
  camera.targetEntityId = terrainEntity.id; // 锁定地形中心
  cameraEntity.addComponent(camera);

  console.log('✓ God camera created (Orbit mode, distance: 100, pitch: -60°)');

  // 启动更新循环
  let animationId: number;
  const update = () => {
    const deltaTime = clock.tick();
    worldStateManager.update(deltaTime);
    systemManager.update();
    animationId = requestAnimationFrame(update);
  };
  update();

  // 创建控制器
  const controls: VegetationDemoControls = {
    // 植被生成
    spawnGrass: (density: number) => {
      const entityId = vegetationSystem.spawnGrass(density, terrainEntity.id);
      console.log(`🌾 Spawned grass with density ${density} (Entity ID: ${entityId})`);
    },

    spawnFlowers: (density: number) => {
      const entityId = vegetationSystem.spawnFlowers(density, terrainEntity.id);
      console.log(`🌸 Spawned flowers with density ${density} (Entity ID: ${entityId})`);
    },

    clearVegetation: () => {
      vegetationSystem.clearAllVegetation();
      console.log('🗑️ All vegetation cleared');
    },

    // 地形控制
    createMountain: () => {
      // 在中心创建一座山
      const centerX = terrain.config.widthSegments / 2;
      const centerZ = terrain.config.depthSegments / 2;
      
      for (let z = 0; z <= terrain.config.depthSegments; z++) {
        for (let x = 0; x <= terrain.config.widthSegments; x++) {
          const dx = x - centerX;
          const dz = z - centerZ;
          const distance = Math.sqrt(dx * dx + dz * dz);
          const maxDistance = Math.min(terrain.config.widthSegments, terrain.config.depthSegments) / 3;
          
          if (distance < maxDistance) {
            const height = (1 - distance / maxDistance) * 8;
            terrain.setHeight(x, z, height);
          }
        }
      }
      
      console.log('⛰️ Mountain created');
    },

    createValley: () => {
      // 在中心创建一个山谷
      const centerX = terrain.config.widthSegments / 2;
      const centerZ = terrain.config.depthSegments / 2;
      
      for (let z = 0; z <= terrain.config.depthSegments; z++) {
        for (let x = 0; x <= terrain.config.widthSegments; x++) {
          const dx = x - centerX;
          const dz = z - centerZ;
          const distance = Math.sqrt(dx * dx + dz * dz);
          const maxDistance = Math.min(terrain.config.widthSegments, terrain.config.depthSegments) / 3;
          
          if (distance < maxDistance) {
            const height = -(1 - distance / maxDistance) * 5;
            terrain.setHeight(x, z, height);
          }
        }
      }
      
      console.log('🏞️ Valley created');
    },

    flattenTerrain: () => {
      terrainSystem.resetTerrain(terrainEntity);
      console.log('📏 Terrain flattened');
    },

    // 风场控制（预留，需要通过 WorldStateManager）
    setWindStrength: (strength: number) => {
      console.log(`💨 Wind strength set to ${strength} (not yet implemented in WorldStateManager)`);
    },

    setWindSpeed: (speed: number) => {
      console.log(`💨 Wind speed set to ${speed} (not yet implemented in WorldStateManager)`);
    },

    // 信息查询
    getInfo: () => {
      const entities = entityManager.getAllEntities();
      const vegetationEntities = entities.filter(e => e.hasComponent('Vegetation'));
      
      console.log('\n=== Vegetation Demo Info ===');
      console.log(`Terrain: ${terrain.config.width}x${terrain.config.depth} (${terrain.config.widthSegments}x${terrain.config.depthSegments} segments)`);
      console.log(`Vegetation entities: ${vegetationEntities.length}`);
      
      let totalInstances = 0;
      vegetationEntities.forEach(e => {
        const veg = e.getComponent('Vegetation') as VegetationComponent;
        if (veg) {
          totalInstances += veg.instanceCount;
          console.log(`  - ${e.name}: ${veg.instanceCount} instances (${veg.config.type})`);
        }
      });
      
      console.log(`Total vegetation instances: ${totalInstances}`);
      console.log('===========================\n');
    },

    listEntities: () => {
      const entities = entityManager.getAllEntities();
      console.log('\n=== All Entities ===');
      entities.forEach(e => {
        const components = Array.from(e.components.keys());
        console.log(`- ${e.name} (${e.id}): [${components.join(', ')}]`);
      });
      console.log('====================\n');
    },
  };

  // 打印启动信息
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                  ║');
  console.log('║     🌾  PolyForge v1.3.0 - Phase 11.3 VegetationSystem 🌾      ║');
  console.log('║                                                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  🎮 植被控制器 - window.vegetationControls                      │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');

  console.log('🌾  植被生成');
  console.log('  ├─ spawnGrass(density)        生成草地（推荐: 5000）');
  console.log('  ├─ spawnFlowers(density)      生成花朵（推荐: 1000）');
  console.log('  └─ clearVegetation()          清除所有植被\n');

  console.log('⛰️  地形控制');
  console.log('  ├─ createMountain()           创建山峰');
  console.log('  ├─ createValley()             创建山谷');
  console.log('  └─ flattenTerrain()           重置为平坦\n');

  console.log('💨  风场控制（预留）');
  console.log('  ├─ setWindStrength(n)         设置风力强度（0-1）');
  console.log('  └─ setWindSpeed(n)            设置风速（0-2）\n');

  console.log('ℹ️  信息查询');
  console.log('  ├─ getInfo()                  查看植被信息');
  console.log('  └─ listEntities()             列出所有实体\n');

  console.log('💡 快速开始：');
  console.log('  vegetationControls.spawnGrass(5000)  // 生成 5000 棵草');
  console.log('  vegetationControls.createMountain()  // 创建山峰（草会自动对齐）\n');

  // 🎬 最终战果汇报
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                  ║');
  console.log('║  🎉  制作人，请看屏幕左侧，PolyForge 的世界已经诞生！  🎉      ║');
  console.log('║                                                                  ║');
  console.log('║  ✅ TerrainSystem - 动态地形引擎已就绪                          ║');
  console.log('║  ✅ VegetationSystem - 植被引擎已就绪                           ║');
  console.log('║  ✅ 上帝视角 - 俯瞰 (0,0,0) 距离 100 单位                       ║');
  console.log('║  ✅ 塞尔达式风场 Shader - 草随风摆动                            ║');
  console.log('║                                                                  ║');
  console.log('║  🌾 现在，让我们播种第一片草原...                               ║');
  console.log('║     vegetationControls.spawnGrass(5000)                         ║');
  console.log('║                                                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // 暴露到全局
  (window as any).vegetationControls = controls;
  (window as any).vegetationDemo = vegetationDemo;

  return controls;
}
