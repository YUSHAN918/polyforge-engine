架构验证观测窗口 - 设计文档 (Design.md)
1. 系统概述
目标：创建一个"上帝视角"观测窗口，让制作人无需编写代码，点击【架构验证】按钮即可看到一个完整的、会呼吸的 PolyForge 世界。

核心理念：

所见即所得：直接在 R3F Canvas 中渲染 ECS 实体
零代码操作：通过 UI 面板控制地形、植被、环境
大阅兵模式：一键展示所有 Phase 10-12 的技术成果
2. 架构设计
2.1 核心管理器：ArchitectureValidationManager
位置：src/core/ArchitectureValidationManager.ts

职责：

管理 ECS 核心系统（EntityManager, SystemManager, WorldStateManager, Clock）
自动创建地形和相机实体
提供控制接口（生成地形、植被、查询统计）
与现有 Demo 系统解耦（独立的 ECS 实例）
接口设计：

export class ArchitectureValidationManager {
  // 核心系统
  private entityManager: EntityManager;
  private systemManager: SystemManager;
  private worldStateManager: WorldStateManager;
  private clock: Clock;
  
  // 系统实例
  private terrainSystem: TerrainSystem;
  private vegetationSystem: VegetationSystem;
  private cameraSystem: CameraSystem;
  
  // 实体引用
  private terrainEntity: Entity | null = null;
  private cameraEntity: Entity | null = null;
  
  constructor() {
    // 初始化 ECS 核心
    this.entityManager = new EntityManager();
    this.clock = new Clock();
    this.systemManager = new SystemManager(this.entityManager, this.clock);
    this.worldStateManager = new WorldStateManager();
    
    // 注册组件
    this.entityManager.registerComponent('Transform', TransformComponent);
    this.entityManager.registerComponent('Visual', VisualComponent);
    
    // 创建系统
    this.terrainSystem = new TerrainSystem();
    this.vegetationSystem = new VegetationSystem(this.worldStateManager);
    this.cameraSystem = new CameraSystem();
    
    // 注册系统
    this.systemManager.registerSystem('TerrainSystem', this.terrainSystem);
    this.systemManager.registerSystem('VegetationSystem', this.vegetationSystem);
    this.systemManager.registerSystem('CameraSystem', this.cameraSystem);
    
    // 自动创建地形和相机
    this.initializeScene();
  }
  
  /**
   * 初始化场景（自动创建地形和相机）
   */
  private initializeScene(): void {
    // 创建地形实体
    this.terrainEntity = this.entityManager.createEntity('ValidationTerrain');
    
    const terrainTransform = new TransformComponent();
    terrainTransform.position = [0, 0, 0];
    this.terrainEntity.addComponent(terrainTransform);
    
    const terrain = new TerrainComponent({
      width: 50,
      depth: 50,
      widthSegments: 100,
      depthSegments: 100,
    });
    this.terrainEntity.addComponent(terrain);
    
    const terrainVisual = new VisualComponent();
    terrainVisual.geometry = { type: 'plane', parameters: { width: 50, height: 50 } };
    terrainVisual.material = { type: 'standard', color: '#7cba3d', metalness: 0.0, roughness: 0.9 };
    terrainVisual.receiveShadow = true;
    this.terrainEntity.addComponent(terrainVisual);
    
    // 创建上帝视角相机
    this.cameraEntity = this.entityManager.createEntity('GodCamera');
    
    const cameraTransform = new TransformComponent();
    cameraTransform.position = [0, 100, 0];
    this.cameraEntity.addComponent(cameraTransform);
    
    const camera = new CameraComponent();
    camera.mode = 'orbit';
    camera.distance = 100;
    camera.pitch = -60;
    camera.yaw = 0;
    camera.fov = 60;
    camera.targetEntityId = this.terrainEntity.id;
    this.cameraEntity.addComponent(camera);
    
    console.log('✓ Validation scene initialized (Terrain + God Camera)');
  }
  
  /**
   * 更新循环（每帧调用）
   */
  update(): void {
    this.systemManager.update();
  }
  
  /**
   * 启动时钟
   */
  start(): void {
    this.clock.start();
  }
  
  /**
   * 生成植被
   */
  spawnVegetation(density: number): string | null {
    if (!this.terrainEntity) return null;
    return this.vegetationSystem.spawnGrass(density, this.terrainEntity.id);
  }
  
  /**
   * 创建山峰
   */
  createMountain(): void {
    if (!this.terrainEntity) return;
    
    const terrain = this.terrainEntity.getComponent<TerrainComponent>('Terrain');
    if (!terrain) return;
    
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
  }
  
  /**
   * 创建山谷
   */
  createValley(): void {
    if (!this.terrainEntity) return;
    
    const terrain = this.terrainEntity.getComponent<TerrainComponent>('Terrain');
    if (!terrain) return;
    
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
  }
  
