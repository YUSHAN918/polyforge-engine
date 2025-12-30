# 设计文档 - 相机预设系统 (Camera Preset System)

## 概述

### 设计目标

本设计文档描述了 **CameraPreset（相机预设）** 系统的技术实现方案，旨在解决 PolyForge v1.3.1 相机系统在多视角切换场景下的架构性问题。核心目标包括：

1. **消除状态污染**：通过统一绑定逻辑和增强 Strategy 清理机制，实现零污染的视角切换
2. **游戏化交互**：提供一键切换视角的用户体验，无需记住复杂参数
3. **架构纯净**：完全符合 ECS 架构铁律和 Strategy 模式，保持代码可维护性
4. **扩展友好**：支持动态注册自定义预设，为 MOD 开发者提供插件式扩展能力

### 设计原则

1. **最小改动原则**：保持现有 ICameraStrategy 接口不变，OrbitStrategy 标记为 🔒 FROZEN
2. **单一职责原则**：CameraPresetManager 专注预设管理，CameraSystem 专注相机更新
3. **开闭原则**：对扩展开放（动态注册预设），对修改关闭（核心逻辑不变）
4. **依赖倒置原则**：Strategy 依赖抽象接口，不依赖具体实现

### 技术栈

- **语言**：TypeScript（严格模式）
- **架构**：ECS（Entity-Component-System）
- **设计模式**：Strategy 模式 + Manager 模式
- **3D引擎**：Three.js
- **UI框架**：React 18+ (Functional Components + Hooks)

---

## 架构设计

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     PolyForge ECS 核心                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  EntityManager   │────────▶│  CameraComponent │          │
│  └──────────────────┘         └──────────────────┘          │
│                                        │                      │
│                                        │ 状态数据             │
│                                        ▼                      │
│  ┌──────────────────────────────────────────────────┐       │
│  │              CameraSystem                         │       │
│  │  ┌────────────────────────────────────────────┐  │       │
│  │  │  核心职责：                                 │  │       │
│  │  │  - 相机更新（位置、旋转）                  │  │       │
│  │  │  - 输入处理分发                            │  │       │
│  │  │  - Strategy 生命周期管理                   │  │       │
│  │  │  - 防穿墙检测（全局）                      │  │       │
│  │  └────────────────────────────────────────────┘  │       │
│  │                       │                            │       │
│  │                       │ 委托                       │       │
│  │                       ▼                            │       │
│  │  ┌────────────────────────────────────────────┐  │       │
│  │  │       CameraPresetManager（新增）          │  │       │
│  │  │  ┌──────────────────────────────────────┐ │  │       │
│  │  │  │  核心职责：                           │ │  │       │
│  │  │  │  - 预设注册与管理                     │ │  │       │
│  │  │  │  - 健康检查（前置条件验证）           │ │  │       │
│  │  │  │  - 预设应用（切换逻辑）               │ │  │       │
│  │  │  │  - 自动回退（角色删除时）             │ │  │       │
│  │  │  └──────────────────────────────────────┘ │  │       │
│  │  └────────────────────────────────────────────┘  │       │
│  │                       │                            │       │
│  │                       │ 使用                       │       │
│  │                       ▼                            │       │
│  │  ┌────────────────────────────────────────────┐  │       │
│  │  │       ICameraStrategy（接口）              │  │       │
│  │  └────────────────────────────────────────────┘  │       │
│  │           │        │        │        │        │   │       │
│  │           ▼        ▼        ▼        ▼        ▼   │       │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌──────────┐   │       │
│  │  │Orbit│ │ISO │ │FPS │ │TPS │ │Sidescroll│   │       │
│  │  │🔒   │ │    │ │    │ │    │ │          │   │       │
│  │  └────┘ └────┘ └────┘ └────┘ └──────────┘   │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ 事件通知
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        UI 层（React）                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐       │
│  │     ArchitectureValidationPanel                   │       │
│  │  ┌────────────────────────────────────────────┐  │       │
│  │  │  相机预设选择器（体验模式）                │  │       │
│  │  │  [Orbit] [ISO] [FPS] [TPS] [Sidescroll]   │  │       │
│  │  │                                             │  │       │
│  │  │  - 高亮当前激活预设                        │  │       │
│  │  │  - 显示错误提示                            │  │       │
│  │  │  - 500ms 轮询同步状态                      │  │       │
│  │  └────────────────────────────────────────────┘  │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 数据流图

```
用户点击预设按钮
    │
    ▼
UI 调用 applyPreset(presetId)
    │
    ▼
CameraPresetManager.applyPreset()
    │
    ├─▶ 1. 健康检查
    │      - 预设是否存在？
    │      - 需要角色但无角色？
    │      - Strategy 是否可用？
    │
    ├─▶ 2. 旧 Strategy 清理
    │      - 调用 oldStrategy.exit()
    │      - 重置内部状态
    │      - 保留必要绑定
    │
    ├─▶ 3. 更新 CameraComponent
    │      - 设置 activePreset
    │      - 更新 presetHistory
    │      - 设置/清空 targetEntityId
    │      - 应用 CameraSnapshot
    │
    ├─▶ 4. 新 Strategy 初始化
    │      - 调用 newStrategy.enter()
    │      - 加载预设配置
    │
    └─▶ 5. 通知 UI
           - 发送 EventBus 事件
           - UI 轮询同步状态
```

---

## 核心接口定义

### CameraPreset 接口

```typescript
/**
 * 相机预设接口
 * 轻量虚拟相机概念，封装了 Strategy + 默认配置 + 绑定需求
 */
interface CameraPreset {
  /** 预设唯一标识符（如 'orbit', 'iso', 'fps', 'tps', 'sidescroll'） */
  id: string;
  
  /** 预设显示名称（用于 UI） */
  displayName: string;
  
  /** 关联的相机模式（对应 Strategy 实现） */
  mode: CameraMode;
  
  /** 默认相机配置快照 */
  snapshot: CameraSnapshot;
  
  /** 是否需要绑定角色才能使用 */
  bindTarget: boolean;
  
  /** 双模态支持（bindTarget=false 但有角色时自动绑定跟随） */
  dualMode?: boolean;
  
  /** 预设描述（可选，用于 UI 提示） */
  description?: string;
  
  /** 预设图标（可选，用于 UI 显示） */
  icon?: string;
}
```

