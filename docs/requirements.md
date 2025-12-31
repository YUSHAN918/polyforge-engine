# PolyForge v1.3.0 核心架构 - 统一需求文档

**版本**: v1.3.0  
**最后更新**: 2025-12-23  
**状态**: 15/17 阶段完成 (88.2%)

---

## 简介

本文档定义了 PolyForge v1.3.0 的完整功能需求。PolyForge 是一个基于 ECS（Entity-Component-System）架构的游戏引擎，旨在提供高性能、可扩展的 3D 游戏开发能力。

v1.3.0 版本包含 17 个核心阶段，从基础 ECS 架构到最终优化，涵盖了完整的游戏引擎功能。

---

## 术语表

### 核心概念

- **Entity**: 实体，游戏世界中的基本对象
- **Component**: 组件，实体的数据容器
- **System**: 系统，处理组件数据的逻辑单元
- **EntityManager**: 实体管理器，负责实体的 CRUD 操作
- **SystemManager**: 系统管理器，负责系统的注册和更新循环
- **Clock**: 时钟系统，统一的时间管理
- **CommandManager**: 命令管理器，支持撤销/重做
- **WorldStateManager**: 环境状态管理器，管理昼夜循环和光照

### 核心组件

- **TransformComponent**: 变换组件（位置、旋转、缩放）
- **VisualComponent**: 视觉组件（几何体、材质）
- **PhysicsComponent**: 物理组件（刚体、碰撞体）
- **CameraComponent**: 相机组件（5 种模式）
- **AudioSourceComponent**: 音频组件（空间音频）
- **TerrainComponent**: 地形组件（高度图）
- **VegetationComponent**: 植被组件（GPU Instancing）

### 核心系统

- **HierarchySystem**: 层级系统（父子关系、Socket 挂点）
- **InputSystem**: 输入系统（键位映射、上下文栈）
- **PhysicsSystem**: 物理系统（Rapier 3D 集成）
- **CameraSystem**: 相机系统（平滑插值、跟随）
- **AudioSystem**: 音频系统（Web Audio API、3D 空间音频）
- **TerrainSystem**: 地形系统（动态地形生成、笔刷编辑）
- **VegetationSystem**: 植被系统（GPU Instancing、风场 Shader）

---

## Phase 1-12: 核心 ECS 架构（已完成 ✅）

这些阶段的详细需求已在各自的交付文档中记录，此处仅列出核心验收标准。

### Phase 1: 核心 ECS 基础设施 ✅

**验收标准**:
- EntityManager 支持 CRUD 操作
- SystemManager 支持优先级和更新循环
- SerializationService 支持 JSON 序列化
- 完整单元测试覆盖

### Phase 2-12: 核心组件和系统 ✅

详见各 Phase 的交付文档。

---

## Phase 13: Standalone Bundle（待开始）

**用户故事**: 作为开发者，我希望能够将游戏场景打包为独立的 Bundle，以便分发和加载。

### 需求 13.1: 资产引用收集

#### 验收标准

1. WHEN 用户请求打包场景 THEN 系统 SHALL 遍历所有实体并收集资产引用
2. WHEN 收集资产引用 THEN 系统 SHALL 包含所有 GLTF 模型、音频文件、HDR 环境贴图
3. WHEN 收集完成 THEN 系统 SHALL 生成资产清单（manifest.json）
4. WHEN 资产清单生成 THEN 系统 SHALL 包含资产的 UUID、类型、大小信息

### 需求 13.2: Bundle 打包

#### 验收标准

1. WHEN 用户触发打包 THEN 系统 SHALL 将场景数据和资产打包为单个文件
2. WHEN 打包过程中 THEN 系统 SHALL 显示进度条
3. WHEN 打包完成 THEN 系统 SHALL 生成 `.bundle` 文件
4. WHEN Bundle 文件生成 THEN 系统 SHALL 包含场景 JSON 和所有资产数据

### 需求 13.3: Bundle 加载

#### 验收标准

1. WHEN 用户加载 Bundle 文件 THEN 系统 SHALL 解析 manifest.json
2. WHEN 解析完成 THEN 系统 SHALL 依次加载所有资产
3. WHEN 资产加载完成 THEN 系统 SHALL 反序列化场景数据
4. WHEN 场景恢复完成 THEN 系统 SHALL 显示完整的游戏场景

### 需求 13.4: GLB 模型导出（整合自 v1.1.0）

**用户故事**: 作为 3D 创作者，我希望能够将编辑器中创建的角色和模型导出为 GLB 文件，以便在其他 3D 软件中使用。

#### 验收标准

