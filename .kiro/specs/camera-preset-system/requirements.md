# 需求文档 - 相机预设系统 (Camera Preset System)

## 引言

### 项目背景

PolyForge v1.3.1 是一个基于 Entity-Component-System (ECS) 架构的游戏引擎，当前处于 Phase 17 阶段。在 Phase 15-17 的迭代中，已完成**创造模式（CREATION）** 的稳定化验收，包括 Orbit 相机、地形编辑、资产管理等核心功能。

当前需求聚焦于 **体验模式（EXPERIENCE）** 的多视角切换能力，但在实现过程中暴露出架构性问题：

- **现象**："修好一个，另一个就坏" - 视角切换时状态污染，体验模式的逻辑意外侵入创造模式
- **根因**：双重绑定混乱（`targetEntityId` vs `controlledEntityId`）、Strategy 清理不彻底、**模式边界不清晰**
- **影响**：无法实现"有角色情况下无缝切换到各种视角"的核心诉求，且破坏了创造模式的稳定性

本需求文档旨在通过引入 **CameraPreset（相机预设）** 轻量概念，**专属服务于体验模式**，解决上述架构性问题，实现游戏化的一键视角切换体验，同时**绝对保证体验模式不影响创造模式**。

### 🔴 核心架构铁律

**单向影响原则**：
- 创造模式（CREATION）→ 体验模式（EXPERIENCE）：**允许** - 创造的内容（地形、实体）是体验的基础
- 体验模式（EXPERIENCE）→ 创造模式（CREATION）：**绝对禁止** - 体验逻辑不得侵入创造模式

**物理隔离保证**：
- CameraPresetManager **只存在于体验模式**，创造模式完全不可见
- Orbit 相机（创造模式专属）**不是预设**，不受预设系统管理
- 所有预设逻辑必须检查 `currentContext`，拒绝在创造模式下执行

### 目标用户

- **游戏创作者**：需要快速切换不同游戏视角（暗黑/FPS/塞尔达/空洞骑士）进行场景预览
- **MOD开发者**：需要扩展自定义相机视角（如DNF清版视角）
- **AI系统开发者**：需要相机系统与未来的行为树/状态机系统无缝集成

### 核心价值

- **游戏化交互**：一键切换视角，无需记住复杂参数（pitch/yaw/distance）
- **架构纯净**：完全符合 ECS 架构铁律和 Strategy 模式
- **模式隔离**：体验模式预设系统**绝对不影响**创造模式（🔴 最高优先级）
- **扩展友好**：添加新视角如同"插件"，无需修改核心代码
- **状态隔离**：有角色/无角色场景完全隔离，零污染保证

---

## 术语表

- **CameraSystem**：相机系统，负责管理相机的更新、输入处理和视角切换
- **CameraComponent**：相机组件，存储相机的状态数据（位置、旋转、目标等）
- **ICameraStrategy**：相机策略接口，定义不同视角的行为逻辑
- **CameraMode**：相机模式枚举，对应不同的 Strategy 实现（orbit/isometric/firstPerson/thirdPerson/sidescroll）
- **CameraPreset**：相机预设，轻量虚拟相机概念，封装了 Strategy + 默认配置 + 绑定需求
- **CameraPresetManager**：预设管理器，负责注册、应用和管理相机预设
- **CameraSnapshot**：相机快照，存储相机的配置参数（pitch/yaw/distance/fov等）
- **targetEntityId**：目标实体ID，相机跟随或观察的实体
- **bindTarget**：绑定目标标志，标识某个 Preset 是否需要绑定角色才能使用
- **AssetBridge**：资产桥接器，用于将旧版美术工具的数据转换为新版 ECS 实体
- **Strategy 清理**：Strategy 的 `exit()` 方法，负责在切换视角时重置状态
- **健康检查**：在应用 Preset 前验证前置条件（如角色存在性）的机制

---

## 需求列表

### 需求 1：相机预设管理

**用户故事**：作为游戏创作者，我希望系统能够管理多种相机预设，以便我可以快速切换到不同的游戏视角。

#### 验收标准

1. WHEN 系统初始化时，THE CameraPresetManager SHALL 注册所有**体验模式**标准预设（iso/fps/tps/sidescroll）
   - 🔴 **严禁注册 orbit** - Orbit 是创造模式的固定相机，不是预设
2. WHEN 用户请求应用某个预设时，THE CameraPresetManager SHALL 验证该预设是否已注册
   - 🔴 **如果 currentContext === CREATION**，SHALL 拒绝执行并返回错误
3. WHEN 预设不存在时，THE CameraPresetManager SHALL 返回错误信息并保持当前状态不变
4. WHEN 预设应用成功时，THE CameraPresetManager SHALL 更新 CameraComponent 的 activePreset 字段
5. THE CameraPresetManager SHALL 支持动态注册新预设（用于 MOD 扩展）
   - 🔴 **但不允许注册 orbit 或任何 mode='orbit' 的预设**