### CameraPresetManager 类

```typescript
/**
 * 相机预设管理器
 * 负责预设的注册、应用、健康检查和自动回退
 */
class CameraPresetManager {
  /** 预设注册表 */
  private presets: Map<string, CameraPreset>;
  
  /** 默认安全预设ID（体验模式） */
  private readonly DEFAULT_SAFE_PRESET = 'iso';
  
  /** 引用 CameraSystem（用于访问 Strategy） */
  private cameraSystem: CameraSystem;
  
  /** 引用 EntityManager（用于查询角色） */
  private entityManager: EntityManager;
  
  /** 🆕 引用 ArchitectureValidationManager（用于获取 currentContext） */
  private manager: ArchitectureValidationManager;
  
  constructor(
    cameraSystem: CameraSystem, 
    entityManager: EntityManager,
    manager: ArchitectureValidationManager
  ) {
    this.presets = new Map();
    this.cameraSystem = cameraSystem;
    this.entityManager = entityManager;
    this.manager = manager;
    this.registerStandardPresets();
  }
  
  /**
   * 注册标准预设（系统初始化时调用）
   * 🔴 只注册体验模式预设：iso/fps/tps/sidescroll
   * 🔴 不注册 orbit - 它是创造模式的固定相机
   */
  private registerStandardPresets(): void;
  
  /**
   * 注册自定义预设（公开 API，支持 MOD 扩展）
   * @param preset 预设配置
   * @throws Error 如果预设 ID 已存在、配置无效、或试图注册 orbit
   */
  public registerPreset(preset: CameraPreset): void;
  
  /**
   * 应用预设（核心方法）
   * 🔴 模式保护：只在体验模式下工作
   * @param camera 相机组件
   * @param presetId 预设 ID
   * @returns 是否成功应用
   */
  public applyPreset(camera: CameraComponent, presetId: string): boolean;
  
  /**
   * 获取当前激活的预设
   * @param camera 相机组件
   * @returns 当前预设，如果未设置则返回 null
   */
  public getCurrentPreset(camera: CameraComponent): CameraPreset | null;
  
  /**
   * 健康检查（内部方法）
   * @param preset 预设配置
   * @param camera 相机组件
   * @returns 检查结果（成功/失败原因）
   */
  private healthCheck(preset: CameraPreset, camera: CameraComponent): HealthCheckResult;
  
  /**
   * 自动回退到安全预设（角色删除时调用）
   * 🔴 创造模式保护：只在体验模式下触发
   * @param camera 相机组件
   */
  public fallbackToSafePreset(camera: CameraComponent): void;
  
  /**
   * 获取所有已注册的预设（用于 UI 显示）
   * 🔴 不包含 orbit
   * @returns 预设列表
   */
  public getAllPresets(): CameraPreset[];
}
```

### HealthCheckResult 接口

```typescript
/**
 * 健康检查结果
 */
interface HealthCheckResult {
  /** 是否通过检查 */
  success: boolean;
  
  /** 失败原因（如果 success=false） */
  reason?: string;
  
  /** 错误代码（用于 UI 显示友好提示） */
  errorCode?: 'PRESET_NOT_FOUND' | 'NO_TARGET_ENTITY' | 'STRATEGY_UNAVAILABLE' | 'INVALID_SNAPSHOT';
}
```

### CameraComponent 扩展

```typescript
/**
 * 相机组件（扩展字段）
 */
interface CameraComponent {
  // ========== 现有字段 ==========
  position: Vector3;
  rotation: Euler;
  fov: number;
  pitch: number;
  yaw: number;
  distance: number;
  mode: CameraMode;
  targetEntityId: string | null;
  
  // ========== 新增字段 ==========
  
  /** 当前激活的预设 ID */
  activePreset: string | null;
  
  /** 预设历史记录（最近使用的预设，用于快速切换） */
  presetHistory: string[];
  
  /** 防穿墙功能开关（默认开启） */
  enableCollision: boolean;
  
  // ========== Deprecated 字段 ==========
  
  /** @deprecated 使用 targetEntityId 代替 */
  controlledEntityId?: string | null;
}
```


---

## 组件详细设计

### CameraPresetManager 实现细节

#### 1. 注册标准预设

```typescript
private registerStandardPresets(): void {
  // 🔴 移除：orbit 不是预设，是创造模式的固定相机
  // 只注册体验模式的 4 种预设
  
  // 1. ISO - 上帝视角（双模态：无角色观察 + 有角色跟随）
  this.registerPreset({
    id: 'iso',
    displayName: '上帝视角',
    mode: 'isometric',
    bindTarget: false, // 不强制需要角色
    dualMode: true,    // 🆕 双模态：有角色时自动绑定跟随
    snapshot: {
      pitch: 45,
      yaw: 45,
      distance: 15,
      fov: 75
    },
    description: '类暗黑破坏神视角，体验模式的默认安全视角'
  });
  
  // 2. FPS - 第一人称
  this.registerPreset({
    id: 'fps',
    displayName: '第一人称',
    mode: 'firstPerson',
    bindTarget: true,
    snapshot: {
      pitch: 0,
      yaw: 0,
      distance: 0,
      fov: 90
    },
    description: '第一人称视角，相机锁定在角色头部'
  });
  
  // 3. TPS - 第三人称
  this.registerPreset({
    id: 'tps',
    displayName: '第三人称',
    mode: 'thirdPerson',
    bindTarget: true,
    snapshot: {
      pitch: 20,
      yaw: 0,
      distance: 8,
      fov: 75
    },
    description: '类塞尔达视角，相机跟随角色背后'
  });
  
  // 4. Sidescroll - 横板卷轴
  this.registerPreset({
    id: 'sidescroll',
    displayName: '横板卷轴',
    mode: 'sidescroll',
    bindTarget: true,
    snapshot: {
      pitch: 0,
      yaw: 90,
      distance: 12,
      fov: 60
    },
    description: '类空洞骑士视角，固定侧面跟随'
  });
}
```

