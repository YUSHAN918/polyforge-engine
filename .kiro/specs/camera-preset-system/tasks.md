# 实施任务清单 - 相机预设系统 (Camera Preset System)

## 概述

本任务清单将设计文档转化为可执行的开发任务，按照小步迭代原则分为5个阶段。每个阶段都有明确的目标、任务清单和验收标准。

**实施原则**：
- **小步迭代**：每个阶段独立验收，确保稳定性
- **求稳优先**：保持 OrbitStrategy 🔒 FROZEN，渐进式修改
- **测试驱动**：每个阶段都包含测试任务
- **性能保证**：切换延迟 < 100ms，FPS ≥ 60

**优先级说明**：
- ⭐⭐⭐⭐⭐ - 核心功能，必须完成
- ⭐⭐⭐⭐ - 重要功能，强烈推荐
- ⭐⭐⭐ - 增强功能，可选但推荐

---

## 阶段 1：核心架构（优先级：⭐⭐⭐⭐⭐）

**目标**：实现 CameraPresetManager 和统一绑定逻辑，解决所有相机切换问题

**预计时间**：10 小时

### 任务清单

- [ ] 1.1 创建 CameraPresetManager 类（2h）
  - [ ] 1.1.1 创建文件 `src/core/systems/CameraPresetManager.ts`
  - [ ] 1.1.2 定义 CameraPreset 接口（包含 dualMode 字段）
  - [ ] 1.1.3 定义 HealthCheckResult 接口
  - [ ] 1.1.4 实现 CameraPresetManager 类骨架
    - 构造函数（接收 CameraSystem 和 EntityManager）
    - 预设注册表（Map<string, CameraPreset>）
    - DEFAULT_SAFE_PRESET 常量（'iso'）
  - [ ] 1.1.5 实现 registerPreset() 方法
    - 验证预设 ID 唯一性
    - 验证预设配置完整性
    - 抛出异常如果验证失败
  - [ ] 1.1.6 实现 getAllPresets() 方法
  - [ ] 1.1.7 实现 getCurrentPreset() 方法
  - _需求：1.1, 1.2, 1.5_

- [ ] 1.2 实现预设注册逻辑（1h）
  - [ ] 1.2.1 实现 registerStandardPresets() 私有方法
  - 🔴 **移除**：~~1.2.2 注册 orbit 预设~~ - Orbit 不是预设，是创造模式的固定相机
  - [ ] 1.2.2 注册 iso 预设（bindTarget=false, dualMode=true）
  - [ ] 1.2.3 注册 fps 预设（bindTarget=true）
  - [ ] 1.2.4 注册 tps 预设（bindTarget=true）
  - [ ] 1.2.5 注册 sidescroll 预设（bindTarget=true）
  - [ ] 1.2.6 在构造函数中调用 registerStandardPresets()
  - [ ] 1.2.7 🆕 添加 orbit 拒绝逻辑：在 registerPreset() 中检查 preset.id === 'orbit' 时抛出错误
  - _需求：5.2, 5.3, 5.4, 5.5 (移除 5.1 orbit)_

- [ ] 1.3 实现健康检查机制（2h）
  - [ ] 1.3.1 实现 healthCheck() 私有方法
    - 检查预设是否存在
    - 检查 Strategy 是否可用
    - 检查角色存在性（如果 bindTarget=true）
    - 检查快照配置有效性
  - [ ] 1.3.2 实现 findControlledEntity() 私有方法
    - 方案B：直接引用 ArchitectureValidationManager.playerEntityId
    - 添加注释说明未来可迁移到 CharacterController 组件
  - [ ] 1.3.3 定义错误代码枚举
    - PRESET_NOT_FOUND
    - NO_TARGET_ENTITY
    - STRATEGY_UNAVAILABLE
    - INVALID_SNAPSHOT
  - _需求：2.1, 2.2, 2.4, 2.5_