1. WHEN 用户在角色编辑器模式下点击"导出 GLB"按钮 THEN 系统 SHALL 将当前角色导出为 GLB 文件
2. WHEN 用户在模型工坊模式下点击"导出 GLB"按钮 THEN 系统 SHALL 将当前模型导出为 GLB 文件
3. WHEN 导出过程开始 THEN 系统 SHALL 显示加载指示器
4. WHEN 导出完成 THEN 系统 SHALL 自动触发浏览器下载，文件名格式为 `{模型名称}_{时间戳}.glb`
5. WHEN 导出的 GLB 文件在 Blender 中打开 THEN 文件 SHALL 正确显示所有几何体、材质和颜色
6. WHEN 导出过程中发生错误 THEN 系统 SHALL 显示用户友好的错误提示
7. WHEN 导出的 GLB 文件大小超过 10MB THEN 系统 SHALL 警告用户文件过大

---

## Phase 14: Architecture Validation View（已完成 ✅）

**用户故事**: 作为制作人，我希望有一个专门的架构验证观测窗口，以便直观地看到 ECS 引擎的技术伟力。

### 需求 14.1: 导航入口激活

#### 验收标准

1. WHEN 用户点击 Sidebar 中的"架构验证"按钮 THEN 系统 SHALL 切换到 `AppMode.ARCHITECTURE_VALIDATOR` 模式
2. WHEN 进入架构验证模式 THEN 系统 SHALL 隐藏所有业务 UI
3. WHEN 进入架构验证模式 THEN 系统 SHALL 仅保留 R3F Canvas 和 ArchitectureValidationPanel
4. WHEN 退出架构验证模式 THEN 系统 SHALL 恢复之前的 UI 布局

### 需求 14.2: 自动场景初始化

#### 验收标准

1. WHEN 进入架构验证模式 THEN 系统 SHALL 自动创建独立的 ECS 实例
2. WHEN ECS 实例创建后 THEN 系统 SHALL 自动创建地形实体（50x50，100x100网格）
3. WHEN 地形创建完成 THEN 系统 SHALL 自动创建上帝视角相机（Orbit 模式，距离 100，俯仰 -60°）
4. WHEN 场景初始化完成 THEN 系统 SHALL 启动更新循环

### 需求 14.3: 实时性能监测

#### 验收标准

1. WHEN 进入架构验证模式 THEN 系统 SHALL 显示实时 FPS（使用 useRef 直接操作 DOM）
2. WHEN 地形渲染时 THEN 系统 SHALL 显示顶点数量
3. WHEN 植被渲染时 THEN 系统 SHALL 显示实例数量
4. WHEN 系统运行时 THEN 系统 SHALL 显示实体数量
5. WHEN 性能指标更新时 THEN 系统 SHALL 每秒刷新一次（FPS 除外）

### 需求 14.4: 控制接口

#### 验收标准

1. WHEN 用户点击"生成草地"按钮 THEN 系统 SHALL 生成 5000 棵草
2. WHEN 用户点击"创建山峰"按钮 THEN 系统 SHALL 在地形中心创建山峰
3. WHEN 用户点击"创建山谷"按钮 THEN 系统 SHALL 在地形中心创建山谷
4. WHEN 用户点击"一键演示"按钮 THEN 系统 SHALL 自动执行：山峰 → 植被 → 日落光影

### 需求 14.5: 全系统联动

#### 验收标准

1. WHEN 地形高度变化 THEN 植被 SHALL 自动对齐新高度
2. WHEN 设置日落时间 THEN WorldStateManager SHALL 更新光照强度和色温
3. WHEN 光照变化 THEN EngineBridge SHALL 自动更新太阳位置
4. WHEN 后期处理启用 THEN 系统 SHALL 显示 Bloom 辉光和 SMAA 抗锯齿

---

## Phase 15: MOD 扩展系统（待开始）

**用户故事**: 作为 MOD 开发者，我希望能够动态注册自定义组件和系统，以便扩展引擎功能。

### 需求 15.1: 动态组件注册

#### 验收标准

1. WHEN MOD 加载时 THEN 系统 SHALL 允许注册自定义组件类型
2. WHEN 组件注册完成 THEN 系统 SHALL 支持序列化和反序列化
3. WHEN 组件使用时 THEN 系统 SHALL 提供类型安全的访问接口

### 需求 15.2: 动态系统注册

#### 验收标准

1. WHEN MOD 加载时 THEN 系统 SHALL 允许注册自定义系统
2. WHEN 系统注册完成 THEN 系统 SHALL 按优先级插入更新循环
3. WHEN 系统运行时 THEN 系统 SHALL 提供完整的 ECS API 访问

---

## Phase 16: React 19 + R3F 优化（待开始）

**用户故事**: 作为开发者，我希望引擎能够充分利用 React 19 和 R3F 的最新特性，以便提升性能和开发体验。

### 需求 16.1: React 19 兼容性

#### 验收标准