#### 2. 应用预设逻辑

```typescript
public applyPreset(camera: CameraComponent, presetId: string): boolean {
  // 🔴 步骤0：模式保护 - 只在体验模式下工作
  const currentContext = this.manager.getContext();
  if (currentContext !== 'EXPERIENCE') {
    console.error('[CameraPresetManager] Rejected: Presets are only available in Experience Mode');
    EventBus.emit('camera:preset:error', { 
      errorCode: 'WRONG_MODE', 
      reason: '相机预设仅在体验模式下可用' 
    });
    return false;
  }
  
  // 🔴 步骤0.5：Orbit 拒绝 - orbit 不是预设
  if (presetId === 'orbit') {
    console.error('[CameraPresetManager] Rejected: Orbit is not a preset, it is the Creation Mode camera');
    EventBus.emit('camera:preset:error', { 
      errorCode: 'INVALID_PRESET', 
      reason: 'Orbit 是创造模式的固定相机，不是预设' 
    });
    return false;
  }
  
  // 步骤1：获取预设
  const preset = this.presets.get(presetId);
  if (!preset) {
    console.error(`[CameraPresetManager] Preset not found: ${presetId}`);
    EventBus.emit('camera:preset:error', { errorCode: 'PRESET_NOT_FOUND', presetId });
    return false;
  }
  
  // 步骤2：健康检查
  const healthCheck = this.healthCheck(preset, camera);
  if (!healthCheck.success) {
    console.warn(`[CameraPresetManager] Health check failed: ${healthCheck.reason}`);
    EventBus.emit('camera:preset:error', { 
      errorCode: healthCheck.errorCode, 
      reason: healthCheck.reason 
    });
    return false;
  }
  
  // 步骤3：清理旧 Strategy
  const oldStrategy = this.cameraSystem.strategies.get(camera.mode);
  if (oldStrategy) {
    oldStrategy.exit(camera);
  }
  
  // 步骤4：更新 CameraComponent
  camera.mode = preset.mode;
  camera.activePreset = preset.id;
  
  // 更新预设历史（最多保留5个）
  camera.presetHistory = camera.presetHistory || [];
  camera.presetHistory = [preset.id, ...camera.presetHistory.filter(id => id !== preset.id)].slice(0, 5);
  
  // 应用快照配置
  Object.assign(camera, preset.snapshot);
  
  // 处理目标绑定
  if (preset.bindTarget) {
    // 需要绑定角色
    const controlledEntity = this.findControlledEntity();
    if (controlledEntity) {
      camera.targetEntityId = controlledEntity.id;
    } else {
      // 理论上不应该到这里（健康检查应该拦截）
      console.error('[CameraPresetManager] No controlled entity found for bindTarget preset');
      return false;
    }
  } else {
    // 不需要绑定角色或支持双模态（如 iso）
    if (preset.dualMode) {
      // 🆕 双模态预设：有角色则绑定，无角色则清空
      const controlledEntity = this.findControlledEntity();
      camera.targetEntityId = controlledEntity ? controlledEntity.id : null;
    } else {
      // 纯观察模式，清空绑定
      camera.targetEntityId = null;
    }
  }
  
  // 步骤5：初始化新 Strategy
  const newStrategy = this.cameraSystem.strategies.get(preset.mode);
  if (newStrategy) {
    newStrategy.enter(camera);
  } else {
    console.error(`[CameraPresetManager] Strategy not found: ${preset.mode}`);
    return false;
  }
  
  // 步骤6：通知成功
  EventBus.emit('camera:preset:changed', { presetId: preset.id, mode: preset.mode });
  console.log(`[CameraPresetManager] Preset applied: ${preset.id}`);
  
  return true;
}
```

#### 3. 健康检查逻辑

```typescript
private healthCheck(preset: CameraPreset, camera: CameraComponent): HealthCheckResult {
  // 检查1：预设是否存在（理论上已在 applyPreset 中检查）
  if (!preset) {
    return { success: false, reason: 'Preset is null', errorCode: 'PRESET_NOT_FOUND' };
  }
  
  // 检查2：Strategy 是否可用
  const strategy = this.cameraSystem.strategies.get(preset.mode);
  if (!strategy) {
    return { 
      success: false, 
      reason: `Strategy not found: ${preset.mode}`, 
      errorCode: 'STRATEGY_UNAVAILABLE' 
    };
  }
  
  // 检查3：如果需要绑定角色，检查角色是否存在
  if (preset.bindTarget) {
    const controlledEntity = this.findControlledEntity();
    if (!controlledEntity) {
      return { 
        success: false, 
        reason: 'No controlled entity found', 
        errorCode: 'NO_TARGET_ENTITY' 
      };
    }
  }
  
  // 检查4：快照配置是否有效
  if (!preset.snapshot || typeof preset.snapshot.pitch === 'undefined') {
    return { 
      success: false, 
      reason: 'Invalid snapshot configuration', 
      errorCode: 'INVALID_SNAPSHOT' 
    };
  }
  
  // 所有检查通过
  return { success: true };
}
```

#### 4. 自动回退逻辑

```typescript
public fallbackToSafePreset(camera: CameraComponent): void {
  // 🔴 创造模式保护：只在体验模式下触发 fallback
  const currentContext = this.manager.getContext();
  if (currentContext === 'CREATION' || camera.mode === 'orbit') {
    console.log('[CameraPresetManager] Skipped fallback in Creation Mode');
    camera.targetEntityId = null; // 只清理引用，不改变模式
    return;
  }
  
  console.log('[CameraPresetManager] Falling back to safe preset (角色已删除)');
  
  // 清空目标绑定
  camera.targetEntityId = null;
  
  // 切换到 ISO 预设（体验模式的默认安全视角）
  const success = this.applyPreset(camera, this.DEFAULT_SAFE_PRESET);
  
  if (!success) {
    console.error('[CameraPresetManager] Failed to fallback to safe preset');
    // 体验模式下如果 iso 都失败了，记录错误但不再尝试 orbit
    EventBus.emit('camera:preset:fallback:failed', { fromPreset: camera.activePreset });
  }
}
```