- [ ] 1.4 实现预设应用逻辑（2h）
  - [ ] 1.4.1 实现 applyPreset() 核心方法
    - 🆕 步骤0：模式保护 - 检查 currentContext，如果非 EXPERIENCE 则拒绝并返回错误
    - 🆕 步骤0.5：Orbit 拒绝 - 检查 presetId === 'orbit'，如果是则拒绝并返回错误
    - 步骤1：获取预设
    - 步骤2：健康检查
    - 步骤3：清理旧 Strategy（调用 exit()）
    - 步骤4：更新 CameraComponent
    - 步骤5：初始化新 Strategy（调用 enter()）
    - 步骤6：通知 UI（EventBus）
  - [ ] 1.4.2 实现目标绑定逻辑
    - 如果 bindTarget=true：设置 targetEntityId
    - 如果 dualMode=true：有角色则绑定，无角色则清空
    - 否则：清空 targetEntityId
  - [ ] 1.4.3 实现预设历史记录更新（最多保留5个）
  - [ ] 1.4.4 实现 CameraSnapshot 应用（Object.assign）
  - _需求：1.3, 1.4, 3.5, 3.6, 6.2_

- [ ] 1.5 实现自动回退逻辑（1h）
  - [ ] 1.5.1 实现 fallbackToSafePreset() 方法
    - 🆕 步骤0：创造模式保护 - 如果 currentContext === 'CREATION' 或 mode === 'orbit'，只清理 targetEntityId，不触发预设切换
    - 清空 targetEntityId
    - 切换到 iso 预设（体验模式的默认安全视角）
    - 如果失败，记录错误（不再尝试切换到 orbit）
  - [ ] 1.5.2 在 CameraSystem.update() 中添加角色删除检测
    - **位置**：在 update() 方法的末尾（inputSystem.resetFrameData() 之前）
    - 检测 targetEntityId 指向的实体是否存在
    - 🆕 如果 currentContext === 'CREATION' 或 mode === 'orbit'，只静默清理 targetEntityId，不调用 fallbackToSafePreset()
    - 如果是体验模式且实体不存在，调用 fallbackToSafePreset()
  - [ ] 1.5.3 发送 EventBus 事件（camera:preset:fallback）
  - _需求：2.3, 3.7, 7.4_

- [ ] 1.6 扩展 CameraComponent（1h）
  - [ ] 1.6.1 在 `src/core/components/CameraComponent.ts` 中添加新字段
    - activePreset: string | null
    - presetHistory: string[]
    - enableCollision: boolean（默认 true）
  - [ ] 1.6.2 标记 controlledEntityId 为 @deprecated
  - [ ] 1.6.3 更新 CameraComponent 的序列化逻辑
    - 保存新字段
    - 迁移旧字段（controlledEntityId -> targetEntityId）
  - [ ] 1.6.4 实现向后兼容处理（migrateOldCameraData）
  - _需求：3.1, 3.2, 3.3, 3.4, 9.4, 9.6_

- [ ] 1.7 集成到 CameraSystem（1h）
  - [ ] 1.7.1 在 CameraSystem 中创建 CameraPresetManager 实例
  - [ ] 1.7.2 暴露 presetManager 公开属性（用于 UI 访问）
  - [ ] 1.7.3 在 CameraSystem.update() 中添加自动回退检测
  - [ ] 1.7.4 确保 Strategy 切换时调用 exit() 和 enter()
  - _需求：1.1, 2.3_

- [ ] 1.8 添加 EventBus 事件（0.5h）
  - [ ] 1.8.1 定义事件类型
    - camera:preset:changed
    - camera:preset:error
    - camera:preset:fallback
  - [ ] 1.8.2 在 applyPreset() 中发送成功/失败事件
  - [ ] 1.8.3 在 fallbackToSafePreset() 中发送回退事件
  - _需求：2.4, 6.4_

- [ ] 1.9 单元测试（1.5h）
  - [ ] 1.9.1 创建测试文件 `src/core/systems/CameraPresetManager.test.ts`
  - [ ] 1.9.2 测试预设注册（5个标准预设）
  - [ ] 1.9.3 测试重复 ID 拒绝
  - [ ] 1.9.4 测试健康检查（有角色/无角色）
  - [ ] 1.9.5 测试预设应用（成功/失败）
  - [ ] 1.9.6 测试自动回退
  - [ ] 1.9.7 测试预设历史记录
  - _需求：所有需求_

