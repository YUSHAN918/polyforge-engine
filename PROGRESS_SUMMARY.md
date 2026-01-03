# PolyForge v1.3.0 核心架构 - 进度总览

**最后更新**: 2026-01-03  
**当前版本**: v1.3.8  
**整体进度**: 22/22 阶段完成 (100%)

---

## 📚 文档导航

### 核心文档
- **[需求文档](./docs/requirements.md)** - 完整的功能需求和验收标准
- **[设计文档](./docs/design.md)** - 架构设计和技术方案
- **[AI 协作 SOP](./docs/SOP_AI_Collaboration.md)** - AI 协同开发标准操作流程

### 规划文档
- **[资产管线与功能完成性路线图](./.agent/PIPELINE_ROADMAP.md)** - 长期功能规划（Phase 21-29）
- **[路线图对比分析报告](./.agent/ROADMAP_ANALYSIS_20260103.md)** - 深度分析与优先级梳理

### 任务清单（分片）
- **[基础设施任务](./docs/tasks/tasks_infra.md)** - Phase 1-7（核心 ECS 至资产管线）
- **[核心功能任务](./docs/tasks/tasks_features.md)** - Phase 8-12（物理、音频、相机、环境、地形、植被、渲染）
- **[最终阶段任务](./docs/tasks/tasks_v1.3_final.md)** - Phase 13-17（分发系统、架构验证、MOD、React 19、最终优化）

### 历史归档
- **[Phase 交付报告](./docs/archive/reports/)** - 所有历史 Phase 交付文档和验证报告

---

## 📊 阶段完成状态

### 🎯 最新战果（2026-01-02）

- ✅ **创造模式性能会战 (Perf War)** - 修复点击地形/植被引发的 2 FPS 掉帧黑洞，实现 60 FPS 稳定交互
- ✅ **资产放置交互革新 (UX Refinement)** - 实现 Q/E/R 步进旋转、G 键抓取移动、W/S 高度微调及缩放加速度，大幅提升 3D 布局效率
- ✅ **物理坐标归一化 (Physics Normalization)** - 彻底解决非均匀缩放下的碰撞盒偏移漂移问题，实现“一套配置，多尺度复用”
- ✅ **图片资产三模态补全 (Image Modality System)** - 实现了 JPG/PNG 的纹理加载、物理拣选、双面可见及 Billboard/Standee 动态模态切换

- ✅ **植被架构分级更新** - 区分 Scale (重生成) 与 Wind (Shader Uniform)，拖动风力滑块零卡顿
- ✅ **全域植被同步** - 补全 `WorldStateManager` 植被字段，解决新生成植物与滑块不同步的隐形 Bug
- ✅ **IO 压力隔离** - 禁用地形规格调整时的自动重分布，由用户按需触发，防止极端场景 FPS 归零
- ✅ **第二代二进制打包引擎 (PFB v2)** - 彻底解决 OOM 崩溃，实现智能按需资产收集 (Smart Gathering)
- ✅ **原生二进制封装** - 弃用 Base64，文件体积与加载性能优化 70%
- ✅ **相机系统精准重心 (Phase 19 RE)** - 实装 2.0m 角色物理对齐与 0.15m 碰撞过滤，彻底解决入体与穿地 Bug
- ✅ **四元数物理同步 (Phys-Vis Sync)** - 实现 1:1 动态渲染映射，解决方块倾斜与抖动
- ✅ **相机自定义掌控权 (Phase 19)** - 释放 Isometric/Sidescroll 硬编码，UI 全量集成 Pitch/Yaw/Distance 滑块
- ✅ **启动健壮性修复** - 解决 AssetRegistry 初始化竞态引发的控制台报错
- ✅ **规格文档同步** - 将相机系统规格文档从 `.kiro` 归档至主 `docs/` 目录
- ✅ **体验模式优化完成** - 禁用无角色WASD移动，统一上帝视角镜头高度
- ✅ **UI状态同步闭环** - 建立500ms轮询机制，UI始终反映真实相机状态
- ✅ **模块切换自动重置** - 切回架构验证时自动重置到创造模式
- ✅ **状态污染修复** - dispose清理非持久化实体后再保存，防止相机锁死
- ✅ **交互逻辑隔离** - 双模式（创造/体验）完全物理隔离，零污染