#### 5. 辅助方法

```typescript
/**
 * 查找当前可控角色
 * @returns 可控角色实体，如果不存在则返回 null
 * 
 * 🔧 实现对齐说明：
 * 当前 PolyForge 通过 ArchitectureValidationManager.playerEntity 管理可控角色。
 * 实现时有两种方案：
 * - 方案A：添加 CharacterController 组件（ECS 标准）
 * - 方案B：直接引用 ArchitectureValidationManager.playerEntityId（快速对齐）
 * 推荐在本阶段使用方案B快速实现，后续可迁移到方案A。
 */
private findControlledEntity(): Entity | null {
  // 方案B：直接查询已知的玩家实体（与现有代码对齐）
  const playerEntityId = this.getPlayerEntityId(); // 从 Manager 获取
  if (playerEntityId) {
    return this.entityManager.getEntity(playerEntityId);
  }
  
  // 方案A（未来）：遍历查找 CharacterController 组件
  // const entities = this.entityManager.getAllEntities();
  // for (const entity of entities) {
  //   const controller = this.entityManager.getComponent(entity.id, 'CharacterController');
  //   if (controller && controller.isControllable) {
  //     return entity;
  //   }
  // }
  
  return null;
}

/**
 * 获取所有已注册的预设（用于 UI 显示）
 */
public getAllPresets(): CameraPreset[] {
  return Array.from(this.presets.values());
}

/**
 * 获取当前激活的预设
 */
public getCurrentPreset(camera: CameraComponent): CameraPreset | null {
  if (!camera.activePreset) {
    return null;
  }
  return this.presets.get(camera.activePreset) || null;
}
```

---

## 标准预设定义

### 预设配置表

| 预设ID | 显示名称 | CameraMode | bindTarget | pitch | yaw | distance | fov | 说明 |
|--------|----------|------------|------------|-------|-----|----------|-----|------|
| iso | 上帝视角 | isometric | false | 45 | 45 | 15 | 75 | 双模态：无角色观察 + 有角色跟随 |
| fps | 第一人称 | firstPerson | true | 0 | 0 | 0 | 90 | 相机锁定在角色头部 |
| tps | 第三人称 | thirdPerson | true | 20 | 0 | 8 | 75 | 相机跟随角色背后 |
| sidescroll | 横板卷轴 | sidescroll | true | 0 | 90 | 12 | 60 | 固定侧面跟随 |

🔴 **移除**: orbit - Orbit 不是预设，是创造模式的固定相机，不受 CameraPresetManager 管理

### 预设使用场景

#### 1. ISO（上帝视角）
- **使用场景**：体验模式（Experience Mode）的默认视角
- **交互方式**：
  - 无角色时：类似 Orbit，但禁止旋转（严格 ISO）
  - 有角色时：自动跟随角色，WASD 控制角色移动
- **绑定需求**：双模态（bindTarget=false，但有角色时自动绑定）
- **典型用途**：暗黑破坏神、星际争霸等 RTS/ARPG 游戏

#### 2. FPS（第一人称）
- **使用场景**：第一人称射击/冒险游戏
- **交互方式**：鼠标控制视角，WASD 控制移动
- **绑定需求**：必须有角色（bindTarget=true）
- **典型用途**：CS:GO、Minecraft 等 FPS 游戏

#### 3. TPS（第三人称）
- **使用场景**：第三人称动作/冒险游戏
- **交互方式**：鼠标控制视角，WASD 控制移动，滚轮调整距离
- **绑定需求**：必须有角色（bindTarget=true）
- **典型用途**：塞尔达、战神等 TPS 游戏

#### 4. Sidescroll（横板卷轴）
- **使用场景**：2D/2.5D 横版游戏
- **交互方式**：AD 控制左右移动，Space 跳跃，相机固定侧面跟随
- **绑定需求**：必须有角色（bindTarget=true）
- **典型用途**：空洞骑士、蔚蓝等横版游戏


---

## Strategy 清理增强

### 问题分析

当前 Strategy 的 `exit()` 方法只重置参数，不清理内部状态，导致视角切换时状态污染。例如：
- IsometricStrategy 的固定俯仰角残留
- FirstPersonStrategy 的头部锁定状态残留
- 缓存的目标位置、速度、偏移量等

### 解决方案

为每个 Strategy 重写 `exit()` 方法，确保状态完全重置。

#### 1. IsometricStrategy 清理

```typescript
class IsometricStrategy implements ICameraStrategy {
  // 内部状态
  private cachedTargetPosition: Vector3 | null = null;
  private smoothVelocity: Vector3 = new Vector3();
  
  exit(camera: CameraComponent): void {
    // 清理内部状态
    this.cachedTargetPosition = null;
    this.smoothVelocity.set(0, 0, 0);
    
    // 解除旋转锁定（ISO 特有）
    // 注意：不清空 targetEntityId，由 PresetManager 管理
    
    console.log('[IsometricStrategy] Exited, state cleared');
  }
}
```

#### 2. FirstPersonStrategy 清理

```typescript
class FirstPersonStrategy implements ICameraStrategy {
  // 内部状态
  private headSocketOffset: Vector3 = new Vector3(0, 1.7, 0);
  private mouseLookEnabled: boolean = true;
  
  exit(camera: CameraComponent): void {
    // 清理头部锁定状态
    this.mouseLookEnabled = false;
    
    // 重置偏移量
    this.headSocketOffset.set(0, 1.7, 0);
    
    console.log('[FirstPersonStrategy] Exited, head lock cleared');
  }
}
```

#### 3. ThirdPersonStrategy 清理