### 验收标准

- ✅ 所有 4 种体验模式预设已注册（iso/fps/tps/sidescroll）
- 🔴 orbit **未**注册为预设 - 确认 CameraPresetManager 不包含 orbit
- ✅ 上下文检查正常工作（拒绝创造模式下应用任何预设）
- ✅ Orbit 拒绝逻辑正常工作（applyPreset('orbit') 返回 false）
- ✅ 健康检查正常工作（拒绝无角色时切换到 fps/tps/sidescroll）
- ✅ 预设应用成功（activePreset 和 mode 正确更新）
- ✅ 目标绑定逻辑正确（bindTarget 和 dualMode 处理）
- ✅ 自动回退正常工作（体验模式下角色删除后切换到 iso）
- ✅ 创造模式保护正常工作（创造模式下删除测试角色只静默清理 targetEntityId）
- ✅ 单元测试全部通过（覆盖率 > 80%）
- ✅ 向后兼容处理正常（旧存档加载成功）

### 检查点

完成本阶段后，执行以下检查：
1. 运行单元测试：`npm test CameraPresetManager`
2. 手动测试：在控制台调用 `cameraSystem.presetManager.applyPreset(camera, 'iso')`
3. 验证 EventBus 事件：监听 `camera:preset:changed` 事件
4. 确认无编译错误和类型错误

---

## 阶段 2：Strategy 清理增强（优先级：⭐⭐⭐⭐）

**目标**：增强所有 Strategy 的 exit() 方法，确保状态完全重置，实现零污染的视角切换

**预计时间**：4 小时

### 任务清单

- [ ] 2.1 重写 IsometricStrategy.exit()（1h）
  - [ ] 2.1.1 打开 `src/core/systems/camera_strategies/IsometricStrategy.ts`
  - [ ] 2.1.2 识别所有内部状态变量
    - cachedTargetPosition
    - smoothVelocity
    - 其他缓存变量
  - [ ] 2.1.3 重写 exit() 方法
    - 清空 cachedTargetPosition
    - 重置 smoothVelocity 为 (0, 0, 0)
    - 添加日志：`[IsometricStrategy] Exited, state cleared`
  - [ ] 2.1.4 确保不清空 targetEntityId（由 PresetManager 管理）
  - _需求：4.1, 4.2, 4.3_

- [ ] 2.2 重写 FirstPersonStrategy.exit()（1h）
  - [ ] 2.2.1 打开 `src/core/systems/camera_strategies/FirstPersonStrategy.ts`
  - [ ] 2.2.2 识别所有内部状态变量
    - headSocketOffset
    - mouseLookEnabled
    - 其他头部锁定相关状态
  - [ ] 2.2.3 重写 exit() 方法
    - 禁用 mouseLookEnabled
    - 重置 headSocketOffset 为默认值 (0, 1.7, 0)
    - 添加日志：`[FirstPersonStrategy] Exited, head lock cleared`
  - _需求：4.1, 4.4_

- [ ] 2.3 重写 ThirdPersonStrategy.exit()（1h）
  - [ ] 2.3.1 打开 `src/core/systems/camera_strategies/ThirdPersonStrategy.ts`
  - [ ] 2.3.2 识别所有内部状态变量
    - springArmLength
    - collisionAdjustment
    - 其他弹簧臂相关状态
  - [ ] 2.3.3 重写 exit() 方法
    - 重置 springArmLength 为默认值 8
    - 清空 collisionAdjustment 为 0
    - 添加日志：`[ThirdPersonStrategy] Exited, spring arm reset`
  - _需求：4.1_

- [ ] 2.4 重写 SidescrollStrategy.exit()（0.5h）
  - [ ] 2.4.1 打开 `src/core/systems/camera_strategies/SidescrollStrategy.ts`
  - [ ] 2.4.2 识别所有内部状态变量
    - fixedYaw
    - smoothFollowSpeed
    - 其他轴锁定相关状态
  - [ ] 2.4.3 重写 exit() 方法
    - 重置 fixedYaw 为默认值 90
    - 重置 smoothFollowSpeed 为默认值 5
    - 添加日志：`[SidescrollStrategy] Exited, axis lock cleared`
  - _需求：4.1_