  /**
   * 获取统计信息
   */
  getStats(): {
    entityCount: number;
    systemCount: number;
    vegetationCount: number;
    terrainVertices: number;
  } {
    const entities = this.entityManager.getAllEntities();
    const vegetationEntities = entities.filter(e => e.hasComponent('Vegetation'));
    
    let totalVegetation = 0;
    vegetationEntities.forEach(e => {
      const veg = e.getComponent<VegetationComponent>('Vegetation');
      if (veg) totalVegetation += veg.instanceCount;
    });
    
    const terrain = this.terrainEntity?.getComponent<TerrainComponent>('Terrain');
    const terrainVertices = terrain ? terrain.heightData.length : 0;
    
    return {
      entityCount: entities.length,
      systemCount: this.systemManager['systems'].size,
      vegetationCount: totalVegetation,
      terrainVertices,
    };
  }
  
  /**
   * 获取 EntityManager（用于 EngineBridge）
   */
  getEntityManager(): EntityManager {
    return this.entityManager;
  }
  
  /**
   * 获取 WorldStateManager（用于 EngineBridge）
   */
  getWorldStateManager(): WorldStateManager {
    return this.worldStateManager;
  }
  
  /**
   * 获取 TerrainSystem（用于 EngineBridge）
   */
  getTerrainSystem(): TerrainSystem {
    return this.terrainSystem;
  }
  
  /**
   * 获取 VegetationSystem（用于 EngineBridge）
   */
  getVegetationSystem(): VegetationSystem {
    return this.vegetationSystem;
  }
  
  /**
   * 设置环境时间（日落前1小时）
   */
  setSunsetTime(): void {
    this.worldStateManager.setTimeOfDay(17); // 17:00 = 日落前1小时
    console.log('🌅 Time set to sunset (17:00)');
  }
}
2.2 UI 控制面板：ArchitectureValidationPanel
位置：src/components/ArchitectureValidationPanel.tsx

职责：

显示实时统计信息（实体数、FPS、顶点数、植被实例数）
提供地形和植被控制按钮
一键演示功能
使用 useRef 直接操作 DOM 显示高频数据（FPS）
组件设计：

interface ArchitectureValidationPanelProps {
  manager: ArchitectureValidationManager | null;
}

