# PolyForge v1.3.0 - 最终阶段任务清单

**范围**: Phase 13-17 (分发系统、架构验证、体验模式深化、MOD、最终优化)  
**最后更新**: 2025-12-31

---

## Phase 13: Standalone Bundle 分发系统 ⏳

### 13.1 资产引用收集

- [ ] 13.1.1 实现资产引用遍历器
  - 遍历所有实体
  - 收集 VisualComponent 中的 GLTF 模型引用
  - 收集 AudioSourceComponent 中的音频文件引用
  - 收集 WorldStateManager 中的 HDR 环境贴图引用
  - _需求: 13.1_

- [ ] 13.1.2 生成资产清单（manifest.json）
  - 包含资产的 UUID、类型、大小信息
  - 包含资产的依赖关系
  - 包含资产的元数据（名称、描述、标签）
  - _需求: 13.1_

### 13.2 Bundle 打包

- [ ] 13.2.1 实现 BundleBuilder 类
  - 创建 src/core/BundleBuilder.ts 文件
  - 实现 pack() 方法
  - 实现进度回调接口
  - _需求: 13.2_

- [ ] 13.2.2 实现场景序列化
  - 序列化所有实体和组件
  - 序列化 WorldStateManager 状态
  - 序列化 CameraSystem 配置
  - _需求: 13.2_

- [ ] 13.2.3 实现资产打包
  - 将所有资产数据打包为 ArrayBuffer
  - 实现压缩（可选）
  - 生成 .bundle 文件
  - _需求: 13.2_

- [ ] 13.2.4 添加打包进度 UI
  - 在 UI 中显示打包进度条
  - 显示当前正在打包的资产名称
  - 显示打包完成提示
  - _需求: 13.2_

### 13.3 Bundle 加载

- [ ] 13.3.1 实现 BundleLoader 类
  - 创建 src/core/BundleLoader.ts 文件
  - 实现 load() 方法
  - 实现进度回调接口
  - _需求: 13.3_

- [ ] 13.3.2 实现 manifest 解析
  - 解析 manifest.json
  - 验证资产完整性
  - 构建资产依赖图
  - _需求: 13.3_

- [ ] 13.3.3 实现资产加载
  - 按依赖顺序加载资产
  - 注册到 AssetRegistry
  - 更新加载进度
  - _需求: 13.3_

- [ ] 13.3.4 实现场景恢复
  - 反序列化实体和组件
  - 恢复 WorldStateManager 状态
  - 恢复 CameraSystem 配置
  - _需求: 13.3_

### 13.4 GLB 模型导出（整合自 v1.1.0）

- [ ] 13.4.1 创建导出服务模块
  - 创建 services/exportService.ts 文件
  - 实现 ModelExportService 类
  - 导入 Three.js 和 GLTFExporter
  - 定义 ExportOptions 和 ExportResult 接口
  - _需求: 13.4_

- [ ] 13.4.2 实现 GLB 导出核心逻辑
  - 实现 exportToGLB() 方法
  - 配置 GLTFExporter 默认选项（binary: true, maxTextureSize: 2048）
  - 使用 Promise 包装 GLTFExporter.parse() 回调
  - 添加错误捕获和处理
  - _需求: 13.4_

- [ ] 13.4.3 实现文件下载功能
  - 实现 downloadGLB() 方法
  - 创建 Blob 对象和 URL
  - 触发浏览器下载
  - 清理临时 URL
  - _需求: 13.4_

- [ ] 13.4.4 实现文件名生成逻辑
  - 实现 generateFilename() 方法
  - 添加时间戳格式化
  - 清理特殊字符，保留中文
  - 生成格式：{模型名称}_{时间戳}.glb
  - _需求: 13.4_

- [ ] 13.4.5 添加文件大小检查
  - 检查导出的 ArrayBuffer 大小
  - 定义 MAX_FILE_SIZE 常量（10MB）
  - 返回文件大小信息
  - 显示警告（如果文件过大）
  - _需求: 13.4_

- [ ] 13.4.6 在 EditorPanel 添加导出按钮
  - 在编辑面板底部添加"导出 GLB"按钮
  - 添加导出图标（fa-file-export）
  - 设置按钮样式（绿色主题）
  - _需求: 13.4_