- [ ] 2.5 验证 OrbitStrategy（0.5h）
  - [ ] 2.5.1 打开 `src/core/systems/camera_strategies/OrbitStrategy.ts`
  - [ ] 2.5.2 确认文件顶部有 `// 🔒 FROZEN` 标记
  - [ ] 2.5.3 确认 exit() 方法保持不变
  - [ ] 2.5.4 不做任何修改
  - _需求：9.5（架构约束）_

- [ ] 2.6 集成测试（1h）
  - [ ] 2.6.1 创建测试文件 `src/core/systems/camera_strategies/StrategyCleanup.test.ts`
  - [ ] 2.6.2 测试 IsometricStrategy 清理
    - 使用后调用 exit()
    - 验证内部状态已重置
  - [ ] 2.6.3 测试 FirstPersonStrategy 清理
  - [ ] 2.6.4 测试 ThirdPersonStrategy 清理
  - [ ] 2.6.5 测试 SidescrollStrategy 清理
  - [ ] 2.6.6 测试 ISO -> FPS -> TPS 无缝切换
    - 验证无状态污染
    - 验证 targetEntityId 正确传递
  - _需求：4.5, 7.4, 7.5_

### 验收标准

- ✅ 所有 Strategy 的 exit() 方法已重写（除 OrbitStrategy）
- ✅ 内部状态完全重置（通过测试验证）
- ✅ ISO -> FPS -> TPS 无缝切换（无状态污染）
- ✅ OrbitStrategy 保持 🔒 FROZEN 状态
- ✅ 集成测试全部通过

### 检查点

完成本阶段后，执行以下检查：
1. 运行集成测试：`npm test StrategyCleanup`
2. 手动测试：ISO -> FPS -> TPS -> ISO 循环切换 10 次
3. 验证日志输出：每次切换都有 "Exited" 日志
4. 确认无状态残留（通过调试器检查内部变量）

---

## 阶段 3：防穿墙机制（优先级：⭐⭐⭐）

**目标**：实现全局防穿墙检测，为所有绑定角色的预设提供统一的防穿墙能力

**预计时间**：6 小时

### 任务清单

- [ ] 3.1 在 CameraSystem 中实现防穿墙检测（2h）
  - [ ] 3.1.1 打开 `src/core/systems/CameraSystem.ts`
  - [ ] 3.1.2 添加缓存的 Raycaster 实例（类成员变量）
    ```typescript
    private readonly collisionRaycaster: THREE.Raycaster = new THREE.Raycaster();
    private readonly collisionDirection: THREE.Vector3 = new THREE.Vector3();
    ```
  - [ ] 3.1.3 实现 applyCollisionDetection() 私有方法
    - 参数：camera, targetPosition, desiredCameraPosition
    - 返回：adjustedPosition
    - 检查 enableCollision 开关
    - 使用 Raycast 检测障碍物
    - 计算调整后的相机位置（留 0.5 单位缓冲）
    - 最小距离限制为 1.0
  - [ ] 3.1.4 添加性能优化注释（避免每帧创建新对象）
  - _需求：10.1, 10.2, 10.4, 10.6_

- [ ] 3.2 实现场景几何体获取（1h）
  - [ ] 3.2.1 实现 getSceneGeometry() 私有方法
  - [ ] 3.2.2 从 WorldStateManager 获取地形
  - [ ] 3.2.3 从 EntityManager 获取具有碰撞体的实体
    - 遍历所有实体
    - 检查 Visual 组件的 collidable 标志
    - 收集 mesh 对象
  - [ ] 3.2.4 返回 THREE.Object3D[] 数组
  - _需求：10.2_