---

### 需求 2：预设健康检查机制

**用户故事**：作为游戏创作者，我希望系统能够自动检查预设的前置条件，以避免切换到不合法的视角导致错误。

#### 验收标准

1. WHEN 用户尝试应用需要绑定角色的预设（bindTarget=true）时，IF 当前场景无可控角色，THEN THE CameraPresetManager SHALL 拒绝切换并提示"需要角色"
2. WHEN 用户尝试应用不需要绑定角色的预设（bindTarget=false）时，THE CameraPresetManager SHALL 允许切换，无论是否有角色
3. WHEN 角色被删除时，IF 当前预设需要绑定角色，THEN THE CameraSystem SHALL 自动切换到 "iso" 预设作为体验模式的统一安全视角
4. WHEN 预设切换失败时，THE CameraSystem SHALL 保持当前状态不变，并通过 EventBus 发送错误事件
5. THE CameraPresetManager SHALL 在应用预设前执行完整的健康检查（目标存在性、Strategy 可用性、配置有效性）

---

### 需求 3：统一绑定逻辑

**用户故事**：作为系统架构师，我希望消除双重绑定混乱，统一使用 targetEntityId 作为唯一的绑定标识，以简化代码逻辑并避免状态污染。

#### 验收标准

1. THE CameraComponent SHALL 只保留 targetEntityId 字段作为绑定标识
2. THE CameraComponent SHALL 将 controlledEntityId 标记为 Deprecated，并在序列化时自动迁移到 targetEntityId
3. THE CameraComponent SHALL 添加 activePreset 字段记录当前激活的预设ID
4. THE CameraComponent SHALL 添加 presetHistory 字段（数组）记录最近使用的预设历史，支持快速切换
5. WHEN 应用预设时，IF 预设需要绑定角色（bindTarget=true），THEN THE CameraPresetManager SHALL 设置 targetEntityId 为当前可控角色的 ID
6. WHEN 应用预设时，IF 预设不需要绑定角色（bindTarget=false）且当前无角色，THEN THE CameraPresetManager SHALL 清空 targetEntityId；IF 有角色，则保留绑定以支持双模态
7. WHEN targetEntityId 指向的实体被删除时，THE CameraSystem SHALL 自动清空 targetEntityId 并触发预设回退到 "iso"


---

### 需求 4：Strategy 清理增强

**用户故事**：作为系统架构师，我希望所有 Strategy 在退出时能够完全重置状态，以确保视角切换时不会产生状态污染。

#### 验收标准

1. WHEN Strategy 的 exit() 方法被调用时，THE Strategy SHALL 重置所有内部状态变量（如缓存的目标位置、速度、偏移量等）
2. WHEN Strategy 的 exit() 方法被调用时，THE Strategy SHALL 保留必要的绑定关系（如 targetEntityId），不应清空
3. WHEN 从 IsometricStrategy 切换到 FirstPersonStrategy 时，THE IsometricStrategy SHALL 清除所有 ISO 特有的状态（如固定俯仰角、锁定旋转等）
4. WHEN 从 FirstPersonStrategy 切换到 ThirdPersonStrategy 时，THE FirstPersonStrategy SHALL 清除头部锁定状态
5. THE CameraSystem SHALL 在调用新 Strategy 的 enter() 方法前，确保旧 Strategy 的 exit() 方法已完成执行

---

### 需求 5：标准预设定义

**用户故事**：作为游戏创作者，我希望系统提供5种标准游戏视角预设，以覆盖常见的游戏类型需求。

#### 验收标准

1. 🔴 **移除**：THE CameraPresetManager SHALL **不**注册 "orbit" 预设 - Orbit 是创造模式的固定相机，不属于预设系统
2. THE CameraPresetManager SHALL 注册 "iso" 预设，对应上帝视角（类暗黑破坏神，bindTarget=false，支持双模态：无角色时纯观察，有角色时自动跟随）
3. THE CameraPresetManager SHALL 注册 "fps" 预设，对应第一人称视角（bindTarget=true）
4. THE CameraPresetManager SHALL 注册 "tps" 预设，对应第三人称视角（类塞尔达，bindTarget=true）
5. THE CameraPresetManager SHALL 注册 "sidescroll" 预设，对应横板卷轴视角（类空洞骑士，bindTarget=true）
6. WHEN 预设被应用时，THE CameraPresetManager SHALL 自动加载预设的默认 CameraSnapshot 配置（pitch/yaw/distance/fov等）
7. THE "iso" 预设 SHALL 作为体验模式的默认安全视角，角色删除后自动回退到此预设（**仅在体验模式下**）

---

### 需求 6：UI 集成与同步