```typescript
class ThirdPersonStrategy implements ICameraStrategy {
  // 内部状态
  private springArmLength: number = 8;
  private collisionAdjustment: number = 0;
  
  exit(camera: CameraComponent): void {
    // 重置弹簧臂
    this.springArmLength = 8;
    this.collisionAdjustment = 0;
    
    console.log('[ThirdPersonStrategy] Exited, spring arm reset');
  }
}
```

#### 4. SidescrollStrategy 清理

```typescript
class SidescrollStrategy implements ICameraStrategy {
  // 内部状态
  private fixedYaw: number = 90;
  private smoothFollowSpeed: number = 5;
  
  exit(camera: CameraComponent): void {
    // 解除轴锁定
    this.fixedYaw = 90;
    this.smoothFollowSpeed = 5;
    
    console.log('[SidescrollStrategy] Exited, axis lock cleared');
  }
}
```

#### 5. OrbitStrategy 清理（🔒 FROZEN）

```typescript
class OrbitStrategy implements ICameraStrategy {
  // 🔒 FROZEN - 不修改现有实现
  // 已验证稳定，保持不变
  
  exit(camera: CameraComponent): void {
    // 现有实现保持不变
  }
}
```

---

## 防穿墙机制（全局游戏逻辑）

### 设计目标

为所有需要绑定角色的相机模式（iso/fps/tps/sidescroll）提供统一的防穿墙能力，避免相机穿透场景几何体。

### 架构设计

防穿墙逻辑在 **CameraSystem** 层统一实现，Strategy 只需提供目标位置和相机位置，无需关心防穿墙细节。

```typescript
class CameraSystem {
  // 🆕 缓存 Raycaster 实例（避免每帧创建新对象，降低 GC 压力）
  private readonly collisionRaycaster: THREE.Raycaster = new THREE.Raycaster();
  private readonly collisionDirection: THREE.Vector3 = new THREE.Vector3();
  
  /**
   * 防穿墙检测（全局方法）
   * @param camera 相机组件
   * @param targetPosition 目标位置（角色位置）
   * @param desiredCameraPosition 期望的相机位置
   * @returns 调整后的相机位置
   */
  private applyCollisionDetection(
    camera: CameraComponent,
    targetPosition: Vector3,
    desiredCameraPosition: Vector3
  ): Vector3 {
    // 如果防穿墙功能关闭，直接返回期望位置
    if (!camera.enableCollision) {
      return desiredCameraPosition;
    }
    
    // 🆕 使用缓存的 Raycaster 和 Direction（避免每帧创建新对象）
    this.collisionDirection.subVectors(desiredCameraPosition, targetPosition);
    const distance = this.collisionDirection.length();
    this.collisionDirection.normalize();
    
    this.collisionRaycaster.set(targetPosition, this.collisionDirection);
    this.collisionRaycaster.far = distance;
    const intersects = this.collisionRaycaster.intersectObjects(this.getSceneGeometry(), true);
    
    if (intersects.length > 0) {
      // 发现障碍物，缩短距离
      const hitPoint = intersects[0].point;
      const adjustedDistance = hitPoint.distanceTo(targetPosition) - 0.5; // 留0.5单位缓冲
      
      // 计算调整后的相机位置
      const adjustedPosition = new Vector3()
        .copy(targetPosition)
        .add(this.collisionDirection.clone().multiplyScalar(Math.max(adjustedDistance, 1.0))); // 最小距离1.0
      
      return adjustedPosition;
    }
    
    // 无障碍物，返回期望位置
    return desiredCameraPosition;
  }
  
  /**
   * 获取场景几何体（用于碰撞检测）
   */
  private getSceneGeometry(): THREE.Object3D[] {
    // 返回所有具有碰撞体的场景对象
    // 例如：地形、建筑、物理方块等
    const geometry: THREE.Object3D[] = [];
    
    // 从 WorldStateManager 获取地形
    const terrain = this.worldStateManager.getTerrain();
    if (terrain) {
      geometry.push(terrain);
    }
    
    // 从 EntityManager 获取具有碰撞体的实体
    const entities = this.entityManager.getAllEntities();
    for (const entity of entities) {
      const visual = this.entityManager.getComponent(entity.id, 'Visual');
      if (visual && visual.mesh && visual.collidable) {
        geometry.push(visual.mesh);
      }
    }
    
    return geometry;
  }
}
```

### Strategy 集成

Strategy 在 `updateTarget()` 方法中调用防穿墙检测：

```typescript
class ThirdPersonStrategy implements ICameraStrategy {
  updateTarget(camera: CameraComponent, target: Entity, deltaTime: number): void {
    // 1. 计算期望的相机位置
    const targetPosition = target.position;
    const desiredCameraPosition = this.calculateDesiredPosition(camera, targetPosition);
    
    // 2. 应用防穿墙检测（CameraSystem 提供）
    const adjustedPosition = this.cameraSystem.applyCollisionDetection(
      camera,
      targetPosition,
      desiredCameraPosition
    );
    
    // 3. 平滑移动到调整后的位置
    camera.position.lerp(adjustedPosition, deltaTime * 5);
  }
}
```

### 配置项

```typescript
interface CameraComponent {
  /** 防穿墙功能开关（默认开启） */
  enableCollision: boolean;
}
```

用户可通过 UI 或配置文件全局开关防穿墙功能。

---

## 数据模型

### CameraComponent 完整定义

```typescript
interface CameraComponent {
  // ========== 基础属性 ==========
  /** 相机位置（世界坐标） */
  position: Vector3;
  
  /** 相机旋转（欧拉角） */
  rotation: Euler;
  
  /** 视场角（Field of View） */
  fov: number;
  
  // ========== 相机参数 ==========
  /** 俯仰角（上下旋转，度数） */
  pitch: number;
  
  /** 偏航角（左右旋转，度数） */
  yaw: number;
  
  /** 相机距离目标的距离 */
  distance: number;
  
  // ========== 模式与预设 ==========
  /** 当前相机模式（对应 Strategy） */
  mode: CameraMode;
  
  /** 当前激活的预设 ID */
  activePreset: string | null;
  
  /** 预设历史记录（最近使用的预设，最多5个） */
  presetHistory: string[];
  
  // ========== 目标绑定 ==========
  /** 目标实体 ID（相机跟随或观察的实体） */
  targetEntityId: string | null;
  
  // ========== 功能开关 ==========
  /** 防穿墙功能开关（默认开启） */
  enableCollision: boolean;
  
  // ========== Deprecated 字段 ==========
  /** @deprecated 使用 targetEntityId 代替 */
  controlledEntityId?: string | null;
}
```