- [ ] 3.3 集成到 IsometricStrategy（0.5h）
  - [ ] 3.3.1 打开 `src/core/systems/camera_strategies/IsometricStrategy.ts`
  - [ ] 3.3.2 在 updateTarget() 方法中调用 applyCollisionDetection()
    - 计算期望的相机位置
    - 调用 cameraSystem.applyCollisionDetection()
    - 使用调整后的位置
  - [ ] 3.3.3 确保平滑移动（lerp）
  - _需求：10.3_

- [ ] 3.4 集成到 FirstPersonStrategy（0.5h）
  - [ ] 3.4.1 打开 `src/core/systems/camera_strategies/FirstPersonStrategy.ts`
  - [ ] 3.4.2 在 updateTarget() 方法中调用 applyCollisionDetection()
  - [ ] 3.4.3 处理头部锁定位置
  - _需求：10.3_

- [ ] 3.5 集成到 ThirdPersonStrategy（0.5h）
  - [ ] 3.5.1 打开 `src/core/systems/camera_strategies/ThirdPersonStrategy.ts`
  - [ ] 3.5.2 在 updateTarget() 方法中调用 applyCollisionDetection()
  - [ ] 3.5.3 处理弹簧臂逻辑
  - _需求：10.3_

- [ ] 3.6 集成到 SidescrollStrategy（0.5h）
  - [ ] 3.6.1 打开 `src/core/systems/camera_strategies/SidescrollStrategy.ts`
  - [ ] 3.6.2 在 updateTarget() 方法中调用 applyCollisionDetection()
  - [ ] 3.6.3 处理固定侧面跟随
  - _需求：10.3_

- [ ] 3.7 添加配置项（0.5h）
  - [ ] 3.7.1 确认 CameraComponent.enableCollision 字段已添加（阶段1完成）
  - [ ] 3.7.2 在 CameraComponent 初始化时设置默认值为 true
  - [ ] 3.7.3 在序列化/反序列化中处理该字段
  - _需求：10.7_

- [ ] 3.8 性能测试（1h）
  - [ ] 3.8.1 创建测试文件 `src/core/systems/CameraSystem.collision.test.ts`
  - [ ] 3.8.2 测试防穿墙有效性
    - 创建场景：角色 + 墙壁
    - 将相机移动到墙壁后方
    - 验证相机位置被调整
  - [ ] 3.8.3 测试性能（60 FPS）
    - 模拟 60 帧更新
    - 验证帧率 ≥ 60
  - [ ] 3.8.4 测试配置开关
    - enableCollision = false 时不调整
    - enableCollision = true 时调整
  - _需求：10.2, 10.4, 10.5, 9.2_

### 验收标准

- ✅ 防穿墙检测正常工作（相机不穿透障碍物）
- ✅ 所有 bindTarget=true 的预设都支持防穿墙
- ✅ 性能测试通过（FPS ≥ 60）
- ✅ 配置开关正常工作
- ✅ 缓存 Raycaster 实例（无 GC 压力）
- ✅ 最小距离限制生效（≥ 1.0）

### 检查点

完成本阶段后，执行以下检查：
1. 运行性能测试：`npm test CameraSystem.collision`
2. 手动测试：在场景中放置墙壁，切换到 TPS，验证相机不穿墙
3. 性能分析：使用 Chrome DevTools 检查 GC 频率
4. 配置测试：切换 enableCollision 开关，验证行为变化

---

## 阶段 4：UI 集成（优先级：⭐⭐⭐⭐）

**目标**：在 UI 中集成预设选择器，实现一键切换视角的用户体验

**预计时间**：4 小时

### 任务清单

- [ ] 4.1 在 ArchitectureValidationPanel 中添加预设选择器（1.5h）
  - [ ] 4.1.1 打开 `src/components/rendering/ArchitectureValidationPanel.tsx`
  - [ ] 4.1.2 在体验模式（Experience Mode）区域添加相机预设选择器
  - [ ] 4.1.3 使用 getAllPresets() 获取所有预设
  - [ ] 4.1.4 渲染预设按钮列表
    ```tsx
    {presets.map(preset => (
      <button
        key={preset.id}
        onClick={() => handlePresetChange(preset.id)}
        className={activePreset === preset.id ? 'active' : ''}
      >
        {preset.displayName}
      </button>
    ))}
    ```
  - [ ] 4.1.5 添加样式（高亮当前激活预设）
  - _需求：6.1, 6.2, 6.3_