- [ ] 13.4.7 实现角色导出处理逻辑
  - 在 App.tsx 中添加 handleExportCharacter 函数
  - 创建 ModelExportService 实例
  - 获取 Character3D 的场景引用
  - 调用 exportToGLB() 方法
  - 生成文件名（使用角色名称）
  - _需求: 13.4_

- [ ] 13.4.8 添加导出状态管理
  - 添加 isExporting 状态
  - 导出开始时设置为 true，禁用按钮
  - 导出结束时设置为 false，启用按钮
  - 显示加载指示器
  - _需求: 13.4_

- [ ] 13.4.9 添加导出结果提示
  - 成功时显示绿色提示"导出成功"
  - 失败时显示红色提示"导出失败：{错误信息}"
  - 提示 2 秒后自动消失
  - 文件过大时显示黄色警告
  - _需求: 13.4_

## Phase 14: Architecture Validation View 架构验证观测窗口 ✅

- [x] 14.1 实现 ArchitectureValidationManager（ECS 实例生命周期管理）
  - 创建 src/core/ArchitectureValidationManager.ts 文件
  - 初始化独立的 ECS 核心系统（EntityManager, SystemManager, WorldStateManager, Clock）
  - 注册组件（Transform, Visual, Terrain, Vegetation, Camera）
  - 创建系统（TerrainSystem, VegetationSystem, CameraSystem）
  - 自动创建地形实体（50x50，100x100网格）
  - 自动创建上帝视角相机（Orbit模式，距离100，俯仰-60°）
  - 实现更新循环（update方法）
  - 实现控制接口（spawnVegetation, createMountain, createValley, setSunsetTime）
  - 实现统计接口（getStats）
  - 实现系统访问器（getEntityManager, getWorldStateManager, getTerrainSystem, getVegetationSystem）
  - _完成日期: 2025-12-23_

- [x] 14.2 实现 ArchitectureValidationPanel（UI 性能监测面板）
  - 创建 src/components/ArchitectureValidationPanel.tsx 文件
  - 实现实时统计信息显示（实体数、FPS、顶点数、植被实例数）
  - 使用 useRef 直接操作 DOM 实现高频 FPS 更新
  - 实现控制按钮（生成草地、创建山峰、创建山谷）
  - 实现一键演示功能（山峰 + 植被 + 日落光影）
  - 实现精美的 UI 布局（Header + Stats + Controls）
  - _完成日期: 2025-12-23_

- [x] 14.3 实现上帝视角相机切换（Orbit 模式强插）
  - 在 ArchitectureValidationManager 中自动创建 CameraEntity
  - 配置为 Orbit 模式
  - 设置距离 100，俯仰 -60°
  - 锁定地形中心
  - _完成日期: 2025-12-23_

- [x] 14.4 实现一键演示脚本（地形生成/植被铺设/日落演示）
  - 实现 createMountain() 方法（地形隆起）
  - 实现 spawnVegetation(density) 方法（植被生成）
  - 实现 setSunsetTime() 方法（日落光影）
  - 实现一键演示按钮（自动执行：山峰 → 植被 → 日落）
  - _完成日期: 2025-12-23_

- [x] 14.5 实现控制台全局 API 导出（window.worldControls 等）
  - 导出 ArchitectureValidationManager 到 src/core/index.ts
  - 在 App.tsx 中集成管理器
  - 添加 useEffect 监听 AppMode.ARCHITECTURE_VALIDATOR 模式切换
  - 创建管理器实例并启动更新循环
  - 传递 archValidationManager prop 到 GameCanvas
  - 条件渲染 ArchitectureValidationPanel
  - 修改 GameCanvas.tsx 添加条件渲染 EngineBridge
  - _完成日期: 2025-12-23_

- [x] 14.6 架构验证面板功能强化 (Gap Filling)
  - [x] **相机系统**：实现模式切换器（Orbit/FP/TP/Isometric）与 FOV 实时滑块。
  - [x] **渲染系统**：实现 SMAA 抗锯齿开关与曝光度 (Exposure) 调节。
  - [x] **物理系统**：实现 Debug Collider 连线显示与“物理大爆炸”冲力测试。
  - [x] **音频系统**：实现音源空间位置可视化（Wireframe Sphere）与 Engine Unlock 交互。
  - [x] **植被系统**：增加“生成鲜花”功能，完善生态多样性验证。
  - _完成日期: 2025-12-26_