### CameraPreset 完整定义

```typescript
interface CameraPreset {
  /** 预设唯一标识符 */
  id: string;
  
  /** 预设显示名称（用于 UI） */
  displayName: string;
  
  /** 关联的相机模式 */
  mode: CameraMode;
  
  /** 默认相机配置快照 */
  snapshot: CameraSnapshot;
  
  /** 是否需要绑定角色才能使用 */
  bindTarget: boolean;
  
  /** 预设描述（可选） */
  description?: string;
  
  /** 预设图标（可选） */
  icon?: string;
}
```

### CameraSnapshot 定义

```typescript
interface CameraSnapshot {
  /** 俯仰角 */
  pitch: number;
  
  /** 偏航角 */
  yaw: number;
  
  /** 距离 */
  distance: number;
  
  /** 视场角 */
  fov: number;
  
  /** 其他可选参数 */
  [key: string]: any;
}
```

### 序列化格式

```typescript
// CameraComponent 序列化示例
{
  "position": { "x": 10, "y": 20, "z": 30 },
  "rotation": { "x": 0, "y": 0, "z": 0 },
  "fov": 75,
  "pitch": 45,
  "yaw": 45,
  "distance": 15,
  "mode": "isometric",
  "activePreset": "iso",
  "presetHistory": ["iso", "fps", "tps"],
  "targetEntityId": "entity-123",
  "enableCollision": true
}
```

### 向后兼容处理

```typescript
// 加载旧存档时的迁移逻辑
function migrateOldCameraData(data: any): CameraComponent {
  const camera: CameraComponent = { ...data };
  
  // 迁移 controlledEntityId -> targetEntityId
  if (data.controlledEntityId && !data.targetEntityId) {
    camera.targetEntityId = data.controlledEntityId;
    delete camera.controlledEntityId;
  }
  
  // 迁移旧的 CameraMode -> Preset
  if (!data.activePreset && data.mode) {
    const modeToPresetMap: Record<CameraMode, string> = {
      'orbit': 'orbit',
      'isometric': 'iso',
      'firstPerson': 'fps',
      'thirdPerson': 'tps',
      'sidescroll': 'sidescroll'
    };
    camera.activePreset = modeToPresetMap[data.mode] || 'iso';
  }
  
  // 初始化新字段
  camera.presetHistory = camera.presetHistory || [];
  camera.enableCollision = camera.enableCollision !== false; // 默认开启
  
  return camera;
}
```


---

## 错误处理

### 错误类型

| 错误代码 | 错误原因 | 用户提示 | 处理策略 |
|---------|---------|---------|---------|
| PRESET_NOT_FOUND | 预设不存在 | "未找到相机预设" | 保持当前状态 |
| NO_TARGET_ENTITY | 需要角色但无角色 | "需要角色才能使用此视角" | 拒绝切换 |
| STRATEGY_UNAVAILABLE | Strategy 未注册 | "相机模式不可用" | 保持当前状态 |
| INVALID_SNAPSHOT | 快照配置无效 | "相机配置无效" | 使用默认配置 |

### EventBus 事件

```typescript
// 预设切换成功
EventBus.emit('camera:preset:changed', { 
  presetId: string, 
  mode: CameraMode 
});

// 预设切换失败
EventBus.emit('camera:preset:error', { 
  errorCode: string, 
  reason?: string, 
  presetId?: string 
});

// 自动回退到安全预设
EventBus.emit('camera:preset:fallback', { 
  fromPreset: string, 
  toPreset: string, 
  reason: string 
});
```

### UI 错误提示

```typescript
// ArchitectureValidationPanel.tsx
useEffect(() => {
  const handleError = (event: any) => {
    const { errorCode, reason } = event;
    
    const errorMessages: Record<string, string> = {
      'PRESET_NOT_FOUND': '未找到相机预设',
      'NO_TARGET_ENTITY': '需要角色才能使用此视角',
      'STRATEGY_UNAVAILABLE': '相机模式不可用',
      'INVALID_SNAPSHOT': '相机配置无效'
    };
    
    const message = errorMessages[errorCode] || '切换失败';
    
    // 显示友好提示（Toast 或 Notification）
    showNotification({
      type: 'warning',
      message: message,
      duration: 3000
    });
  };
  
  EventBus.on('camera:preset:error', handleError);
  return () => EventBus.off('camera:preset:error', handleError);
}, []);
```

---

## 测试策略

### 单元测试

#### 1. CameraPresetManager 测试