- [ ] 4.2 实现预设切换逻辑（1h）
  - [ ] 4.2.1 实现 handlePresetChange() 函数
    - 获取 CameraSystem 实例
    - 获取主相机组件
    - 调用 cameraSystem.presetManager.applyPreset(camera, presetId)
    - 处理返回值（成功/失败）
  - [ ] 4.2.2 添加加载状态（防止重复点击）
  - [ ] 4.2.3 添加错误处理（捕获异常）
  - _需求：6.2_

- [ ] 4.3 实现状态同步（1h）
  - [ ] 4.3.1 添加 useState 管理 activePreset
  - [ ] 4.3.2 实现 500ms 轮询机制
    ```tsx
    useEffect(() => {
      const interval = setInterval(() => {
        const camera = cameraSystem.getMainCamera();
        setActivePreset(camera.activePreset);
      }, 500);
      return () => clearInterval(interval);
    }, []);
    ```
  - [ ] 4.3.3 监听 EventBus 事件（camera:preset:changed）
    - 立即更新 UI（无需等待轮询）
  - [ ] 4.3.4 监听 EventBus 事件（camera:preset:fallback）
    - 自动更新 UI 显示
  - _需求：6.5, 6.6_

- [ ] 4.4 实现错误提示（0.5h）
  - [ ] 4.4.1 监听 EventBus 事件（camera:preset:error）
  - [ ] 4.4.2 定义错误消息映射
    ```tsx
    const errorMessages = {
      'PRESET_NOT_FOUND': '未找到相机预设',
      'NO_TARGET_ENTITY': '需要角色才能使用此视角',
      'STRATEGY_UNAVAILABLE': '相机模式不可用',
      'INVALID_SNAPSHOT': '相机配置无效'
    };
    ```
  - [ ] 4.4.3 显示 Toast 或 Notification
    - 类型：warning
    - 持续时间：3000ms
  - _需求：6.4_

- [ ] 4.5 添加国际化支持（可选）（0.5h）
  - [ ] 4.5.1 在 `locales/zh.json` 中添加预设名称翻译
  - [ ] 4.5.2 在 `locales/en.json` 中添加预设名称翻译
  - [ ] 4.5.3 使用 i18n 函数替换硬编码文本
  - _需求：非功能性需求（国际化）_

- [ ] 4.6 UI 测试（0.5h）
  - [ ] 4.6.1 手动测试：点击每个预设按钮
  - [ ] 4.6.2 验证高亮状态正确
  - [ ] 4.6.3 验证错误提示显示
  - [ ] 4.6.4 验证自动同步（删除角色后 UI 自动更新）
  - _需求：6.1, 6.3, 6.4, 6.5, 6.6_

### 验收标准

- ✅ UI 显示所有 5 种预设按钮
- ✅ 点击按钮成功切换预设
- ✅ 当前激活预设高亮显示
- ✅ 切换失败时显示友好错误提示
- ✅ UI 状态 100% 同步（500ms 轮询 + EventBus）
- ✅ 角色删除后 UI 自动更新到 iso

### 检查点

完成本阶段后，执行以下检查：
1. 手动测试：在体验模式下点击所有预设按钮
2. 验证高亮：当前激活预设应该有视觉反馈
3. 错误测试：无角色时点击 FPS，验证错误提示
4. 同步测试：删除角色，验证 UI 自动切换到 iso

---

## 阶段 5：测试与优化（优先级：⭐⭐⭐）

**目标**：完善测试覆盖和性能优化，确保系统稳定性和高性能

**预计时间**：6 小时

### 任务清单

- [ ] 5.1 编写单元测试（2h）
  - [ ] 5.1.1 CameraPresetManager 单元测试（已在阶段1完成）
  - [ ] 5.1.2 Strategy 清理测试（已在阶段2完成）
  - [ ] 5.1.3 防穿墙测试（已在阶段3完成）
  - [ ] 5.1.4 补充边界条件测试
    - 空预设 ID
    - 无效的 CameraSnapshot
    - 重复应用同一预设
  - _需求：所有需求_