1. WHEN 升级到 React 19 THEN 所有组件 SHALL 正常工作
2. WHEN 使用 React 19 新特性 THEN 系统 SHALL 提升渲染性能
3. WHEN 编译时 THEN 系统 SHALL 无警告和错误

### 需求 16.2: R3F 性能优化

#### 验收标准

1. WHEN 渲染大量实体 THEN 系统 SHALL 保持 60 FPS
2. WHEN 使用 GPU Instancing THEN 系统 SHALL 支持 10000+ 实例
3. WHEN 场景复杂度增加 THEN 系统 SHALL 自动降级渲染质量

---

## Phase 17: 最终集成优化（待开始）

**用户故事**: 作为用户，我希望引擎能够提供流畅的使用体验和稳定的性能表现。

### 需求 17.1: 性能优化

#### 验收标准

1. WHEN 应用启动 THEN 首屏加载时间 SHALL < 3 秒
2. WHEN 运行时 THEN 内存占用 SHALL < 500MB
3. WHEN 渲染时 THEN FPS SHALL ≥ 60（5000 棵草 + 10000 顶点地形）

### 需求 17.2: 稳定性优化

#### 验收标准

1. WHEN 长时间运行 THEN 系统 SHALL 无内存泄漏
2. WHEN 错误发生 THEN 系统 SHALL 优雅降级
3. WHEN 用户操作 THEN 系统 SHALL 提供即时反馈

---

## Phase 19: Camera Preset System 相机预设系统 ✅/⏳

**用户故事**: 作为游戏创作者，我希望能够快速切换不同游戏视角（暗黑/FPS/塞尔达/横板），并能对视角参数进行精细调节。

### 需求 19.1: 策略去硬编码与自由度释放
#### 验收标准
1. WHEN 在体验模式下 THEN 系统 SHALL 允许调节 Isometric 和 Sidescroll 的 Pitch/Yaw/Distance
2. THE SidescrollStrategy SHALL 引入球面坐标系，不再强制锁定 Z 轴
3. THE IsometricStrategy SHALL 默认俯仰角为 45°，但允许通过 UI 实时覆盖

### 需求 19.2: 模式隔离与状态保护
#### 验收标准
1. THE 预设系统 SHALL 绝对隔离：体验模式逻辑不得侵入创造模式（Orbit）
2. WHEN 角色被删除时 THEN 系统 SHALL 自动回退到 `iso` 安全视角（仅在体验模式）
3. WHEN 跨模式切换时 THEN 系统 SHALL 自动重置相机状态，确保零污染

### 需求 19.3: 防穿墙机制 (Pending ⏳)
#### 验收标准
1. THE CameraSystem SHALL 提供全局防穿墙检测能力
2. WHEN 相机与目标间存在障碍物时 THEN 系统 SHALL 自动缩短相机距离
3. THE 检测 SHALL 使用 Raycast，且支持 `enableCollision` 开关

---

## 非功能需求

### 性能要求

1. 首屏加载时间 < 3 秒
2. 运行时 FPS ≥ 60
3. 内存占用 < 500MB
4. 地形生成 < 1 秒
5. 植被生成（5000 实例）< 2 秒

### 可用性要求

1. 所有操作应有即时反馈（< 100ms）
2. 错误信息应清晰易懂
3. 支持键盘快捷键
4. 支持撤销/重做

### 兼容性要求

1. 支持 Chrome、Firefox、Safari、Edge 最新版
2. 支持 Windows、macOS、Linux
3. 支持触摸屏操作（移动端）

### 安全要求

1. 用户数据应加密存储
2. API 令牌应安全管理
3. 输入应验证和清理

---

## 验收测试

### 测试场景 1: 基本 ECS 操作

1. 创建实体
2. 添加组件
3. 注册系统
4. 运行更新循环
5. 验证：系统正常运行

### 测试场景 2: 架构验证视图

1. 点击"架构验证"按钮
2. 验证：自动显示地形和相机
3. 点击"生成草地"按钮
4. 验证：显示 5000 棵草
5. 验证：FPS ≥ 60

### 测试场景 3: GLB 导出

1. 创建角色模型
2. 点击"导出 GLB"按钮
3. 验证：下载 GLB 文件
4. 在 Blender 中打开
5. 验证：模型正确显示

---

## 附录

### 相关文档

- `PROGRESS_SUMMARY.md` - 进度总览
- `docs/design.md` - 设计文档
- `docs/tasks.md` - 任务清单
- 各 Phase 的交付报告（PHASE*_DELIVERY.md）

### 技术参考

- ECS 架构模式
- React 19 文档
- Three.js 文档
- Rapier 3D 文档
- Web Audio API 文档

---

**制作人**: _YUSHAN_  
**最后审计**: 2025-12-23