```typescript
describe('CameraPresetManager', () => {
  let manager: CameraPresetManager;
  let mockCameraSystem: CameraSystem;
  let mockEntityManager: EntityManager;
  
  beforeEach(() => {
    mockCameraSystem = createMockCameraSystem();
    mockEntityManager = createMockEntityManager();
    manager = new CameraPresetManager(mockCameraSystem, mockEntityManager);
  });
  
  test('应该注册所有标准预设', () => {
    const presets = manager.getAllPresets();
    expect(presets).toHaveLength(5);
    expect(presets.map(p => p.id)).toEqual(['orbit', 'iso', 'fps', 'tps', 'sidescroll']);
  });
  
  test('应该拒绝注册重复的预设 ID', () => {
    const duplicatePreset: CameraPreset = {
      id: 'orbit',
      displayName: 'Duplicate',
      mode: 'orbit',
      bindTarget: false,
      snapshot: { pitch: 0, yaw: 0, distance: 10, fov: 75 }
    };
    
    expect(() => manager.registerPreset(duplicatePreset)).toThrow();
  });
  
  test('应该成功应用无需角色的预设', () => {
    const camera = createMockCamera();
    const success = manager.applyPreset(camera, 'orbit');
    
    expect(success).toBe(true);
    expect(camera.activePreset).toBe('orbit');
    expect(camera.mode).toBe('orbit');
  });
  
  test('应该拒绝应用需要角色但无角色的预设', () => {
    const camera = createMockCamera();
    mockEntityManager.setControlledEntity(null); // 无角色
    
    const success = manager.applyPreset(camera, 'fps');
    
    expect(success).toBe(false);
    expect(camera.activePreset).not.toBe('fps');
  });
  
  test('应该在角色删除后自动回退到 iso', () => {
    const camera = createMockCamera();
    camera.activePreset = 'fps';
    camera.targetEntityId = 'entity-123';
    
    manager.fallbackToSafePreset(camera);
    
    expect(camera.activePreset).toBe('iso');
    expect(camera.targetEntityId).toBeNull();
  });
});
```

#### 2. Strategy 清理测试

```typescript
describe('Strategy Exit Cleanup', () => {
  test('IsometricStrategy 应该清理内部状态', () => {
    const strategy = new IsometricStrategy();
    const camera = createMockCamera();
    
    // 模拟使用后的状态
    strategy.enter(camera);
    strategy.updateTarget(camera, mockEntity, 0.016);
    
    // 退出并检查状态
    strategy.exit(camera);
    
    expect(strategy['cachedTargetPosition']).toBeNull();
    expect(strategy['smoothVelocity'].length()).toBe(0);
  });
  
  test('FirstPersonStrategy 应该清除头部锁定', () => {
    const strategy = new FirstPersonStrategy();
    const camera = createMockCamera();
    
    strategy.enter(camera);
    strategy.exit(camera);
    
    expect(strategy['mouseLookEnabled']).toBe(false);
  });
});
```

### 集成测试

```typescript
describe('Camera Preset Integration', () => {
  test('应该支持 ISO -> FPS -> TPS 无缝切换', () => {
    const system = createTestCameraSystem();
    const camera = system.getMainCamera();
    const entity = createTestEntity();
    
    // 1. 切换到 ISO
    system.presetManager.applyPreset(camera, 'iso');
    expect(camera.activePreset).toBe('iso');
    
    // 2. 切换到 FPS
    system.presetManager.applyPreset(camera, 'fps');
    expect(camera.activePreset).toBe('fps');
    expect(camera.targetEntityId).toBe(entity.id);
    
    // 3. 切换到 TPS
    system.presetManager.applyPreset(camera, 'tps');
    expect(camera.activePreset).toBe('tps');
    expect(camera.targetEntityId).toBe(entity.id);
    
    // 4. 验证无状态污染
    expect(camera.mode).toBe('thirdPerson');
  });
  
  test('应该在角色删除后自动回退', () => {
    const system = createTestCameraSystem();
    const camera = system.getMainCamera();
    const entity = createTestEntity();
    
    // 切换到 FPS
    system.presetManager.applyPreset(camera, 'fps');
    expect(camera.activePreset).toBe('fps');
    
    // 删除角色
    system.entityManager.removeEntity(entity.id);
    system.update(0.016); // 触发自动回退
    
    // 验证回退到 iso
    expect(camera.activePreset).toBe('iso');
    expect(camera.targetEntityId).toBeNull();
  });
});
```

### 性能测试

```typescript
describe('Performance', () => {
  test('预设切换应在 100ms 内完成', () => {
    const system = createTestCameraSystem();
    const camera = system.getMainCamera();
    
    const startTime = performance.now();
    system.presetManager.applyPreset(camera, 'fps');
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(100);
  });
  
  test('防穿墙检测不应影响帧率', () => {
    const system = createTestCameraSystem();
    const camera = system.getMainCamera();
    camera.enableCollision = true;
    
    // 模拟 60 FPS
    const frameTime = 1000 / 60;
    const startTime = performance.now();
    
    for (let i = 0; i < 60; i++) {
      system.update(frameTime / 1000);
    }
    
    const endTime = performance.now();
    const actualFPS = 60000 / (endTime - startTime);
    
    expect(actualFPS).toBeGreaterThanOrEqual(60);
  });
});
```

---

## 正确性属性

*属性是一种特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1：预设注册唯一性

*对于任意* 两个预设 P1 和 P2，如果它们都已注册，则它们的 ID 必须不同（P1.id ≠ P2.id）

**验证需求**：1.2

**测试方法**：
- 尝试注册两个相同 ID 的预设
- 验证第二次注册抛出异常
- 验证预设表中只有一个实例

---

### 属性 2：健康检查一致性

*对于任意* 预设 P，如果 P.bindTarget = true 且当前无可控角色，则 applyPreset(P) 必须返回 false

**验证需求**：2.1

**测试方法**：
- 创建需要角色的预设（fps/tps/sidescroll）
- 清空场景中的所有角色
- 尝试应用预设
- 验证返回 false 且相机状态不变

---

### 属性 3：绑定逻辑统一性

*对于任意* 相机组件 C，C.targetEntityId 应该是唯一的绑定标识，且 C.controlledEntityId 应该始终为 null 或未定义

**验证需求**：3.1, 3.2

**测试方法**：
- 应用任意预设
- 验证 targetEntityId 被正确设置或清空
- 验证 controlledEntityId 未被使用

---

### 属性 4：Strategy 清理完整性

*对于任意* Strategy S，当调用 S.exit() 后，S 的所有内部状态变量应该被重置为初始值

**验证需求**：4.1

**测试方法**：
- 使用 Strategy 处理一些输入
- 调用 exit()
- 验证内部状态（通过反射或测试接口）
- 确认所有状态变量已重置

---

### 属性 5：预设切换幂等性

*对于任意* 预设 P 和相机 C，连续两次应用同一预设（applyPreset(C, P); applyPreset(C, P)）应该产生与应用一次相同的结果

**验证需求**：1.4