export const ArchitectureValidationPanel: React.FC<ArchitectureValidationPanelProps> = ({ manager }) => {
  const [stats, setStats] = useState({
    entityCount: 0,
    systemCount: 0,
    vegetationCount: 0,
    terrainVertices: 0,
  });
  
  const fpsRef = useRef<HTMLSpanElement>(null);
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  
  // 更新统计信息（低频，每秒1次）
  useEffect(() => {
    if (!manager) return;
    
    const interval = setInterval(() => {
      setStats(manager.getStats());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [manager]);
  
  // 更新 FPS（高频，每帧）
  useEffect(() => {
    if (!manager) return;
    
    const updateFPS = () => {
      frameCountRef.current++;
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      
      if (delta >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / delta);
        if (fpsRef.current) {
          fpsRef.current.textContent = `${fps}`;
        }
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      
      requestAnimationFrame(updateFPS);
    };
    
    const animId = requestAnimationFrame(updateFPS);
    return () => cancelAnimationFrame(animId);
  }, [manager]);
  
  // 控制按钮
  const handleSpawnGrass = () => {
    if (!manager) return;
    manager.spawnVegetation(5000);
  };
  
  const handleCreateMountain = () => {
    if (!manager) return;
    manager.createMountain();
  };
  
  const handleCreateValley = () => {
    if (!manager) return;
    manager.createValley();
  };
  
  const handleOneClickDemo = () => {
    if (!manager) return;
    
    // 1. 创建山峰
    manager.createMountain();
    
    // 2. 等待 500ms 后生成植被
    setTimeout(() => {
      manager.spawnVegetation(5000);
    }, 500);
    
    // 3. 设置日落时间
    manager.setSunsetTime();
    
    console.log('🎬 One-click demo executed!');
  };
  
  if (!manager) {
    return (
      <div className="w-96 h-full bg-gray-950 border-l border-gray-800 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }
  
  return (
    <div className="w-96 h-full bg-gray-950 border-l border-gray-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <i className="fas fa-eye text-white text-lg"></i>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">架构验证观测窗口</h2>
            <p className="text-xs text-gray-400">v1.3.0 核心引擎预览</p>
          </div>
        </div>
      </div>
      
      {/* Stats Section */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
          <i className="fas fa-chart-bar text-green-400"></i>
          实时统计
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">实体数</div>
            <div className="text-2xl font-bold text-white">{stats.entityCount}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">FPS</div>
            <div className="text-2xl font-bold text-green-400">
              <span ref={fpsRef}>60</span>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">顶点数</div>
            <div className="text-2xl font-bold text-blue-400">{stats.terrainVertices.toLocaleString()}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">植被实例</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.vegetationCount.toLocaleString()}</div>
          </div>
        </div>
      </div>
      
      {/* Controls Section */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
          <i className="fas fa-sliders-h text-purple-400"></i>
          上帝之手
        </h3>
        
        <div className="space-y-2 mb-4">
          <button
            onClick={handleSpawnGrass}
            className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <i className="fas fa-seedling"></i>
            生成草地 (5000)
          </button>
          
          <button
            onClick={handleCreateMountain}
            className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <i className="fas fa-mountain"></i>
            创建山峰
          </button>
          
          <button
            onClick={handleCreateValley}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <i className="fas fa-water"></i>
            创建山谷
          </button>
        </div>
        
        <div className="border-t border-gray-800 pt-4">
          <button
            onClick={handleOneClickDemo}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-purple-500/20 flex items-center justify-center gap-2"
          >
            <i className="fas fa-magic"></i>
            一键演示
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            自动创建山峰 + 植被 + 日落光影
          </p>
        </div>
      </div>
    </div>
  );
};
2.3 App.tsx 集成
修改点：

添加状态管理：
const [archValidationManager, setArchValidationManager] = useState<ArchitectureValidationManager | null>(null);
监听模式切换：
useEffect(() => {
  if (mode === AppMode.ARCHITECTURE_VALIDATOR) {
    // 创建管理器
    const manager = new ArchitectureValidationManager();
    manager.start();
    setArchValidationManager(manager);
    
    // 启动更新循环
    const updateLoop = () => {
      manager.update();
      requestAnimationFrame(updateLoop);
    };
    updateLoop();
    
    console.log('✓ Architecture Validation Manager initialized');
  } else {
    // 清理管理器
    setArchValidationManager(null);
  }
}, [mode]);
条件渲染 GameCanvas：
{mode === AppMode.ARCHITECTURE_VALIDATOR && archValidationManager ? (
  <GameCanvas
    config={DEFAULT_CONFIG}
    mode={mode}
    mapConfig={DEFAULT_MAP_CONFIG}
    setMapConfig={() => {}}
    selectedTool="select"
    // 传递 ECS 系统到 GameCanvas（需要修改 GameCanvas 接口）
    archValidationManager={archValidationManager}
  />
) : (
  <GameCanvas
    // 原有的 props...
  />
)}
条件渲染面板：
{mode === AppMode.ARCHITECTURE_VALIDATOR && (
  <ArchitectureValidationPanel manager={archValidationManager} />
)}
2.4 GameCanvas 修改
新增 Props：

interface GameCanvasProps {
  // ... 原有 props
  archValidationManager?: ArchitectureValidationManager;
}
条件渲染 EngineBridge：

{archValidationManager && (
  <EngineBridge
    entityManager={archValidationManager.getEntityManager()}
    worldStateManager={archValidationManager.getWorldStateManager()}
    terrainSystem={archValidationManager.getTerrainSystem()}
    vegetationSystem={archValidationManager.getVegetationSystem()}
    postProcessingEnabled={true}
    bloomEnabled={true}
    bloomStrength={1.5}
    bloomRadius={0.4}
    bloomThreshold={0.85}
    smaaEnabled={true}
  />
)}
3. 数据流设计
用户点击【架构验证】按钮
  ↓
App.tsx 切换 mode = ARCHITECTURE_VALIDATOR
  ↓
useEffect 创建 ArchitectureValidationManager
  ↓
Manager 初始化 ECS 核心系统
  ↓
Manager 自动创建地形和相机实体
  ↓
GameCanvas 接收 archValidationManager prop
  ↓
GameCanvas 渲染 EngineBridge
  ↓
EngineBridge 监听 EntityManager 变化
  ↓
EngineBridge 将 ECS 实体映射到 R3F 场景
  ↓
用户在 ArchitectureValidationPanel 点击按钮
  ↓
Manager 调用 TerrainSystem/VegetationSystem
  ↓
ECS 实体更新
  ↓
EngineBridge 自动重新渲染
  ↓
用户看到实时变化
4. 核心联动（大阅兵）
4.1 相机联动（Phase 10）
实现方式：Manager 创建 CameraEntity，配置为 Orbit 模式
参数：distance=100, pitch=-60°, yaw=0°
目标：锁定地形中心，上帝视角俯瞰
4.2 环境联动（Phase 11.1）
实现方式：Manager 调用 worldStateManager.setTimeOfDay(17)
效果：日落前1小时，侧逆光，暖色调
联动：EngineBridge 自动更新太阳光照和色温
4.3 渲染联动（Phase 12）
实现方式：EngineBridge 启用 PostProcessing
参数：bloomEnabled=true, bloomStrength=1.5
效果：电影级辉光，草地边缘发光
4.4 内容联动（Phase 11.2 + 11.3）
地形：Manager 调用 terrainSystem.createMountain()
植被：Manager 调用 vegetationSystem.spawnGrass(5000)
自动对齐：VegetationSystem 自动读取地形高度
5. 性能优化
5.1 高频数据更新
FPS 显示：使用 useRef 直接操作 DOM，绕过 React 重绘
实现：fpsRef.current.textContent = fps
5.2 低频数据更新
统计信息：每秒更新1次（setInterval(1000)）
避免：每帧调用 setState
5.3 React.memo
EntityRenderer：已使用 React.memo 优化
避免：不必要的组件重新渲染
6. 正确性属性（Property-Based Testing）
Property 1: 模式切换一致性
描述：切换到 ARCHITECTURE_VALIDATOR 模式后，archValidationManager 必须非空
测试：expect(archValidationManager).not.toBeNull()
Property 2: 实体自动创建
描述：Manager 初始化后，必须自动创建地形和相机实体
测试：expect(manager.getEntityManager().getAllEntities().length).toBeGreaterThanOrEqual(2)
Property 3: 地形生成范围
描述：createMountain() 后，地形高度必须在 [0, 8] 范围内
测试：expect(terrain.getHeight(x, z)).toBeGreaterThanOrEqual(0) && expect(terrain.getHeight(x, z)).toBeLessThanOrEqual(8)
Property 4: 相机配置正确性
描述：相机模式必须为 'orbit'，distance=100, pitch=-60
测试：expect(camera.mode).toBe('orbit') && expect(camera.distance).toBe(100) && expect(camera.pitch).toBe(-60)
Property 5: 相机目标锁定
描述：相机的 targetEntityId 必须指向地形实体
测试：expect(camera.targetEntityId).toBe(terrainEntity.id)
Property 6: 植被实例数量
描述：spawnVegetation(5000) 后，植被实例数必须接近 5000（±10%）
测试：expect(stats.vegetationCount).toBeGreaterThanOrEqual(4500) && expect(stats.vegetationCount).toBeLessThanOrEqual(5500)
Property 7: 可见性保证
描述：所有创建的实体必须可见（Visual.visible = true）
测试：entities.forEach(e => expect(e.getComponent('Visual')?.visible).toBe(true))
Property 8: 统计信息准确性
描述：getStats() 返回的实体数必须等于 EntityManager 中的实体数
测试：expect(stats.entityCount).toBe(manager.getEntityManager().getAllEntities().length)
Property 9: 事件日志完整性
描述：每次操作（创建山峰、生成植被）必须记录日志
测试：expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Mountain created'))
Property 10: 一键演示顺序性
描述：handleOneClickDemo() 必须按顺序执行：山峰 → 植被 → 日落
测试：验证调用顺序和时间间隔
7. 文件清单
新增文件
src/core/ArchitectureValidationManager.ts - 核心管理器
src/components/ArchitectureValidationPanel.tsx - UI 面板
修改文件
App.tsx - 添加状态管理和模式切换逻辑
components/GameCanvas.tsx - 添加 archValidationManager prop
types.ts - 已有 AppMode.ARCHITECTURE_VALIDATOR（无需修改）
8. 实现顺序
✅ 创建 ArchitectureValidationManager.ts
✅ 创建 ArchitectureValidationPanel.tsx
✅ 修改 App.tsx（状态管理 + 模式切换）
✅ 修改 GameCanvas.tsx（条件渲染 EngineBridge）
✅ 测试基础功能（地形显示、相机视角）
✅ 测试控制按钮（生成植被、创建山峰）
✅ 测试一键演示
✅ 性能优化（FPS 显示）
✅ 编写单元测试（Property-Based Testing）
✅ 文档和交付报告
9. 验收标准
功能验收
 点击【架构验证】按钮后，Canvas 显示地形和上帝视角
 右侧面板显示实时统计信息（实体数、FPS、顶点数、植被实例数）
 点击"生成草地"按钮后，Canvas 显示 5000 棵草
 点击"创建山峰"按钮后，地形隆起成山峰
 点击"创建山谷"按钮后，地形凹陷成山谷
 点击"一键演示"按钮后，自动执行：山峰 → 植被 → 日落光影
 FPS 显示流畅，无卡顿
性能验收
 FPS ≥ 60（5000 棵草 + 10000 顶点地形）
 内存占用 < 500MB
 首次加载时间 < 3秒
代码质量验收
 所有 TypeScript 编译错误已解决
 所有 Property-Based Tests 通过
 代码符合 ESLint 规范
 无 console.error 或 console.warn
设计完成时间：2025-12-23
设计版本：v1.0
设计者：Kiro AI Assistant