**用户故事**：作为游戏创作者，我希望在 UI 中能够直观地选择和切换相机预设，并实时看到当前激活的预设状态。

#### 验收标准

1. THE ArchitectureValidationPanel SHALL **只在体验模式（Experience Tab）且 currentContext === EXPERIENCE** 时显示相机预设选择器
   - 🔴 **严禁在 Director Tab（创造模式）中显示预设 UI**
2. WHEN 用户点击某个预设按钮时，THE UI SHALL 先验证 currentContext，如果非 EXPERIENCE 则拒绝并提示错误
3. WHEN currentContext === EXPERIENCE 时，THE UI SHALL 调用 CameraPresetManager.applyPreset() 方法
4. WHEN 预设切换成功时，THE UI SHALL 高亮显示当前激活的预设
5. WHEN 预设切换失败时，THE UI SHALL 显示友好的错误提示（如"需要角色才能使用此视角" 或 "预设仅在体验模式下可用"）
6. THE UI SHALL 通过 500ms 轮询机制同步 CameraComponent.activePreset 字段，确保状态 100% 一致
7. WHEN 角色被删除导致预设自动回退时，THE UI SHALL 自动更新显示，无需用户手动刷新
8. 🔴 **不显示 Orbit 预设** - UI 预设列表只包含 iso/fps/tps/sidescroll


---

### 需求 7：状态隔离保证

**用户故事**：作为游戏创作者，我希望有角色和无角色两种场景能够完全隔离，互不干涉，以避免状态污染导致的 Bug。

#### 验收标准

1. WHEN 在创造模式（currentContext === CREATION）下使用 orbit 相机时，THE CameraSystem SHALL 正常工作，**不受预设系统任何影响**
   - 🔴 **CameraPresetManager 在创造模式下完全不可见、不可用**
2. WHEN 在体验模式（currentContext === EXPERIENCE）无角色场景下使用 iso 预设时，THE CameraSystem SHALL 正常工作（纯观察模式）
3. WHEN 在体验模式有角色场景下切换到 iso/fps/tps/sidescroll 预设时，THE CameraSystem SHALL 正确绑定角色
4. WHEN 从有角色场景切换到无角色场景（角色被删除）时，THE CameraSystem SHALL 自动清理所有角色绑定，回到干净的 iso 状态（**仅在体验模式下**）
   - 🔴 **如果在创造模式下删除测试角色，不触发任何预设逻辑，只静默清理 targetEntityId**
5. WHEN 在 ISO 模式下生成角色后切换到 FPS 模式时，THE CameraSystem SHALL 正确跟随角色，不会出现"无法跟随"的 Bug
6. THE CameraSystem SHALL 在每次预设切换时执行完整的状态重置，确保零污染
7. 🔴 **跨模式隔离**：从创造模式切换到体验模式时，THE CameraSystem SHALL 自动应用 iso 预设；从体验模式返回创造模式时，THE CameraSystem SHALL 恢复 orbit 相机，**不保留任何体验模式的预设状态**

---

### 需求 8：扩展性支持

**用户故事**：作为 MOD 开发者，我希望能够轻松添加自定义相机视角（如 DNF 清版视角），而无需修改引擎核心代码。

#### 验收标准

1. THE CameraPresetManager SHALL 提供 registerPreset() 公开 API，允许外部注册自定义预设
2. WHEN 注册自定义预设时，THE CameraPresetManager SHALL 验证预设的合法性（id 唯一性、mode 有效性、snapshot 完整性）
3. WHEN 自定义预设注册成功后，THE UI SHALL 自动显示该预设选项，无需手动配置
4. THE CameraSystem SHALL 支持动态加载自定义 Strategy 实现（通过 strategies.set() 方法）
5. THE CameraPresetManager SHALL 支持预设的序列化和反序列化，以便保存用户的自定义配置

---

### 需求 10：防穿墙机制（全局游戏逻辑）

**用户故事**：作为游戏创作者，我希望所有需要绑定角色的相机模式都具备防穿墙能力，以避免相机穿透场景几何体导致的视觉问题。

#### 验收标准

1. THE CameraSystem SHALL 提供全局防穿墙检测能力，作为所有绑定角色预设的通用功能
2. WHEN 相机与目标之间存在障碍物时，THE CameraSystem SHALL 自动缩短相机距离，确保视野不被遮挡
3. THE 防穿墙机制 SHALL 适用于所有 bindTarget=true 的预设（iso/fps/tps/sidescroll），不限于特定模式
4. WHEN 障碍物移除后，THE CameraSystem SHALL 平滑地将相机恢复到预设的默认距离
5. THE CameraSystem SHALL 使用 Raycast 检测障碍物，检测频率与帧率同步
6. THE 防穿墙逻辑 SHALL 在 CameraSystem 层统一实现，Strategy 只需提供目标位置和相机位置，无需关心防穿墙细节
7. THE CameraComponent SHALL 提供 `enableCollision` 配置项，允许全局开关防穿墙功能（默认开启）