- [ ] 5.2 编写集成测试（2h）
  - [ ] 5.2.1 创建测试文件 `src/core/systems/CameraPreset.integration.test.ts`
  - [ ] 5.2.2 测试完整的预设切换流程
    - ISO -> FPS -> TPS -> Sidescroll -> ISO
    - 验证每次切换后的状态
  - [ ] 5.2.3 测试有角色/无角色场景切换
    - 无角色 -> 生成角色 -> 切换预设 -> 删除角色
    - 验证状态隔离
  - [ ] 5.2.4 测试自动回退
    - 切换到 FPS -> 删除角色 -> 验证回退到 iso
  - [ ] 5.2.5 测试 ISO 双模态
    - 无角色时：targetEntityId = null
    - 有角色时：targetEntityId = entity.id
  - _需求：7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 5.3 编写性能测试（1h）
  - [ ] 5.3.1 创建测试文件 `src/core/systems/CameraPreset.performance.test.ts`
  - [ ] 5.3.2 测试预设切换延迟
    - 使用 performance.now() 计时
    - 验证 < 100ms
  - [ ] 5.3.3 测试帧率保证
    - 模拟 60 帧更新（5000草 + 1角色）
    - 验证 FPS ≥ 60
  - [ ] 5.3.4 测试内存泄漏
    - 运行 1 小时
    - 验证内存增长 < 50MB
  - _需求：9.1, 9.2, 9.3_

- [ ] 5.4 编写向后兼容测试（1h）
  - [ ] 5.4.1 创建测试文件 `src/core/systems/CameraPreset.compatibility.test.ts`
  - [ ] 5.4.2 测试旧存档加载
    - 创建包含 controlledEntityId 的旧存档
    - 加载存档
    - 验证 targetEntityId 被正确设置
    - 验证 controlledEntityId 被清空
  - [ ] 5.4.3 测试 CameraMode 映射
    - 旧的 mode: 'isometric' -> activePreset: 'iso'
    - 验证所有模式映射正确
  - [ ] 5.4.4 测试新字段初始化
    - presetHistory 初始化为 []
    - enableCollision 初始化为 true
  - _需求：9.4, 9.6_

- [ ] 5.5 性能优化（可选）（1h）
  - [ ] 5.5.1 分析性能瓶颈（使用 Chrome DevTools）
  - [ ] 5.5.2 优化 Raycast 频率（如果需要）
  - [ ] 5.5.3 优化 UI 轮询频率（如果需要）
  - [ ] 5.5.4 优化 EventBus 事件处理
  - _需求：9.2, 9.3_

- [ ] 5.6 文档更新（可选）（1h）
  - [ ] 5.6.1 更新 README.md（添加相机预设系统说明）
  - [ ] 5.6.2 更新 API 文档（CameraPresetManager 公开接口）
  - [ ] 5.6.3 添加使用示例（如何注册自定义预设）
  - [ ] 5.6.4 添加故障排查指南
  - _需求：非功能性需求（可维护性）_

### 验收标准

- ✅ 测试覆盖率 > 80%
- ✅ 所有单元测试通过
- ✅ 所有集成测试通过
- ✅ 所有性能测试通过
- ✅ 所有向后兼容测试通过
- ✅ 无内存泄漏
- ✅ 文档完整（可选）

### 检查点

完成本阶段后，执行以下检查：
1. 运行所有测试：`npm test`
2. 检查测试覆盖率：`npm run test:coverage`
3. 性能分析：使用 Chrome DevTools 分析内存和 CPU
4. 手动回归测试：验证所有功能正常工作

---

## 总体验收标准

### 功能完整性