## Phase 15: Character Control & Gameplay Experience 角色与操控体验 ✅

- [x] 15.1 实现独立角色生成与删除 (Spawn/Despawn)
  - 核心指令注入：`SPAWN_CHARACTER`, `DESPAWN_CHARACTER`
  - 物理刚体自动化绑定（Capsule Collider）
  - 实现生命周期原子操作：Entity Destruction -> Physics Cleanup -> Camera Unlink
  - _完成日期: 2025-12-28_

- [x] 15.2 实现通用 WASD 物理驱动 (Universal WASD)
  - 相机与角色控制逻辑物理隔离
  - 支持 FPS/TPS 基于视线方向的位移
  - **屏幕空间对齐 (W-UP Fix)**：无论相机如何旋转，W垂直向上，校正数学偏移
  - 向量标准化 (Normalization)：修复斜向移动速度过快问题
  - _完成日期: 2025-12-28_

- [x] 15.3 实现飞行模式逻辑 (Flight Mode)
  - 动态切换物理计算模式（禁用重力，增加线性阻力）
  - **升空反馈 (Auto-Lift)**：开启瞬间提供 Y 轴脉冲位移
  - UI 实时状态联动 (Toggle UI)
  - _完成日期: 2025-12-28_

- [x] 15.4 等距视角相机深度优化 (Isometric Follow)
  - 实现俯瞰视角 (`Pitch 45, Yaw 45`) 下的丝滑跟随
  - 同步视角与控制坐标系，解决方向乱扣问题
  - _完成日期: 2025-12-28_

## Phase 17: Experience Mode Polish & UI State Sync 体验模式交互完善与UI状态同步 ✅

- [x] 17.1 输入污染清理 (Input Pollution Fix)
  - [x] 禁用无角色时的WASD相机移动（CameraSystem修复）
  - [x] 禁用IsometricStrategy中的Legacy Fallback逻辑
  - [x] 防止角色生成位置偏移（pivot污染修复）
  - _完成日期: 2025-12-29_

- [x] 17.2 镜头高度标准化 (Camera Height Unification)
  - [x] 统一上帝视角初始高度为100
  - [x] 与角色删除后的默认高度保持一致
  - [x] setCameraMode中强制设置distance参数
  - _完成日期: 2025-12-29_

- [x] 17.3 UI状态自动同步机制 (UI State Auto-Sync)
  - [x] 在ArchitectureValidationPanel同步循环中添加相机模式获取
  - [x] 500ms轮询获取真实相机模式
  - [x] 单一数据源：CameraSystem.getMode()
  - [x] 确保UI始终反映真实状态
  - _完成日期: 2025-12-29_

- [x] 17.4 模块切换自动重置 (Module Switch Auto-Reset)
  - [x] App.tsx进入架构验证时自动重置到创造模式
  - [x] 50ms延迟dispatch SET_CAMERA_MODE命令
  - [x] Manager层切换到orbit时自动删除角色
  - [x] 双重保险：离开清理 + 进入重置
  - _完成日期: 2025-12-29_

- [x] 17.5 状态持久化优化 (State Persistence Fix)
  - [x] dispose前清理非持久化实体
  - [x] 防止保存包含角色的脏状态
  - [x] 修复相机锁死Bug（恢复脏状态导致）
  - [x] 确保localStorage只保存干净状态
  - _完成日期: 2025-12-29_

## Phase 16: MOD 扩展系统 ⏳

- [ ] 16.1 实现动态组件注册
  - 创建 src/core/ModLoader.ts 文件
  - 实现 registerComponent() 方法
  - 实现组件类型验证
  - 实现序列化/反序列化支持
  - _需求: 15.1_

- [ ] 16.2 实现动态系统注册
  - 实现 registerSystem() 方法
  - 实现系统优先级插入
  - 实现系统生命周期管理
  - _需求: 15.2_

- [ ] 16.3 实现 MOD 加载器
  - 实现 MOD 文件解析
  - 实现 MOD 依赖检查
  - 实现 MOD 热重载
  - _需求: 15.1, 15.2_

- [ ] 16.4 创建 MOD 开发文档
  - 编写 MOD 开发指南
  - 提供示例 MOD
  - 提供 API 文档
  - _需求: 15.1, 15.2_

## Phase 18: 最终集成优化 (视觉特化) ✅