---

### 需求 9：性能与兼容性

**用户故事**：作为系统架构师，我希望新系统在保证功能的同时，不降低性能，并保持与旧版数据的兼容性。

#### 验收标准

1. WHEN 切换预设时，THE CameraPresetManager SHALL 在 100ms 内完成切换，确保流畅体验
2. WHEN 场景包含 5000 个草实例和 1 个角色时，THE CameraSystem SHALL 保持 FPS ≥ 60
3. THE CameraPresetManager SHALL 不在运行时创建临时对象，避免 GC 压力
4. THE CameraComponent SHALL 保留 controlledEntityId 字段作为 Deprecated，并在加载旧存档时自动迁移到 targetEntityId
5. THE CameraSystem SHALL 保持 OrbitStrategy 的实现不变（标记为 🔒 FROZEN），确保创造模式的稳定性
6. WHEN 加载旧版存档时，THE CameraSystem SHALL 自动将旧的 CameraMode 映射到对应的 Preset，无需用户手动转换

---

## 非功能性需求

### 可维护性

1. THE CameraPresetManager SHALL 使用清晰的命名和注释，确保代码可读性
2. THE CameraPreset 接口 SHALL 保持简洁，避免过度设计
3. THE CameraSystem SHALL 遵循单一职责原则，预设管理逻辑独立于相机更新逻辑

### 可测试性

1. THE CameraPresetManager SHALL 提供独立的单元测试接口，无需依赖完整的 ECS 环境
2. THE 健康检查机制 SHALL 可通过 Mock 数据进行测试
3. THE Strategy 清理逻辑 SHALL 可通过状态快照对比进行验证

### 可扩展性

1. THE CameraPreset 接口 SHALL 支持未来添加新字段（如 blendTime、priority 等），而不破坏现有代码
2. THE CameraPresetManager SHALL 支持预设的继承和组合（如基于 tps 创建 tps-over-shoulder 变体）

---

## 约束条件

### 架构约束

1. **ECS 纯净性**：所有核心逻辑必须位于 `src/core/systems`，UI 层只能作为状态的可视化
2. **Strategy 模式**：必须保持现有的 ICameraStrategy 接口不变，确保向后兼容
3. **OrbitStrategy 锁定**：OrbitStrategy 已标记为 🔒 FROZEN，严禁修改
4. 🔴 **模式隔离铁律**（最高优先级）：
   - CameraPresetManager **只能在体验模式（EXPERIENCE）下激活**
   - 所有预设逻辑**必须检查 currentContext**，拒绝在创造模式下执行
   - Orbit 相机**不是预设**，不受 CameraPresetManager 管理
   - 体验模式的任何逻辑**绝对不得影响**创造模式的相机行为

### 技术约束

1. **TypeScript 严格模式**：所有代码必须通过 TypeScript 严格类型检查
2. **React 18+**：UI 组件必须使用 Functional Components + Hooks
3. **Three.js**：相机操作必须通过 Three.js 的 Camera API，不得直接操作底层 WebGL

### 性能约束

1. **帧率**：在标准场景（5000草 + 1角色）下保持 FPS ≥ 60
2. **切换延迟**：预设切换延迟 < 100ms
3. **内存**：不得引入内存泄漏，运行 1 小时内存增长 < 50MB

---

## 验收标准总览

### 最小可行产品（MVP）

**功能完整性**：
- ✅ 4 种体验模式预设全部可用（iso/fps/tps/sidescroll）
- 🔴 移除：orbit 不是预设，是创造模式的固定相机
- ✅ 体验模式下有角色时可自由切换 iso/fps/tps/sidescroll
- ✅ 体验模式下无角色时可使用 iso（纯观察）
- ✅ 体验模式下删除角色自动回退到 iso
- 🔴 新增：创造模式下 Orbit 相机不受预设系统任何影响

**状态隔离**：
- ✅ 有角色/无角色场景完全隔离，零污染
- ✅ ISO → FPS → TPS 无缝切换，无"无法跟随"Bug
- ✅ 角色删除后相机状态自动清理

**用户体验**：
- ✅ UI 显示当前激活预设
- ✅ 切换失败时显示友好提示
- ✅ UI 状态 100% 同步（500ms 轮询）

**性能**：
- ✅ 切换延迟 < 100ms
- ✅ FPS ≥ 60（标准场景）
- ✅ 无内存泄漏

### 终极目标

- ✅ 支持动态注册自定义预设（MOD 友好）
- ✅ 旧版美术工具通过 AssetBridge 完全复用
- ✅ 为未来 AI 系统（行为树/状态机）打好基础

---

**文档版本**：v1.0  
**创建日期**：2025-12-30  
**最后更新**：2025-12-30  
**状态**：待审核
