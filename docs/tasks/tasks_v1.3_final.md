# PolyForge v1.3.0 - 最终阶段任务清单

**范围**: Phase 13-17 (分发系统、架构验证、MOD、React 19、最终优化)  
**最后更新**: 2025-12-23

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

## Phase 15: MOD 扩展系统 ⏳

- [ ] 15.1 实现动态组件注册
  - 创建 src/core/ModLoader.ts 文件
  - 实现 registerComponent() 方法
  - 实现组件类型验证
  - 实现序列化/反序列化支持
  - _需求: 15.1_

- [ ] 15.2 实现动态系统注册
  - 实现 registerSystem() 方法
  - 实现系统优先级插入
  - 实现系统生命周期管理
  - _需求: 15.2_

- [ ] 15.3 实现 MOD 加载器
  - 实现 MOD 文件解析
  - 实现 MOD 依赖检查
  - 实现 MOD 热重载
  - _需求: 15.1, 15.2_

- [ ] 15.4 创建 MOD 开发文档
  - 编写 MOD 开发指南
  - 提供示例 MOD
  - 提供 API 文档
  - _需求: 15.1, 15.2_

## Phase 16: React 19 + R3F 优化 ⏳

- [ ] 16.1 升级到 React 19
  - 更新 package.json 依赖
  - 修复兼容性问题
  - 测试所有组件
  - _需求: 16.1_

- [ ] 16.2 优化 R3F 渲染性能
  - 实现自动 LOD（Level of Detail）
  - 实现视锥剔除
  - 实现遮挡剔除
  - _需求: 16.2_

- [ ] 16.3 实现渲染质量自适应
  - 监控 FPS
  - 动态调整渲染质量
  - 动态调整阴影质量
  - _需求: 16.2_

## Phase 17: 最终集成优化 ⏳

- [ ] 17.1 性能优化
  - 优化首屏加载时间（< 3 秒）
  - 优化内存占用（< 500MB）
  - 优化运行时 FPS（≥ 60）
  - _需求: 17.1_

- [ ] 17.2 稳定性优化
  - 修复内存泄漏
  - 实现错误边界
  - 实现优雅降级
  - _需求: 17.2_

- [ ] 17.3 用户体验优化
  - 优化操作反馈（< 100ms）
  - 优化错误提示
  - 优化加载动画
  - _需求: 17.2_

- [ ] 17.4 文档完善
  - 更新 README.md
  - 更新 API 文档
  - 更新用户指南
  - _需求: 17.2_

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
**最后审计**: 2025-12-23