- ✅ 4 种体验模式预设全部可用（iso/fps/tps/sidescroll）
- 🔴 orbit **未**注册为预设 - 确认为创造模式固定相机，不受预设系统管理
- ✅ 体验模式下有角色时可自由切换 iso/fps/tps/sidescroll
- ✅ 体验模式下无角色时可使用 iso（纯观察模式）
- ✅ 体验模式下删除角色自动回退到 iso
- 🆕 创造模式下 Orbit 相机不受预设系统任何影响
- 🆕 体验模式下无法通过 applyPreset() 切换到 Orbit（被拒绝）
- ✅ ISO 双模态正常工作（无角色观察 + 有角色跟随）

### 状态隔离

- ✅ 有角色/无角色场景完全隔离，零污染
- ✅ ISO -> FPS -> TPS 无缝切换，无"无法跟随"Bug
- ✅ 角色删除后相机状态自动清理
- ✅ Strategy 清理完整（无状态残留）

### 用户体验

- ✅ UI 显示当前激活预设
- ✅ 切换失败时显示友好提示
- ✅ UI 状态 100% 同步（500ms 轮询 + EventBus）
- ✅ 一键切换，无需记住参数

### 性能

- ✅ 切换延迟 < 100ms
- ✅ FPS ≥ 60（标准场景：5000草 + 1角色）
- ✅ 无内存泄漏（运行 1 小时内存增长 < 50MB）
- ✅ 防穿墙检测不影响帧率

### 扩展性

- ✅ 支持动态注册自定义预设（MOD 友好）
- ✅ 向后兼容（旧存档加载成功）
- ✅ OrbitStrategy 保持 🔒 FROZEN

---

## 实施建议

### 开发顺序

1. **先完成阶段1**：核心架构是基础，必须先完成
2. **再完成阶段2**：Strategy 清理是解决状态污染的关键
3. **然后完成阶段4**：UI 集成可以尽早验证用户体验
4. **最后完成阶段3和5**：防穿墙和测试可以并行进行

### 小步迭代

- 每完成一个阶段，立即进行验收测试
- 发现问题立即修复，不要积累技术债
- 每个阶段都要有可演示的成果

### 风险控制

- **OrbitStrategy 🔒 FROZEN**：绝对不修改，确保创造模式稳定
- **向后兼容**：每次修改都要测试旧存档加载
- **性能监控**：每个阶段都要检查性能指标

### 沟通机制

- 每完成一个阶段，向制作人汇报进度
- 遇到技术难题，及时沟通寻求帮助
- 发现需求不明确，立即澄清

---

## 附录：快速参考

### 关键文件

- `src/core/systems/CameraPresetManager.ts` - 预设管理器（新增）
- `src/core/components/CameraComponent.ts` - 相机组件（扩展）
- `src/core/systems/CameraSystem.ts` - 相机系统（集成）
- `src/core/systems/camera_strategies/*.ts` - 相机策略（修改）
- `src/components/rendering/ArchitectureValidationPanel.tsx` - UI 面板（修改）

### 关键接口

```typescript
interface CameraPreset {
  id: string;
  displayName: string;
  mode: CameraMode;
  snapshot: CameraSnapshot;
  bindTarget: boolean;
  dualMode?: boolean;
  description?: string;
  icon?: string;
}

class CameraPresetManager {
  registerPreset(preset: CameraPreset): void;
  applyPreset(camera: CameraComponent, presetId: string): boolean;
  getCurrentPreset(camera: CameraComponent): CameraPreset | null;
  fallbackToSafePreset(camera: CameraComponent): void;
  getAllPresets(): CameraPreset[];
}
```

### EventBus 事件

```typescript
// 预设切换成功
EventBus.emit('camera:preset:changed', { presetId, mode });

// 预设切换失败
EventBus.emit('camera:preset:error', { errorCode, reason, presetId });

// 自动回退
EventBus.emit('camera:preset:fallback', { fromPreset, toPreset, reason });
```

### 测试命令

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test CameraPresetManager
npm test StrategyCleanup
npm test CameraSystem.collision
npm test CameraPreset.integration
npm test CameraPreset.performance
npm test CameraPreset.compatibility

# 检查测试覆盖率
npm run test:coverage
```

---

**文档版本**：v1.0  
**创建日期**：2025-12-30  
**最后更新**：2025-12-30  
**状态**：待执行