- [x] 18.1 性能与视觉优化
  - [x] **植被投影修复**: CustomDepthMaterial 解决缩放投影不同步
  - [x] **动态阴影架构**: 影随人动 (Dynamic Shadow Focus)
  - [x] **无限世界支持**: 解决大地图边缘阴影切分
  - _完成日期: 2025-12-30_

- [x] 18.2 稳定性优化
  - [x] **Orbit 变焦优化**: 禁用自适应阻尼，消除瞬移感
  - [x] **Shadow Bias**: 优化 `-0.0005` 偏置，无伪影
  - _完成日期: 2025-12-30_

- [ ] 18.3 用户体验优化
  - 优化操作反馈（< 100ms）
  - 优化错误提示
  - 优化加载动画
  - _需求: 17.2_

- [ ] 18.4 文档完善
  - 更新 README.md
  - 更新 API 文档
  - 更新用户指南
  - _需求: 17.2_

## Phase 19: Camera Preset System 相机预设系统 ✅/⏳

- [x] 19.1 核心策略重构与自由度释放 ✅
  - [x] 重构 CameraStrategy 解除硬编码 (Isometric/Sidescroll)
  - [x] 实现全球面坐标系投影逻辑
  - _完成日期: 2025-12-31_

- [x] 19.2 指令系统扩展与 UI 集成 ✅
  - [x] 扩展 EngineCommand 支持 Pitch/Yaw/Distance
  - [x] UI 栏目上线三向控制滑块 (Gameplay Config)
  - [x] 修复 AssetRegistry 初始化竞态引发的报错
  - _完成日期: 2025-12-31_

- [x] 19.3 机制修复与优化 (体验反馈) ✅
  - [x] 修复 TPS 视角跟随偏移问题
  - [x] 修复 FPS 删除角色后的 1 帧回退时机
  - [x] 统一 ISO 初始高度与回退高度为 100
  - _完成日期: 2025-12-31_

- [ ] 19.4 防穿墙机制实现 ⏳
  - [ ] 在 CameraSystem 中实现 Raycast 碰撞检测
  - [ ] 实现场景几何体（地形+实体）自动过滤
  - [ ] 支持平滑推拉逻辑 (Spring Arm Like)
  - [ ] 暴露 `enableCollision` 开关

## Phase 20: React 19 + R3F 优化 ⏳

- [ ] 19.1 升级到 React 19
  - 更新 package.json 依赖
  - 修复兼容性问题
  - 测试所有组件
  - _需求: 18.1_

- [ ] 19.2 优化 R3F 渲染性能
  - 实现自动 LOD（Level of Detail）
  - 实现视锥剔除
  - 实现遮挡剔除
  - _需求: 18.2_

- [ ] 19.3 实现渲染质量自适应
  - 监控 FPS
  - 动态调整渲染质量
  - 动态调整阴影质量
  - 动态调整阴影质量
  - _需求: 18.2_

## Phase 21: Shadow System Hardening 阴影系统加固 (Native PCF + ASA) ✅

- [x] 21.1 回归原生 PCF 软阴影 (Native PCF Revert)
  - **决策**: 弃用 `SoftShadows` (PCSS) 以消除噪点与 Shader 警告
  - **实现**: 强制 `shadows="soft"`
  - **校准**: 4096 高清贴图配合 ASA 逻辑

- [x] 21.2 阴影控制参数大暴力校准 (Aggressive Calibration)
  - **Opacity Fix**: 补光灯 (HemisphereLight) 强度校准为 5.0x 以抗衡 HDR
  - **Blur Strategy**: 放弃无效的 Radius 乘数，依赖原生 PCF 采样
  - **Tint Visibility**: 确保在低不透明度下阴影颜色倾向可见

- [x] 21.3 ASA 自适应阴影适配器 (Logic Finalization)
  - **核心公式**: `Range = Clamp(Dist * 1.5, 150, 600)`
  - **效果**: 近处 150m 高精锁定，远处 600m 范围保护
  - **Bias**: 优化为 `-0.00002` 消除偏置伪影


---

## 检查点

- [ ] 最终验证
  - 确保所有测试通过
  - 验证所有需求已实现
  - 检查代码质量和注释
  - 验证部署成功且可访问
  - 用户测试反馈收集

---

**制作人**: YUSHAN  
**最后审计**: 2025-12-29
