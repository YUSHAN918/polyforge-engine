/**
 * PolyForge v1.3.0 TerrainSystem Demo
 * Phase 11.2: 动态地形演示
 * 
 * 演示内容：
 * - 动态地形创建
 * - 鼠标交互式地形编辑
 * - 笔刷系统（The God Hand）
 * - 实时法线重算
 */

import { EntityManager } from '../EntityManager';
import { SystemManager } from '../SystemManager';
import { Clock } from '../Clock';
import { TransformComponent } from '../components/TransformComponent';
import { VisualComponent } from '../components/VisualComponent';
import { TerrainComponent } from '../components/TerrainComponent';
import { HierarchySystem } from '../systems/HierarchySystem';
import { TerrainSystem } from '../systems/TerrainSystem';

// 全局变量（用于控制台交互）
let globalEntityManager: EntityManager;
let globalTerrainSystem: TerrainSystem;
let globalClock: Clock;
let globalSystemManager: SystemManager;
let globalTerrainEntity: any;

/**
 * 地形系统演示
 */
export async function terrainDemo(): Promise<void> {
  console.log('🏔️ === TerrainSystem Demo ===');
  console.log('动态地形 + 笔刷引擎演示');

  // 初始化 ECS
  const entityManager = new EntityManager();
  const clock = new Clock();
  const systemManager = new SystemManager(entityManager, clock);
  const terrainSystem = new TerrainSystem();

  // 保存到全局变量
  globalEntityManager = entityManager;
  globalTerrainSystem = terrainSystem;
  globalClock = clock;
  globalSystemManager = systemManager;

  // 注册系统
  const hierarchySystem = new HierarchySystem();
  systemManager.registerSystem('HierarchySystem', hierarchySystem);
  systemManager.registerSystem('TerrainSystem', terrainSystem);

  // 创建地形
  console.log('🏗️ Creating terrain...');
  createTerrain();
  console.log('✓ Terrain entity created');
  console.log(`  Entity ID: ${globalTerrainEntity.id}`);
  console.log(`  Components: ${Array.from(globalTerrainEntity.components.keys()).join(', ')}`);
  console.log('✓ Terrain created (50x50 units, 100x100 segments)');
  console.log('');

  // 更新循环
  let frameCount = 0;
  const updateLoop = () => {
    // 更新系统
    systemManager.update();

    // 每 60 帧打印一次状态
    frameCount++;
    if (frameCount % 60 === 0) {
      const terrain = globalTerrainEntity.getComponent('Terrain') as TerrainComponent;
      if (terrain && terrain.isDirty) {
        console.log(`🏔️ Terrain updated (dirty region: ${JSON.stringify(terrain.dirtyRegion)})`);
      }
    }

    requestAnimationFrame(updateLoop);
  };

  // 启动更新循环
  clock.start();
  updateLoop();

  // 暴露控制接口到全局
  (window as any).terrainDemoControls = {
    // 笔刷控制
    setBrushRadius: (radius: number) => {
      terrainSystem.setBrush({ radius });
      console.log(`🖌️ Brush radius set to ${radius}`);
    },
    setBrushStrength: (strength: number) => {
      terrainSystem.setBrush({ strength });
      console.log(`🖌️ Brush strength set to ${strength}`);
    },
    setBrushHardness: (hardness: number) => {
      terrainSystem.setBrush({ hardness });
      console.log(`🖌️ Brush hardness set to ${hardness}`);
    },
    getBrush: () => {
      const brush = terrainSystem.getBrush();
      console.log('=== Brush Config ===');
      console.log(`Radius: ${brush.radius}`);
      console.log(`Strength: ${brush.strength}`);
      console.log(`Hardness: ${brush.hardness}`);
      return brush;
    },

    // 地形编辑
    raise: (x: number, z: number) => {
      const point = new (window as any).THREE.Vector3(x, 0, z);
      terrainSystem.modifyHeight(globalTerrainEntity, point, 1.0);
      console.log(`⬆️ Raised terrain at (${x}, ${z})`);
    },
    lower: (x: number, z: number) => {
      const point = new (window as any).THREE.Vector3(x, 0, z);
      terrainSystem.modifyHeight(globalTerrainEntity, point, -1.0);
      console.log(`⬇️ Lowered terrain at (${x}, ${z})`);
    },
    flatten: () => {
      terrainSystem.resetTerrain(globalTerrainEntity);
      console.log('🏜️ Terrain flattened');
    },
    randomize: (amplitude: number = 5) => {
      terrainSystem.generateRandomTerrain(globalTerrainEntity, amplitude);
      console.log(`🎲 Random terrain generated (amplitude: ${amplitude})`);
    },

    // 预设地形
    createMountain: () => {
      // 在中心创建一座山
      for (let i = 0; i < 50; i++) {
        const angle = (i / 50) * Math.PI * 2;
        const radius = 5 - (i / 50) * 5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const point = new (window as any).THREE.Vector3(x, 0, z);
        terrainSystem.modifyHeight(globalTerrainEntity, point, 0.5);
      }
      console.log('⛰️ Mountain created at center');
    },
    createValley: () => {
      // 在中心创建一个山谷
      for (let i = 0; i < 50; i++) {
        const angle = (i / 50) * Math.PI * 2;
        const radius = 5 - (i / 50) * 5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const point = new (window as any).THREE.Vector3(x, 0, z);
        terrainSystem.modifyHeight(globalTerrainEntity, point, -0.5);
      }
      console.log('🏞️ Valley created at center');
    },

    // 状态查询
    getTerrainInfo: () => {
      const terrain = globalTerrainEntity.getComponent('Terrain') as TerrainComponent;
      console.log('=== Terrain Info ===');
      console.log(`Size: ${terrain.config.width}x${terrain.config.depth} units`);
      console.log(`Segments: ${terrain.config.widthSegments}x${terrain.config.depthSegments}`);
      console.log(`Vertices: ${terrain.heightData.length}`);
      console.log(`Dirty: ${terrain.isDirty}`);
      if (terrain.dirtyRegion) {
        console.log(`Dirty Region: ${JSON.stringify(terrain.dirtyRegion)}`);
      }
      return {
        config: terrain.config,
        vertexCount: terrain.heightData.length,
        isDirty: terrain.isDirty,
        dirtyRegion: terrain.dirtyRegion,
      };
    },
    getHeightAt: (x: number, z: number) => {
      const terrain = globalTerrainEntity.getComponent('Terrain') as TerrainComponent;
      const point = new (window as any).THREE.Vector3(x, 0, z);
      const { gridX, gridZ } = worldToGrid(terrain, point);
      const height = terrain.getHeight(Math.round(gridX), Math.round(gridZ));
      console.log(`📏 Height at (${x}, ${z}): ${height.toFixed(2)}`);
      return height;
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
  };

  console.log('');
  console.log('🎮 === Demo Controls ===');
  console.log('window.terrainDemoControls.setBrushRadius(5)   - 设置笔刷半径');
  console.log('window.terrainDemoControls.setBrushStrength(0.2) - 设置笔刷强度');
  console.log('window.terrainDemoControls.setBrushHardness(0.8) - 设置笔刷硬度');
  console.log('window.terrainDemoControls.getBrush()          - 查看笔刷配置');
  console.log('');
  console.log('window.terrainDemoControls.raise(5, 5)         - 抬高指定位置');
  console.log('window.terrainDemoControls.lower(-5, -5)       - 降低指定位置');
  console.log('window.terrainDemoControls.flatten()           - 重置为平坦');
  console.log('window.terrainDemoControls.randomize(10)       - 生成随机地形');
  console.log('');
  console.log('window.terrainDemoControls.createMountain()    - 创建一座山');
  console.log('window.terrainDemoControls.createValley()      - 创建一个山谷');
  console.log('');
  console.log('window.terrainDemoControls.getTerrainInfo()    - 查看地形信息');
  console.log('window.terrainDemoControls.getHeightAt(0, 0)   - 查看指定位置高度');
  console.log('window.terrainDemoControls.listEntities()      - 列出所有实体');
  console.log('');
  console.log('💡 Tip: 在 R3F Canvas 中可以用鼠标直接编辑地形！');
  console.log('💡 Tip: 左键抬高，右键降低，滚轮调整笔刷大小！');
}

/**
 * 创建地形实体
 */
function createTerrain(): void {
  console.log('🏗️ Creating terrain...');

  // 创建地形实体
  const terrain = globalEntityManager.createEntity('Terrain');

  // 添加 Transform 组件
  const transform = new TransformComponent();
  transform.position = [0, 0, 0];
  terrain.addComponent(transform);

  // 添加 Terrain 组件
  const terrainComponent = new TerrainComponent({
    width: 50,
    depth: 50,
    widthSegments: 100,
    depthSegments: 100,
  });
  terrain.addComponent(terrainComponent);

  // 添加 Visual 组件（用于渲染）
  const visual = new VisualComponent();
  visual.geometry = {
    type: 'plane',
    parameters: {
      width: 50,
      height: 50,
      widthSegments: 100,
      heightSegments: 100,
    },
  };
  visual.material = {
    type: 'standard',
    color: '#7cba3d', // 草地绿色
    metalness: 0.0,
    roughness: 0.9,
  };
  visual.receiveShadow = true;
  terrain.addComponent(visual);

  // 保存到全局变量
  globalTerrainEntity = terrain;

  console.log('✓ Terrain entity created');
}

/**
 * 世界坐标转网格坐标（辅助函数）
 */
function worldToGrid(terrain: TerrainComponent, worldPoint: any): { gridX: number; gridZ: number } {
  const halfWidth = terrain.config.width / 2;
  const halfDepth = terrain.config.depth / 2;

  const gridX = ((worldPoint.x + halfWidth) / terrain.config.width) * terrain.config.widthSegments;
  const gridZ = ((worldPoint.z + halfDepth) / terrain.config.depth) * terrain.config.depthSegments;

  return { gridX, gridZ };
}

// 暴露到全局
(window as any).terrainDemo = terrainDemo;