**测试方法**：
- 应用预设 P
- 记录相机状态 S1
- 再次应用预设 P
- 记录相机状态 S2
- 验证 S1 == S2

---

### 属性 6：自动回退安全性

*对于任意* 相机 C，如果当前预设需要角色（bindTarget=true）且角色被删除，则 C.activePreset 必须自动切换到 "iso"

**验证需求**：2.3

**测试方法**：
- 应用需要角色的预设（fps/tps/sidescroll）
- 删除角色
- 触发系统更新
- 验证 activePreset == "iso"
- 验证 targetEntityId == null

---

### 属性 7：状态隔离性

*对于任意* 两个预设 P1 和 P2，从 P1 切换到 P2 后，P1 的内部状态不应影响 P2 的行为

**验证需求**：7.5

**测试方法**：
- 应用预设 P1 并使用一段时间
- 切换到预设 P2
- 验证 P2 的行为与直接应用 P2 时一致
- 使用状态快照对比

---

### 属性 8：防穿墙有效性

*对于任意* 相机 C 和目标 T，如果 C.enableCollision = true 且 C 与 T 之间存在障碍物，则 C 的实际位置应该在障碍物前方

**验证需求**：10.2

**测试方法**：
- 创建场景：角色 + 墙壁
- 将相机移动到墙壁后方
- 启用防穿墙
- 验证相机位置被调整到墙壁前方
- 验证距离 >= 最小安全距离（1.0）

---

### 属性 9：性能保证

*对于任意* 预设切换操作，完成时间应该 < 100ms

**验证需求**：9.1

**测试方法**：
- 使用高精度计时器
- 执行预设切换
- 验证耗时 < 100ms

---

### 属性 10：向后兼容性

*对于任意* 旧版存档数据 D，加载后应该自动迁移到新格式，且功能正常

**验证需求**：9.4, 9.6

**测试方法**：
- 创建旧版存档（包含 controlledEntityId）
- 加载存档
- 验证 targetEntityId 被正确设置
- 验证 controlledEntityId 被清空
- 验证 activePreset 被正确映射

---

## 实施计划

### 阶段 1：核心架构（优先级：⭐⭐⭐⭐⭐）

**目标**：实现 CameraPresetManager 和统一绑定逻辑

**任务**：
1. 创建 CameraPresetManager 类
2. 实现预设注册和应用逻辑
3. 实现健康检查机制
4. 扩展 CameraComponent（添加 activePreset、presetHistory、enableCollision）
5. 统一绑定逻辑（移除 controlledEntityId）
6. 注册 5 种标准预设

**验收标准**：
- ✅ 所有标准预设可用
- ✅ 健康检查正常工作
- ✅ 单元测试通过

---

### 阶段 2：Strategy 清理（优先级：⭐⭐⭐⭐）

**目标**：增强所有 Strategy 的 exit() 方法

**任务**：
1. 重写 IsometricStrategy.exit()
2. 重写 FirstPersonStrategy.exit()
3. 重写 ThirdPersonStrategy.exit()
4. 重写 SidescrollStrategy.exit()
5. 验证 OrbitStrategy（保持不变）

**验收标准**：
- ✅ 所有 Strategy 清理测试通过
- ✅ ISO -> FPS -> TPS 无缝切换
- ✅ 无状态污染

---

### 阶段 3：防穿墙机制（优先级：⭐⭐⭐）

**目标**：实现全局防穿墙检测

**任务**：
1. 在 CameraSystem 中实现 applyCollisionDetection()
2. 实现 getSceneGeometry()
3. 集成到所有 bindTarget=true 的 Strategy
4. 添加 enableCollision 配置项

**验收标准**：
- ✅ 防穿墙检测正常工作
- ✅ 性能测试通过（FPS ≥ 60）
- ✅ 可通过配置开关

---

### 阶段 4：UI 集成（优先级：⭐⭐⭐⭐）

**目标**：在 UI 中集成预设选择器

**任务**：
1. 在 ArchitectureValidationPanel 中添加预设选择器
2. 实现预设按钮点击逻辑
3. 实现状态同步（500ms 轮询）
4. 实现错误提示（Toast/Notification）

**验收标准**：
- ✅ UI 显示所有预设
- ✅ 点击切换正常工作
- ✅ 状态 100% 同步
- ✅ 错误提示友好

---

### 阶段 5：测试与优化（优先级：⭐⭐⭐）

**目标**：完善测试覆盖和性能优化

**任务**：
1. 编写单元测试（CameraPresetManager）
2. 编写集成测试（预设切换）
3. 编写性能测试（切换延迟、帧率）
4. 编写向后兼容测试（旧存档加载）

**验收标准**：
- ✅ 测试覆盖率 > 80%
- ✅ 所有正确性属性验证通过
- ✅ 性能测试通过

---

## 文件修改清单

### 新增文件

- `src/core/systems/CameraPresetManager.ts` - 预设管理器

### 修改文件

- `src/core/components/CameraComponent.ts` - 扩展字段（activePreset、presetHistory、enableCollision）
- `src/core/systems/CameraSystem.ts` - 集成 PresetManager、防穿墙检测、自动回退逻辑
- `src/core/systems/camera_strategies/IsometricStrategy.ts` - 增强 exit()
- `src/core/systems/camera_strategies/FirstPersonStrategy.ts` - 增强 exit()
- `src/core/systems/camera_strategies/ThirdPersonStrategy.ts` - 增强 exit()、实现弹簧臂
- `src/core/systems/camera_strategies/SidescrollStrategy.ts` - 增强 exit()、实现镜头跟随
- `src/core/ArchitectureValidationManager.ts` - 添加预设切换接口
- `src/components/rendering/ArchitectureValidationPanel.tsx` - 添加预设选择器 UI

### 不修改文件

- `src/core/systems/camera_strategies/OrbitStrategy.ts` - 🔒 FROZEN

---

**文档版本**：v1.0  
**创建日期**：2025-12-30  
**最后更新**：2025-12-30  
**状态**：待审核