| 阶段 | 名称 | 状态 | 完成日期 | 任务清单 | 交付文档 |
|------|------|------|----------|----------|----------|
| Phase 1 | 核心 ECS 基础设施 | ✅ 完成 | 2025-12 | [📋 任务](./docs/tasks/tasks_infra.md#phase-1-核心-ecs-基础设施-) | [PHASE1_DELIVERY.md](./PHASE1_DELIVERY.md) |
| Phase 2.1 | Visual & Rig 组件 | ✅ 完成 | 2025-12 | [📋 任务](./docs/tasks/tasks_infra.md#phase-2-核心组件实现-) | [PHASE2.1_DELIVERY.md](./PHASE2.1_DELIVERY.md) |
| Phase 2.2 | Physics, Vehicle & Audio | ✅ 完成 | 2025-12 | [📋 任务](./docs/tasks/tasks_infra.md#phase-2-核心组件实现-) | [PHASE2.2_DELIVERY.md](./PHASE2.2_DELIVERY.md) |
| Phase 3 | Socket/Anchor 系统 | ✅ 完成 | 2025-12-20 | [📋 任务](./docs/tasks/tasks_infra.md#phase-3-socketanchor-系统-) | [PHASE3_DELIVERY.md](./PHASE3_DELIVERY.md) |
| Phase 4 | Clock 时钟系统 | ✅ 完成 | 2025-12-20 | [📋 任务](./docs/tasks/tasks_infra.md#phase-4-clock-时钟系统-) | [PHASE4_DELIVERY.md](./PHASE4_DELIVERY.md) |
| Phase 5 | CommandManager 命令系统 | ✅ 完成 | 2025-12-20 | [📋 任务](./docs/tasks/tasks_infra.md#phase-5-commandmanager-命令系统-) | [PHASE5_DELIVERY.md](./PHASE5_DELIVERY.md) |
| Phase 6 | InputMappingSystem | ✅ 完成 | 2025-12-21 | [📋 任务](./docs/tasks/tasks_infra.md#phase-6-inputmappingsystem-输入系统-) | [PHASE6_DELIVERY.md](./PHASE6_DELIVERY.md) |
| Phase 7 | AssetRegistry | ✅ 完成 | 2025-12-21 | [📋 任务](./docs/tasks/tasks_infra.md#phase-7-assetregistry-资产管线-) | [PHASE7_COMPLETION_REPORT.md](./PHASE7_COMPLETION_REPORT.md) |
| Phase 8 | PhysicsSystem | ✅ 完成 | 2025-12-21 | [📋 任务](./docs/tasks/tasks_features.md#phase-8-physicssystem-物理系统-) | [PHASE8_DELIVERY.md](./PHASE8_DELIVERY.md) |
| Phase 9 | AudioSystem | ✅ 完成 | 2025-12-22 | [📋 任务](./docs/tasks/tasks_features.md#phase-9-audiosystem-音频系统-) | [PHASE9_DELIVERY.md](./PHASE9_DELIVERY.md) |
| Phase 10 | CameraSystem | ✅ 完成 | 2025-12-21 | [📋 任务](./docs/tasks/tasks_features.md#phase-10-camerasystem-相机系统-) | [PHASE10_DELIVERY.md](./PHASE10_DELIVERY.md) |
| Phase 11 | WorldStateManager | ✅ 完成 | 2025-12-22 | [📋 任务](./docs/tasks/tasks_features.md#phase-11-worldstatemanager-环境管理-) | [PHASE11_DELIVERY.md](./PHASE11_DELIVERY.md) |
| Phase 11.2 | TerrainSystem | ✅ 完成 | 2025-12-22 | [📋 任务](./docs/tasks/tasks_features.md#phase-112-terrainsystem-动态地形引擎-) | [PHASE11.2_TERRAIN_DELIVERY.md](./PHASE11.2_TERRAIN_DELIVERY.md) |
| Phase 11.3 | VegetationSystem | ✅ 完成 | 2025-12-22 | [📋 任务](./docs/tasks/tasks_features.md#phase-113-vegetationsystem-植被引擎-) | [PHASE11.3_VEGETATION_DELIVERY.md](./PHASE11.3_VEGETATION_DELIVERY.md) |
| Phase 12 | RenderSystem | ✅ 完成 | 2025-12-22 | [📋 任务](./docs/tasks/tasks_features.md#phase-12-rendersystem-渲染系统-) | [PHASE12_FINAL_AUDIT.md](./PHASE12_FINAL_AUDIT.md) |
| Phase 13.0 | 架构全量可视化 (Visibility) | ✅ 完成 | 2025-12-26 | [📋 任务](./docs/tasks/tasks_v1.3_final.md) | 线框可视化与控制面板实装 |
| Phase 13.1-3 | Standalone Bundle (PFB v2) | ✅ 完成 | 2026-01-01 | [📋 任务](./docs/tasks/tasks_v1.3_final.md) | 二进制引擎 + 引用修复 |
| Phase 14 | Architecture Validation View | ✅ 完成 | 2025-12-26 | [📋 任务](./docs/tasks/tasks_v1.3_final.md#phase-14-architecture-validation-view-架构验证观测窗口-) | 含 14.6 强化补丁 |
| Phase 15 | 体验模式深化 | ✅ 完成 | 2025-12-29 | [📋 任务](./docs/tasks/tasks_v1.3_final.md#phase-15-character-control--gameplay-experience-角色与操控体验-) | 角色控制与相机优化 (15.1-15.4) |
| Phase 17 | 体验模式交互完善 | ✅ 完成 | 2025-12-29 | [📋 任务](./docs/tasks/tasks_v1.3_final.md#phase-17-experience-mode-polish--ui-state-sync) | UI状态同步与模块清理 |
| Phase 16 | MOD 扩展系统 | ⏳ 待开始 | - | [📋 任务](./docs/tasks/tasks_v1.3_final.md#phase-16-mod-扩展系统-) | - |
| Phase 18 | 最终集成优化 | ✅ 完成 | 2025-12-30 | [📋 任务](./docs/tasks/tasks_v1.3_final.md#phase-18-最终集成优化-) | [Walkthrough](./.agent/walkthrough.md) |
| Phase 19 | 相机预设系统 | ✅ 完成 | 2025-12-31 | [📋 任务](./docs/tasks/tasks_v1.3_final.md#phase-19-camera-preset-system-相机预设系统-) | [Walkthrough](./.agent/walkthrough.md) |
| Phase 20 | React 19 + R3F 优化 | ⏳ 待开始 | - | [📋 任务](./docs/tasks/tasks_v1.3_final.md#phase-20-react-19--r3f-优化-) | - |
| Phase 21 | Shadow System Hardening | ✅ 完成 | 2025-12-31 | [📋 任务](./docs/tasks/tasks_v1.3_final.md#phase-21-shadow-system-hardening-阴影系统加固-native-pcf--asa-) | - |
| Phase 22 | 性能优化会战 | ✅ 完成 | 2026-01-02 | [📋 任务](./docs/tasks/tasks_v1.3_final.md#phase-22-performance-optimization-war-性能优化会战-) | [Decision Log](.agent/DECISION_LOG.md) |
| Phase 23 | 音频 UI 联通修复 | ✅ 完成 | 2026-01-03 | [📋 任务](./docs/tasks/tasks_v1.3_final.md#phase-23-音频-ui-联通修复--p0) | 音频系统 UI 集成 |

---

## 🎯 已完成功能清单

### ✅ Phase 1: 核心 ECS 基础设施
- Entity 和 Component 基础类型
- EntityManager（CRUD + 层级管理）
- SystemManager（优先级 + 更新循环）
- SerializationService（JSON 序列化）
- 完整单元测试套件

### ✅ Phase 2: 核心组件实现
- **TransformComponent** - 位置、旋转、缩放
- **VisualComponent** - 几何体、材质、自发光
- **RigComponent** - 骨骼树、约束系统
- **PhysicsComponent** - 刚体、碰撞体
- **VehicleComponent** - 轮子、引擎、悬挂
- **AudioSourceComponent** - 音频资产、空间音频

### ✅ Phase 3: Socket/Anchor 系统
- **TransformComponent 升级** - 4x4 矩阵、脏标记
- **HierarchySystem** - 层级深度排序、世界矩阵更新
- **Socket 系统** - attachToSocket、detachFromSocket
- **层级变换传播** - 父变换自动传播到子实体
- 完整单元测试（5 个测试套件）

### ✅ Phase 4: Clock 时钟系统
- **Clock 类** - 时间追踪、TimeScale、暂停/恢复
- **SystemManager 集成** - 自动调用 clock.tick()
- **TimeScale 回调** - 音频系统等可监听变化
- **FPS 计算** - 实时帧率监控
- 完整单元测试（5 个测试套件）

### ✅ Phase 5: CommandManager 命令系统
- **CommandManager** - 撤销/重做栈管理
- **CreateEntityCommand** - 创建实体命令
- **DeleteEntityCommand** - 删除实体命令（智能快照恢复）
- **ModifyComponentCommand** - 修改组件属性命令
- **AttachToSocketCommand** - Socket 附加命令
- 完整单元测试（6 个测试套件）

### ✅ Phase 6: InputMappingSystem 输入系统
- **InputSystem** - 全局键盘/鼠标事件监听
- **InputAction 映射** - 按键到动作的映射系统
- **多套预设** - default, blender, game 预设
- **上下文栈** - 支持输入上下文切换
- **Command 集成** - Ctrl+Z/Y 自动撤销/重做
- 完整演示（方向键移动方块）

### ✅ Phase 7: AssetRegistry 资产管线
- **IndexedDBStorage** - 原生 IndexedDB 封装（v2，含指纹表）
- **ModelImporter** - GLB/GLTF 导入 + Draco 压缩
- **AudioImporter** - MP3/WAV/OGG 导入 + 元数据解析
- **HDRImporter** - HDR 环境贴图 + PMREMGenerator
- **AssetRegistry** - 单例注册表 + 三层缓存 + 内容去重
- **FileSystemService** - 本地文件夹扫描 + 批量导入
- **集成测试** - 15 个测试（100% 通过）

### ✅ Phase 8: PhysicsSystem 物理系统
- **Rapier 3D 集成** - 高性能物理引擎
- **刚体管理** - Static, Dynamic, Kinematic
- **碰撞体管理** - Box, Sphere, Capsule, Cylinder
- **双向同步** - 物理 ↔ Transform 自动同步
- **重力控制** - 可配置重力向量
- **Vite WASM 支持** - 配置 WASM 插件
- 完整演示（自由落体和碰撞）

### ✅ Phase 10: CameraSystem 相机系统
- **CameraComponent** - 5 种相机模式支持
- **CameraSystem** - 平滑插值和跟随
- **多模态切换** - Orbit, FirstPerson, ThirdPerson, Isometric, Sidescroll
- **快照系统** - 配置保存和恢复
- **轴锁定** - 支持特定轴向锁定
- **预设系统** - 4 个预设快照
- 完整演示（第三人称跟随、横版卷轴、等距视角）

### ✅ Phase 9: AudioSystem 音频系统
- **AudioSystem** - Web Audio API 集成
- **3D 空间音频** - HRTF + 距离衰减
- **TimeScale 联动** - pitch × timeScale 实时计算
- **音源节点池** - 避免重复创建，防止内存泄漏
- **AudioListener 同步** - 自动跟随相机位置和朝向
- **浏览器交互解锁** - 自动 resume AudioContext
- 完整演示（发光小球环绕运动 + 空间音频）

### ✅ Phase 11: WorldStateManager 环境管理
- **WorldStateManager** - 全局环境状态管理器
- **昼夜循环系统** - 自动更新光照强度和色温
- **色温转换算法** - Kelvin to RGB（1000K-20000K）
- **全场景存档** - 实体 + 环境状态一键保存
- **LocalStorage 持久化** - 刷新页面后恢复
- **节拍脉冲接口** - 预留与 AudioSystem 联动
- 完整演示（昼夜交替 + 存档/恢复）

### ⏳ Phase 11.2: TerrainSystem 动态地形引擎（100% 完成 ✅）
- **TerrainComponent** - Float32Array 高度数据 + 序列化（150 行）
- **TerrainSystem** - 核心地壳引擎（300+ 行）
- **笔刷引擎（The God Hand）** - radius, strength, hardness
- **modifyHeight() 接口** - 世界坐标 → 网格坐标 + 衰减计算
- **射线检测定位** - raycastTerrain() + 双线性插值
- **局部顶点更新优化** - 脏区域追踪，确保 60FPS
- **工具函数集** - resetTerrain, generateRandomTerrain
- **terrainDemo** - 15+ 控制接口（250+ 行）
- ✅ **TerrainVisual.tsx** - R3F 渲染集成（150+ 行）
- ✅ **鼠标交互编辑** - 左键抬高，右键降低，滚轮调整笔刷
- ✅ **标准化全局控制器** - terrainControls, worldControls, renderControls

### ✅ Phase 11.3: VegetationSystem 植被引擎（100% 完成 ✅）
- **VegetationComponent** - 植被配置组件（密度、类型、种子）（150 行）
- **VegetationSystem** - GPU Instancing 高性能渲染（300+ 行）
- **空间采样逻辑** - 实时读取 TerrainComponent heightMap
- **地形高度对齐** - 双线性插值自动对齐
- **塞尔达式风场 Shader** - 顶点着色器摆动（sin + 噪声）
- **VegetationVisual.tsx** - R3F InstancedMesh 渲染（200+ 行）
- **vegetationDemo** - 交互式演示（200+ 行）
- ✅ **window.vegetationControls** - 上帝指令接口
- ✅ **编译错误修复** - 修复 9 个 TypeScript 错误
- ✅ **全局挂载** - vegetationDemo 和 vegetationControls 正确挂载

### ✅ Phase 12: RenderSystem 渲染系统
- **EngineBridge** - ECS 到 R3F 的桥接层（350+ 行）
- **实体层级映射** - 1:1 映射到 R3F 场景
- **VisualComponent 集成** - 基础几何体 + GLTF 模型
- **HDR 环境贴图** - 自动加载和应用（HDRLoader）
- **塞尔达式光影** - 太阳位置随时间动态更新
- **材质响应式** - 自动响应 WorldState 变化
- **PostProcessing** - 电影级后处理管线（120 行）
- **UnrealBloomPass** - 电影级辉光效果
- **SMAAPass** - 边缘抗锯齿
- **自发光联动** - emissiveIntensity 触发辉光
- **React.memo 优化** - 避免不必要的重渲染
- 完整演示（金属反射 + 辉光效果 + 后处理控制）

### ✅ Phase 14: Architecture Validation View 架构验证观测窗口
- **ArchitectureValidationManager** - 独立 ECS 实例管理器（300+ 行）
- **自动场景初始化** - 地形 + 上帝视角相机
- **ArchitectureValidationPanel** - 实时性能监测面板（200+ 行）
- **FPS 实时统计** - 使用 useRef 直接操作 DOM（高频更新）
- **顶点/植被数统计** - 实时显示地形和植被数据
- **一键演示功能** - 山峰 + 植被 + 日落光影自动演示
- **上帝视角相机** - Orbit 模式，距离 100，俯仰 -60°
- **控制接口** - 地形编辑、植被生成、环境控制
- **全系统联动** - 相机、环境、渲染、地形、植被完美闭环
- 完整演示（架构验证视口落地，实现 FPS/顶点/植被数实时统计）
- ✅ **编译修复 (12-28)** - 修复 `import.meta.env` 及 `Physics/Vegetation` API 调用错误
- ✅ **API 对齐 (12-28)** - 补全 `IArchitectureFacade` 缺失的 Getter
- ✅ **UI 本地化 (12-28)** - 观测窗口全中文界面实装

### ✅ Phase 13: 二进制 PFB 场景分发系统 (v1.3.6)
- **13.1 智能资产收集** - 精准抓取 Entity/WorldState 依赖
- **13.2 自定义二进制 PFB** - [PFB!] Magic Header + ArrayBuffer 封装
- **13.3 ID 强力恢复** - `forceRegisterAsset` 确保 UUID 链条不中断
- **13.4 日志降噪机制** - 归并 Asset Skip 提示，防止 UI 阻塞
- _完成日期: 2026-01-01_

### ✅ Phase 15: 体验模式深化与交互完善
**Phase 15.1-15.4: 角色与相机机制重构**
- ✅ **相机三态逻辑 (Tri-State Layout)** - Spawn (生成) → Unbind (释放/God View) → Bind (锁定/Combat View)
- ✅ **万能控制 (Universal Control)** - WASD 始终控制角色，无论相机处于何种模式
- ✅ **上帝视角铁律 (Strict ISO)** - ISO 模式严禁旋转，解绑后变为可平移的上帝视角
- ✅ **物理同步修复 (Physics Sync)** - 修复 PhysicsSystem 脏标记缺失导致的镜头跟随失效
- ✅ **交互校正** - 修正旋转反向、移除右键冲突、优化 FPS/TPS 逻辑

**Phase 17: 体验模式交互完善与UI状态同步**
- ✅ **输入污染清理** - 禁用无角色时的WASD移动（双重修复：CameraSystem + IsometricStrategy）
- ✅ **镜头高度统一** - 上帝视角初始高度统一为100，与角色删除后保持一致
- ✅ **UI自动同步** - 500ms轮询相机模式，UI始终反映真实状态
- ✅ **模块切换重置** - App层自动重置 + Manager层清理，双重保险
- [x] 17.5 状态持久化优化 (State Persistence Fix)
  - [x] dispose前清理非持久化实体
  - [x] 防止保存包含角色的脏状态
  - [x] 修复相机锁死Bug（恢复脏状态导致）
  - [x] 确保localStorage只保存干净状态
  - _完成日期: 2025-12-29_

### ✅ Phase 18: 视觉特化与工业级阴影架构 (Creation Polishing)
- **18.1 植被投影同步** - CustomDepthMaterial 解决缩放/风动投影错位
- **18.2 Orbit 电影级变焦** - 禁用自适应阻尼，实现线性物理惯性推拉
- **18.3 动态阴影跟随** - CSM Level 0 核心实现，光照焦点实时吸附相机中心
- **18.4 无限世界支持** - 解决大地图边缘投影切分问题
- _完成日期: 2025-12-30_

### ✅ Phase 19: 相机自定义掌控权 (Experience Camera Freedom)
- ✅ **策略解耦** - 释放 Isometric/Sidescroll 硬编码角度，支持全球面坐标系映射
- ✅ **指令系统扩展** - SET_CAMERA_PITCH/YAW/DISTANCE 全链路打通
- ✅ **UI 面板集成** - Gameplay 栏目上线 Pitch/Yaw/Distance 三向控制滑块
- ✅ **启动性能修复** - 消除 AssetRegistry 初始化竞态带来的控制台红色警告
- ✅ **精度重建 (RE)** - 实现四元数同步，2.0m 角色胶囊体对齐，0.15m 碰撞门槛
- _完成日期: 2025-12-31_

---

## 🔧 核心架构特性

### 性能优势
- ✅ **O(1) 组件查询** - 基于 Map 的高效索引
- ✅ **零告警编译** - TypeScript 严格模式
- ✅ **深度嵌套序列化** - 支持完整层级结构
- ✅ **脏标记优化** - 仅更新变化的变换
- ✅ **TimeScale 支持** - 慢动作、快进效果

### 架构设计
- ✅ **影子构建策略** - 所有新代码在 `src/core/`
- ✅ **组件化设计** - 高内聚、低耦合
- ✅ **系统优先级** - 可控的更新顺序
- ✅ **层级管理** - 父子关系、Socket 挂点
- ✅ **时间管理** - 统一的时钟系统
- ✅ **输入系统** - 键位映射、上下文栈
- ✅ **物理引擎** - Rapier 3D 集成

### 测试覆盖
- ✅ **EntityManager.test.ts** - 实体生命周期测试
- ✅ **Hierarchy.test.ts** - 层级系统测试（5 个套件）
- ✅ **Clock.test.ts** - 时钟系统测试（5 个套件）
- ✅ **演示场景** - demo, visualDemo, vehicleDemo, hierarchyDemo, clockDemo

---

## 📁 核心文件结构

```
src/core/
├── types.ts                          # 核心类型定义
├── Entity.ts                         # Entity 实体类
├── EntityManager.ts                  # EntityManager 管理器
├── SystemManager.ts                  # SystemManager 系统管理器
├── SerializationService.ts           # 序列化服务
├── Clock.ts                          # ⭐ Clock 时钟系统
├── CommandManager.ts                 # ⭐ 命令管理器
├── WorldStateManager.ts              # ⭐ 环境状态管理器
├── index.ts                          # 模块导出
│
├── components/
│   ├── TransformComponent.ts         # ⭐ 升级：4x4 矩阵 + 脏标记
│   ├── VisualComponent.ts            # 视觉组件
│   ├── RigComponent.ts               # 骨骼组件
│   ├── PhysicsComponent.ts           # 物理组件
│   ├── VehicleComponent.ts           # 载具组件
│   ├── AudioSourceComponent.ts       # 音频组件
│   └── NameComponent.ts              # 名称组件
│
├── systems/
│   ├── HierarchySystem.ts            # ⭐ 层级系统
│   ├── InputSystem.ts                # ⭐ 输入系统
│   ├── PhysicsSystem.ts              # ⭐ 物理系统
│   ├── CameraSystem.ts               # ⭐ 相机系统
│   └── AudioSystem.ts                # ⭐ 音频系统
│
├── __tests__/
│   ├── EntityManager.test.ts         # EntityManager 测试
│   ├── Hierarchy.test.ts             # ⭐ 层级系统测试
│   ├── Clock.test.ts                 # ⭐ 时钟系统测试
│   └── Command.test.ts               # ⭐ 命令系统测试
│
└── demos/
    ├── demo.ts                       # 基础演示
    ├── quickDemo.ts                  # 快速演示
    ├── systemDemo.ts                 # 系统演示
    ├── serializationDemo.ts          # 序列化演示
    ├── visualDemo.ts                 # 视觉组件演示
    ├── vehicleDemo.ts                # 载具演示
    ├── hierarchyDemo.ts              # ⭐ 层级系统演示
    ├── clockDemo.ts                  # ⭐ 时钟系统演示
    ├── commandDemo.ts                # ⭐ 命令系统演示
    ├── inputDemo.ts                  # ⭐ 输入系统演示
    ├── physicsDemo.ts                # ⭐ 物理系统演示
    ├── cameraDemo.ts                 # ⭐ 相机系统演示
    └── demos/
        ├── audioDemo.ts              # ⭐ 音频系统演示
        ├── worldStateDemo.ts         # ⭐ 环境管理演示
        └── renderDemo.ts             # ⭐ 渲染系统演示
```

---

## 🎮 交互式演示

在浏览器控制台中运行：

```javascript
// 运行所有测试
window.runPolyForgeTests();

// 运行演示
window.quickDemo();           // 快速演示
window.visualDemo();          // 光剑战士演示
window.vehicleDemo();         // 飞行载具演示
window.hierarchyDemo();       // 层级系统演示
window.clockDemo();           // ⭐ 时钟系统演示

// ⭐ 时钟控制（Phase 4 新增）
window.setSpeed(0.5);         // 设置半速
window.setSpeed(2.0);         // 设置两倍速
window.pauseGame();           // 暂停游戏
window.resumeGame();          // 恢复游戏
window.togglePause();         // 切换暂停状态
window.getClockStatus();      // 获取时钟状态

// ⭐ 命令控制（Phase 5 新增）
window.commandDemo();         // 运行命令系统演示
window.spawnBox();            // 创建一个新立方体
window.moveBox(5, 3, -2);     // 移动最后一个立方体
window.deleteLastBox();       // 删除最后一个立方体
window.undoLast();            // 撤销上一个命令
window.redoLast();            // 重做上一个命令
window.showHistory();         // 显示命令历史
window.clearHistory();        // 清空所有历史

// ⭐ 输入控制（Phase 6 新增）
window.inputDemo();           // 运行输入系统演示（方向键移动方块）

// ⭐ 相机控制（Phase 10 新增）
await window.cameraDemo();           // 运行相机系统演示
window.switchCameraMode('thirdPerson'); // 切换相机模式
window.applyCameraPreset('sidescroll'); // 应用预设
window.getCameraSnapshot();          // 获取相机快照
window.moveCameraTarget(5,3,0);      // 移动跟随目标
window.rotateCameraView(-30,45);     // 旋转相机视角
window.setCameraDistance(10);        // 设置相机距离
window.showCameraStatus();           // 显示相机状态

// ⭐ 音频控制（Phase 9 新增）
await window.audioDemo();            // 运行音频系统演示
window.audioDemoControls.setTimeScale(0.5);  // 慢动作（音频变慢）
window.audioDemoControls.setVolume(0.5);     // 设置音量
window.audioDemoControls.setPitch(1.5);      // 设置音调
window.audioDemoControls.toggleLoop();       // 切换循环
window.audioDemoControls.setMasterVolume(0.5); // 主音量
window.audioDemoControls.getStats();         // 查看统计

// ⭐ 环境管理（Phase 11 新增）
await window.worldStateDemo();       // 运行环境管理演示
window.worldStateControls.setTimeOfDay(18);  // 设置时间（18:00）
window.worldStateControls.setDayDuration(30); // 设置一天时长（30秒）
window.worldStateControls.toggleDayNightCycle(); // 切换昼夜循环
window.worldStateControls.setLightIntensity(0.5); // 设置光照强度
window.worldStateControls.getState();        // 查看当前状态
window.worldStateControls.debug();           // 调试信息
window.worldStateControls.saveSnapshot();    // 保存全场景快照
window.worldStateControls.loadSnapshot();    // 加载快照
window.worldStateControls.clearSnapshot();   // 清除快照

// ⭐ 地形引擎（Phase 11.2 新增）
await window.terrainDemo();          // 运行地形系统演示
window.terrainDemoControls.setBrushRadius(5);   // 设置笔刷半径
window.terrainDemoControls.setBrushStrength(0.2); // 设置笔刷强度
window.terrainDemoControls.setBrushHardness(0.8); // 设置笔刷硬度
window.terrainDemoControls.getBrush();          // 查看笔刷配置
window.terrainDemoControls.raise(5, 5);         // 抬高指定位置
window.terrainDemoControls.lower(-5, -5);       // 降低指定位置
window.terrainDemoControls.flatten();           // 重置为平坦
window.terrainDemoControls.randomize(10);       // 生成随机地形
window.terrainDemoControls.createMountain();    // 创建一座山
window.terrainDemoControls.createValley();      // 创建一个山谷
window.terrainDemoControls.getTerrainInfo();    // 查看地形信息
window.terrainDemoControls.getHeightAt(0, 0);   // 查看指定位置高度
window.terrainDemoControls.listEntities();      // 列出所有实体

// ⭐ 植被引擎（Phase 11.3 新增）
await window.vegetationDemo();          // 运行植被系统演示
window.vegetationControls.spawnGrass(5000);    // 生成 5000 棵草
window.vegetationControls.spawnFlowers(1000);  // 生成 1000 朵花
window.vegetationControls.clearVegetation();   // 清除所有植被
window.vegetationControls.createMountain();    // 创建山峰（草会自动对齐）
window.vegetationControls.createValley();      // 创建山谷
window.vegetationControls.flattenTerrain();    // 重置为平坦
window.vegetationControls.getInfo();           // 查看植被信息
window.vegetationControls.listEntities();      // 列出所有实体

// ⭐ 渲染系统（Phase 12 新增）
await window.renderDemo();           // 运行渲染系统演示
window.renderDemoControls.setTimeOfDay(18);  // 设置时间（18:00 日落）
window.renderDemoControls.setDayDuration(60); // 设置一天时长（60秒）
window.renderDemoControls.toggleDayNightCycle(); // 切换昼夜循环
window.renderDemoControls.setLightIntensity(0.5); // 设置光照强度
window.renderDemoControls.getState();        // 查看当前状态
window.renderDemoControls.debug();           // 调试信息
window.renderDemoControls.listEntities();    // 列出所有实体
window.renderDemoControls.listAssets();      // 列出所有资产
// ⭐ 后处理控制（Phase 12 新增）
window.renderDemoControls.togglePostProcessing(); // 切换后处理
window.renderDemoControls.toggleBloom();     // 切换辉光效果
window.renderDemoControls.setBloomStrength(2.0); // 设置辉光强度
window.renderDemoControls.setBloomThreshold(0.5); // 设置辉光阈值
window.renderDemoControls.toggleSMAA();      // 切换抗锯齿
window.renderDemoControls.getPostProcessingSettings(); // 查看后处理设置
```

---

## 🚀 下一步计划

### 推荐顺序

1. **Phase 13: Standalone Bundle** - 分发系统
   - 资产引用收集
   - Bundle 打包
   - Bundle 加载

### 可选顺序

- **Phase 14: MOD 扩展系统** - 动态组件/系统注册
- **Phase 15: React 19 + R3F 优化** - 性能优化和兼容性

---

## 📊 统计数据

### 代码量
- **核心代码**: ~14000 行（+500 行 ArchitectureValidationManager + ArchitectureValidationPanel）
- **测试代码**: ~1800 行
- **演示代码**: ~5450 行
- **总计**: ~21250 行

### 组件数量
- **核心组件**: 10 个（Transform, Visual, Rig, Physics, Vehicle, Audio, Name, Camera, **Terrain**, **Vegetation**）
- **核心系统**: 9 个（HierarchySystem, InputSystem, PhysicsSystem, CameraSystem, AudioSystem, Clock, CommandManager, **TerrainSystem**, **VegetationSystem**）
- **环境管理**: 1 个（WorldStateManager）
- **渲染系统**: 2 个（EngineBridge, PostProcessing）
- **资产系统**: 7 个（IndexedDBStorage, AssetRegistry, ModelImporter, AudioImporter, HDRImporter, FileSystemService）
- **架构验证**: 2 个（ArchitectureValidationManager, ArchitectureValidationPanel）
- **测试套件**: 18 个（含 AssetPipeline 15 个测试）

### 测试覆盖
- **单元测试**: 17 个测试套件
- **演示场景**: 15 个（新增 terrainDemo）
- **测试状态**: 全部通过 ✅

---

## 🎯 核心优势总结

1. **高性能 ECS** - O(1) 查询，零开销设计
2. **完整层级系统** - 父子关系、Socket 挂点、世界矩阵
3. **统一时间管理** - TimeScale、暂停、FPS 监控
4. **撤销/重做系统** - 完整的命令模式实现
5. **全场景存档** - 实体 + 环境状态一键保存/恢复
6. **类型安全** - TypeScript 严格模式，零告警
7. **测试驱动** - 完整的单元测试和演示场景
8. **影子构建** - 不影响现有代码，平滑迁移

---

## 📝 备注

- 所有代码遵循 TypeScript 严格模式
- 所有测试通过，无编译错误
- 所有演示可在浏览器控制台交互运行
- 遵循 EARS 模式和 INCOSE 质量规则


---

## 🚨 架构经验总结 (2025-12-27)

### Phase 14.6: 影子架构的红线（Shadow Architecture Redline）

**问题复盘**:
在修复后处理 UI 同步问题时，一度尝试在宿主层 (`App.tsx`) 同步影子引擎的状态 (`WorldState`)，导致了数据源冲突和隐蔽的 UI 重置 Bug。

**核心教训**:
1.  **绝对隔离**: 宿主层 (`App.tsx`) **严禁**直接管理影子引擎 (`ArchitectureValidationManager`) 的内部状态。
2.  **单一数据源**: `WorldStateManager` 必须是环境参数的唯一真理来源 (Single Source of Truth)。
3.  **桥接原则**: `EngineBridge` 应当是一个自治的观察者，直接订阅 `WorldStateManager`，而不是依赖宿主传递 Props。
4.  **UI 绑定**: 影子引擎的调试 UI (`ArchitectureValidationPanel`) 应直接绑定到 Manager，绕过 React 的 Props Drilling。

**修正结果**:
移除了 `App.tsx` 中所有关于 `bloomStrength`, `grassColor` 等状态的 State，恢复了架构的纯洁性。系统现在更加健壮，UI 交互不再受宿主重绘干扰。

---


## 📦 历史归档

所有历史 Phase 交付报告和验证文档已归档：**[点击查看存档报告](./docs/archive/reports/)**

---

## 🔮 未来规划 (Phase 23-35)

> **相关文档**: [资产管线与功能完成性路线图](./.agent/PIPELINE_ROADMAP.md)  
> **深度分析**: [路线图对比分析报告](./.agent/ROADMAP_ANALYSIS_20260103.md)

### 优先级说明

- **P0** - 紧急修复（1-2 周）
- **P1** - 核心功能补全（1-2 月）
- **P2** - 动画系统（2-3 月）
- **P3** - 视觉增强（2-3 月）
- **P4** - 编辑器增强（3-4 月）
- **P5** - 生态整合（后期）

---

### P0 - 紧急修复（1-2 周）

#### Phase 23: 音频 UI 联通修复
**状态**: ⚠️ P0 紧急  
**工作量**: 2-3 天  
**依赖**: Phase 9 AudioSystem

**核心任务**:
- [ ] 修复顶部 TEMPO 滑块 + 播放按钮绑定到 AudioSystem
- [ ] 修复资产库音频缩略图预览播放
- [ ] 实现点击即听功能

**验收标准**:
- WHEN 用户点击音频资产 THEN 系统 SHALL 播放音频预览
- WHEN 用户调整 TEMPO 滑块 THEN 系统 SHALL 实时调整播放速度

---

### P1 - 核心功能补全（1-2 月）

#### Phase 24: 模型资产库 UI
**状态**: 📋 待开发  
**工作量**: 1-2 周  
**依赖**: Phase 7 AssetRegistry

**核心任务**:
- [ ] 实现模型资产分类导航
- [ ] 实现网格预览功能
- [ ] 实现拖拽放置功能
- [ ] 实现资产搜索和过滤

**验收标准**:
- WHEN 用户打开资产库 THEN 系统 SHALL 显示所有已导入模型
- WHEN 用户拖拽模型 THEN 系统 SHALL 在场景中放置模型

---

#### Phase 25: LOD 自动生成
**状态**: 📋 待开发  
**工作量**: 1-2 周  
**依赖**: Phase 7 ModelImporter

**核心任务**:
- [ ] 集成 meshoptimizer (WASM)
- [ ] 实现多级 LOD 自动生成
- [ ] 实现相机距离动态切换
- [ ] 实现 LOD 配置 UI

**验收标准**:
- WHEN 用户导入高模 THEN 系统 SHALL 自动生成 3 级 LOD
- WHEN 相机距离变化 THEN 系统 SHALL 自动切换 LOD 级别

---

### P2 - 动画系统（2-3 月）

#### Phase 26: 动画管线 (Animation Pipeline)
**状态**: 📋 待规划  
**工作量**: 2-3 周  
**依赖**: Phase 7 ModelImporter

**核心任务**:
- [ ] 26.1 AnimationComponent - 动画数据组件
- [ ] 26.2 AnimationSystem - 动画更新系统
- [ ] 26.3 EngineBridge AnimationMixer 桥接
- [ ] 26.4 UI 动画选择器
- [ ] 26.5 帧级事件系统
- [ ] 26.6 多生物骨骼支持（人形/四足/多足）
- [ ] 26.7 程序化动画 Additive Layer

**验收标准**:
- WHEN 用户导入带动画的 GLB THEN 系统 SHALL 自动提取所有动画
- WHEN 用户播放动画 THEN 系统 SHALL 平滑播放并支持混合
- WHEN 动画播放到特定帧 THEN 系统 SHALL 触发帧事件

---

#### Phase 27: 2D 动画管线 (2D Animation)
**状态**: 📋 待规划  
**工作量**: 2-3 周  
**依赖**: Phase 26 动画管线

**核心任务**:
- [ ] 27.1 SpriteSequenceComponent - 序列帧数据结构
- [ ] 27.2 PNG 文件夹导入 + 自动打包
- [ ] 27.3 Sprite Sheet 导入（指定行列）
- [ ] 27.4 EngineBridge UV 偏移播放
- [ ] 27.5 资产库集成 + 拖拽预览
- [ ] 27.6 Spine 资产导入（spine-threejs）
- [ ] 27.7 定格/流畅模式切换
- [ ] 27.8 骨骼动画 → 序列帧导出

**验收标准**:
- WHEN 用户导入 PNG 序列 THEN 系统 SHALL 自动打包为 Sprite Sheet
- WHEN 用户导入 Spine 资产 THEN 系统 SHALL 拖入即可播放
- WHEN 用户切换定格模式 THEN 系统 SHALL 只在关键帧跳变

---

#### Phase 27.5: 节奏-事件管线 (Rhythm-Event)
**状态**: 📋 待规划  
**工作量**: 1-2 周  
**依赖**: Phase 26 动画管线 + Phase 9 AudioSystem

**核心任务**:
- [ ] 动画帧事件触发
- [ ] RhythmClock (AudioWorklet 高精度时钟)
- [ ] BeatMap 节拍图数据结构
- [ ] 节拍编辑器 UI

**验收标准**:
- WHEN 动画播放到特定帧 THEN 系统 SHALL 触发事件
- WHEN 音乐播放到节拍点 THEN 系统 SHALL 触发节拍事件
- WHEN 用户编辑节拍图 THEN 系统 SHALL 可视化显示节拍点

---

#### Phase 28: 碰撞体分层管线 (Collision Layers)
**状态**: 📋 待规划  
**工作量**: 1-2 周  
**依赖**: Phase 26 动画管线

**核心任务**:
- [ ] 攻击判定碰撞体（Box/Sphere）
- [ ] 骨骼绑定碰撞体
- [ ] 精确碰撞（Convex/Trimesh）
- [ ] 碰撞层级配置 UI

**验收标准**:
- WHEN 用户创建攻击判定 THEN 系统 SHALL 绑定到骨骼
- WHEN 攻击判定碰撞 THEN 系统 SHALL 触发伤害事件

---

### P3 - 视觉增强（2-3 月）

#### Phase 29: VFX 特效管线 (VFX Pipeline)
**状态**: 📋 待规划  
**工作量**: 3-4 周  
**依赖**: Phase 26 动画管线

**核心任务**:
- [ ] ParticleEmitterComponent - 粒子发射器组件
- [ ] ParticleSystem - GPU Particles 系统
- [ ] ParticleMaterial - 粒子材质
- [ ] 2D 序列帧轨道（Billboard 渲染）
- [ ] VFX 编辑器 UI

**验收标准**:
- WHEN 用户创建粒子发射器 THEN 系统 SHALL 使用 GPU Instancing 渲染
- WHEN 粒子数量超过 10000 THEN 系统 SHALL 保持 60 FPS

---

#### Phase 30: 大世界渲染管线 (Large World)
**状态**: 📋 待规划  
**工作量**: 3-4 周  
**依赖**: Phase 11.2 TerrainSystem

**核心任务**:
- [ ] 大气散射 Shader（Rayleigh/Mie）
- [ ] 距离雾 + 天空渐变
- [ ] 地形 Chunk 分块（动态加载卸载）
- [ ] Billboard 远景优化
- [ ] 程序化生态分布

**验收标准**:
- WHEN 地图规模超过 1km THEN 系统 SHALL 自动分块加载
- WHEN 相机移动 THEN 系统 SHALL 动态加载/卸载 Chunk
- WHEN 远处物体 THEN 系统 SHALL 使用 Billboard 渲染

---

### P4 - 编辑器增强（3-4 月）

#### Phase 31: UI 编辑器管线 (UI Editor)
**状态**: 📋 待规划  
**工作量**: 4-6 周  
**依赖**: 无

**核心任务**:
- [ ] 31.1 Dockable Layout MVP（2-3 周）
- [ ] 31.2 Theme Engine（1-2 周）
- [ ] 31.3 Schema-Driven Components（3-4 周）
- [ ] 31.4 Visual UI Editor（4-6 周）
- [ ] 31.5 Binding System（2-3 周）
- [ ] 31.6 Game HUD Builder（4-6 周）

**验收标准**:
- WHEN 用户拖拽面板 THEN 系统 SHALL 支持自由布局
- WHEN 用户创建 UI 组件 THEN 系统 SHALL 自动绑定到 WorldState
- WHEN 用户切换主题 THEN 系统 SHALL 实时更新所有 UI

---

#### Phase 32: 模型编辑管线 (Model Editing)
**状态**: 📋 待规划  
**工作量**: 3-4 周  
**依赖**: Phase 7 AssetRegistry

**核心任务**:
- [ ] 32.1 布尔运算集成（three-bvh-csg）
- [ ] 32.2 合并选中物体 + 删内面
- [ ] 32.3 减面工具（SimplifyModifier）
- [ ] 32.4 一键封装导出 GLB
- [ ] 32.5 模型雕刻笔刷（基础）
- [ ] 32.6 补洞/修复工具

**验收标准**:
- WHEN 用户选中多个物体 THEN 系统 SHALL 支持布尔运算（合并/相减）
- WHEN 用户导出模型 THEN 系统 SHALL 自动减面并封装为 GLB

---

### P5 - 生态整合（后期）

#### Phase 33: MOD 扩展系统
**状态**: ⏳ 待开始  
**工作量**: 2-3 周  
**依赖**: 无

**核心任务**:
- [ ] 动态组件注册
- [ ] 动态系统注册
- [ ] 热重载机制
- [ ] MOD 管理 UI

---

#### Phase 34: React 19 + R3F 优化
**状态**: ⏳ 待开始  
**工作量**: 1-2 周  
**依赖**: 无

**核心任务**:
- [ ] React 19 升级
- [ ] R3F 性能优化
- [ ] 兼容性测试

---

#### Phase 35: 旧版工坊打通（大和龙）
**状态**: 📋 待规划  
**工作量**: 4-6 周  
**依赖**: Phase 26-32 全部完成

**核心任务**:
- [ ] 英雄大厅桥接
- [ ] 装备库迁移
- [ ] 动画工坊桥接
- [ ] 程序化参数桥接
- [ ] 特效库评估

---

#### Phase 36: 导演/影视管线 (Director)
**状态**: 📋 待规划  
**工作量**: 3-4 周  
**依赖**: Phase 29 VFX + Phase 31 UI Editor

**核心任务**:
- [ ] 时间轴编辑器
- [ ] 相机轨道动画
- [ ] AI 高光录制
- [ ] 视频导出

---

## 📊 未来规划统计

### Phase 分布
- **P0 紧急修复**: 1 个 Phase（Phase 23）
- **P1 核心功能**: 2 个 Phase（Phase 24-25）
- **P2 动画系统**: 4 个 Phase（Phase 26-28 + 27.5）
- **P3 视觉增强**: 2 个 Phase（Phase 29-30）
- **P4 编辑器增强**: 2 个 Phase（Phase 31-32）
- **P5 生态整合**: 3 个 Phase（Phase 33-36）

### 预计工作量
- **短期（1-2 月）**: Phase 23-25（P0-P1）
- **中期（2-4 月）**: Phase 26-30（P2-P3）
- **长期（4-8 月）**: Phase 31-36（P4-P5）

---

**制作人**: _YUSHAN_  
**最后更新**: 2026-01-03  
**下一步**: 执行 Phase 23（音频 UI 联通修复）
