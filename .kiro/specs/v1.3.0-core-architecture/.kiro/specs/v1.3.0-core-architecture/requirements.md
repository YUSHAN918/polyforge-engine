# PolyForge v1.3.0 核心架构升级 - 需求文档

## 简介

PolyForge v1.3.0 是一次重大的架构升级，目标是将现有的游戏编辑器转型为一个高度可扩展、模块化的游戏引擎。本次升级将引入 ECS（Entity-Component-System）架构模式、完善的命令系统、确定性时钟、以及全面的资产管线。所有设计必须支持本地化部署、MOD 扩展、以及未来的多人同步需求。

## 术语表

- **PolyForge**：本项目的游戏引擎名称
- **ECS**：Entity-Component-System，一种数据驱动的架构模式
- **Entity**：游戏世界中的基本对象单元，通过组件组合定义其行为
- **Component**：可附加到 Entity 的数据模块（如 Visual、Physics、Rig）
- **System**：处理特定类型 Component 的逻辑单元
- **Socket/Anchor**：实体间的挂点系统，用于层级嵌套与动态组装
- **Command**：支持撤销/重做的操作封装
- **AssetRegistry**：基于 IndexedDB 的资产注册与管理系统
- **TimeScale**：时间缩放系统，支持子弹时间与高倍速
- **WorldStateManager**：全局环境状态管理器（昼夜、天气等）
- **EffectComposer**：后期特效合成器
- **InputMappingSystem**：输入映射系统，支持多套控制预设
- **Draco**：Google 的 3D 模型压缩格式
- **HDR**：高动态范围图像格式
- **Rapier**：物理引擎接口
- **R3F**：React Three Fiber，React 的 Three.js 渲染库

## 需求

### 需求 1：ECS 数据中枢

**用户故事：** 作为引擎开发者，我希望采用 ECS 架构模式，以便实现高度解耦、可扩展的游戏对象系统。

#### 验收标准

1. WHEN 系统初始化 THEN PolyForge SHALL 创建 EntityManager 用于管理所有 Entity 的生命周期
2. WHEN 创建 Entity THEN PolyForge SHALL 分配唯一 ID 并支持组件的动态挂载与卸载
3. WHEN Entity 附加组件 THEN PolyForge SHALL 验证组件类型并将其注册到对应的 System
4. WHEN 序列化 Entity THEN PolyForge SHALL 将所有组件数据转换为 JSON 格式
5. WHEN 反序列化 Entity THEN PolyForge SHALL 从 JSON 数据重建 Entity 及其所有组件

### 需求 2：组件类型定义

**用户故事：** 作为引擎开发者，我希望定义标准化的组件类型，以便支持视觉、物理、骨骼、载具等多种游戏对象需求。

#### 验收标准

1. WHEN 定义 VisualComponent THEN PolyForge SHALL 包含 mesh、material、emissive（自发光）、postProcessing（后期接口）属性
2. WHEN 定义 RigComponent THEN PolyForge SHALL 支持 humanoid（人形）和 multiped（多足）骨骼树类型
3. WHEN 定义 PhysicsComponent THEN PolyForge SHALL 提供 Rapier 物理引擎的接口封装
4. WHEN 定义 VehicleComponent THEN PolyForge SHALL 预留载具逻辑的扩展接口
5. WHEN 组件包含嵌套数据 THEN PolyForge SHALL 确保所有数据类型可 JSON 序列化

### 需求 3：Socket/Anchor 挂点系统

**用户故事：** 作为内容创作者，我希望通过挂点系统实现 Entity 间的层级嵌套与动态组装，以便构建复杂的游戏对象（如角色装备、载具部件）。

#### 验收标准

1. WHEN Entity 定义 Socket THEN PolyForge SHALL 记录 Socket 的名称、位置、旋转、缩放信息
2. WHEN Entity A 附加到 Entity B 的 Socket THEN PolyForge SHALL 建立父子层级关系
3. WHEN 父 Entity 变换 THEN PolyForge SHALL 自动更新所有子 Entity 的世界坐标
4. WHEN 分离子 Entity THEN PolyForge SHALL 保持其当前世界坐标并解除父子关系
5. WHEN 序列化带 Socket 的 Entity THEN PolyForge SHALL 保存完整的层级结构信息

### 需求 4：InputMappingSystem 输入映射

**用户故事：** 作为用户，我希望使用符合直觉的输入控制，并能在多套预设间切换，以便适应不同的操作习惯。

#### 验收标准

1. WHEN 系统启动 THEN PolyForge SHALL 加载默认输入映射预设
2. WHEN 用户切换预设 THEN PolyForge SHALL 应用新的键位绑定并保存用户偏好
3. WHEN 检测到右键冲突 THEN PolyForge SHALL 根据上下文优先级处理输入事件
4. WHEN 用户按下 F 键 THEN PolyForge SHALL 聚焦到选中的对象
5. WHEN 用户按下 ESC 键 THEN PolyForge SHALL 执行全局返回操作（关闭面板或退出模式）
6. WHEN 用户自定义键位 THEN PolyForge SHALL 验证键位冲突并提示用户

### 需求 5：Command 命令系统

**用户故事：** 作为用户，我希望所有编辑操作支持撤销/重做，以便安全地进行实验性修改。

#### 验收标准

1. WHEN 用户执行编辑操作 THEN PolyForge SHALL 将操作封装为 Command 对象
2. WHEN Command 执行 THEN PolyForge SHALL 记录操作前的状态快照
3. WHEN 用户触发撤销 THEN PolyForge SHALL 调用 Command 的 undo 方法恢复状态
4. WHEN 用户触发重做 THEN PolyForge SHALL 调用 Command 的 redo 方法重新应用操作
5. WHEN Command 需要网络同步 THEN PolyForge SHALL 将 Command 序列化为 JSON 格式
6. WHEN 撤销栈达到上限 THEN PolyForge SHALL 移除最早的 Command 记录

### 需求 6：AssetRegistry 资产管线

**用户故事：** 作为内容创作者，我希望高效管理模型、音效、贴图等资产，并支持本地文件导入。

#### 验收标准

1. WHEN 系统初始化 THEN PolyForge SHALL 创建 IndexedDB 数据库用于资产存储
2. WHEN 导入模型资产 THEN PolyForge SHALL 使用 Draco 压缩格式存储
3. WHEN 导入音效资产 THEN PolyForge SHALL 验证音频格式并存储为 Blob
4. WHEN 导入 HDR 环境贴图 THEN PolyForge SHALL 解析 HDR 格式并生成预览缩略图
5. WHEN 查询资产 THEN PolyForge SHALL 根据分类（模型、音效、贴图）快速检索
6. WHEN 读取本地文件 THEN PolyForge SHALL 使用 File System Access API 访问用户文件系统
7. WHEN 资产被删除 THEN PolyForge SHALL 从 IndexedDB 中移除对应记录

### 需求 7：确定性时钟系统

**用户故事：** 作为开发者，我希望引入基于 TimeScale 的确定性时钟，以便支持子弹时间、高倍速验证等时间控制功能。

#### 验收标准

1. WHEN 系统初始化 THEN PolyForge SHALL 创建全局 Clock 对象管理游戏时间
2. WHEN 设置 TimeScale THEN PolyForge SHALL 按比例缩放所有时间相关的计算
3. WHEN TimeScale 为 0.5 THEN PolyForge SHALL 实现子弹时间效果（慢动作）
4. WHEN TimeScale 为 2.0 THEN PolyForge SHALL 实现高倍速效果（快进）
5. WHEN 暂停游戏 THEN PolyForge SHALL 将 TimeScale 设置为 0 并停止所有 System 更新
6. WHEN 恢复游戏 THEN PolyForge SHALL 恢复之前的 TimeScale 值

### 需求 8：WorldStateManager 全局环境

**用户故事：** 作为内容创作者，我希望管理昼夜、天气等全局环境参数，以便创建动态的游戏世界。

#### 验收标准

1. WHEN 系统初始化 THEN PolyForge SHALL 创建 WorldStateManager 管理全局环境状态
2. WHEN 设置时间参数 THEN PolyForge SHALL 更新光照方向和颜色以模拟昼夜变化
3. WHEN 设置天气参数 THEN PolyForge SHALL 触发对应的粒子效果（雨、雪、雾）
4. WHEN 环境状态改变 THEN PolyForge SHALL 通知所有订阅的 System 更新渲染
5. WHEN 序列化世界状态 THEN PolyForge SHALL 将环境参数保存为 JSON 格式

### 需求 9：EffectComposer 后期特效

**用户故事：** 作为视觉设计师，我希望在渲染管线中添加后期特效，以便提升画面表现力。

#### 验收标准

1. WHEN 系统初始化 THEN PolyForge SHALL 在 GameCanvas 顶层创建 EffectComposer 实例
2. WHEN 启用 Bloom 辉光 THEN PolyForge SHALL 对 emissive 材质应用辉光效果
3. WHEN 添加后期 Pass THEN PolyForge SHALL 按顺序执行所有 Pass 的渲染
4. WHEN 禁用后期特效 THEN PolyForge SHALL 回退到标准渲染管线
5. WHEN 调整特效参数 THEN PolyForge SHALL 实时更新渲染结果

### 需求 10：材质系统增强

**用户故事：** 作为视觉设计师，我希望材质系统支持自发光属性，以便创建发光物体和特效。

#### 验收标准

1. WHEN 创建材质 THEN PolyForge SHALL 支持 emissive 颜色和强度参数
2. WHEN 材质包含 emissive THEN PolyForge SHALL 在后期特效中识别并处理发光区域
3. WHEN 序列化材质 THEN PolyForge SHALL 保存 emissive 相关属性
4. WHEN 反序列化材质 THEN PolyForge SHALL 正确恢复 emissive 效果

### 需求 11：本地化与兼容性

**用户故事：** 作为部署工程师，我希望系统完全本地化运行，不依赖外部 CDN，并兼容 React 19 + R3F。

#### 验收标准

1. WHEN 系统启动 THEN PolyForge SHALL 仅从本地加载所有资源和依赖
2. WHEN 检测到 CDN 请求 THEN PolyForge SHALL 阻止请求并记录警告
3. WHEN 使用 React 19 特性 THEN PolyForge SHALL 确保所有组件兼容新版本 API
4. WHEN 使用 R3F THEN PolyForge SHALL 遵循 R3F 的最佳实践和生命周期管理
5. WHEN 构建生产版本 THEN PolyForge SHALL 将所有资源打包到本地输出目录

### 需求 12：AudioSystem 音频系统

**用户故事：** 作为音频设计师，我希望音频系统与全局时钟联动，并支持节奏游戏的 BPM 判定，以便创建动态音效和音乐互动。

#### 验收标准

1. WHEN TimeScale 改变 THEN PolyForge SHALL 按比例调整所有音频的播放速率
2. WHEN 设置 BPM 参数 THEN PolyForge SHALL 计算节拍间隔并创建节奏判定窗口
3. WHEN 节拍事件触发 THEN PolyForge SHALL 广播事件到所有订阅的 System
4. WHEN 音频资产加载 THEN PolyForge SHALL 解析音频元数据（时长、采样率、声道）
5. WHEN 播放 3D 音效 THEN PolyForge SHALL 根据 Entity 位置计算空间音频参数

### 需求 13：PhysicsSystem 物理系统

**用户故事：** 作为游戏开发者，我希望集成 Rapier 物理引擎，并支持角色控制器的平滑移动，以便实现真实的物理交互。

#### 验收标准

1. WHEN 系统初始化 THEN PolyForge SHALL 创建 Rapier World 并配置重力参数
2. WHEN Entity 附加 PhysicsComponent THEN PolyForge SHALL 在 Rapier World 中创建对应的刚体
3. WHEN 使用 Kinematic Character Controller THEN PolyForge SHALL 处理斜坡和台阶的平滑过渡
4. WHEN 角色移动到斜坡 THEN PolyForge SHALL 自动调整移动方向以贴合表面
5. WHEN 角色遇到台阶 THEN PolyForge SHALL 根据台阶高度阈值决定是否自动攀爬
6. WHEN 物理状态改变 THEN PolyForge SHALL 同步更新 Entity 的 Transform 组件

### 需求 14：Standalone Bundle 分发系统

**用户故事：** 作为内容创作者，我希望一键导出包含所有资产和状态的独立运行包，以便分发游戏或 MOD。

#### 验收标准

1. WHEN 用户触发导出 THEN PolyForge SHALL 收集所有使用的资产引用
2. WHEN 打包资产 THEN PolyForge SHALL 将模型、音效、贴图压缩为单一数据包
3. WHEN 打包状态 THEN PolyForge SHALL 序列化所有 Entity、Component 和 WorldState
4. WHEN 生成 Bundle THEN PolyForge SHALL 创建独立的 HTML 运行时入口
5. WHEN 加载 Bundle THEN PolyForge SHALL 反序列化所有数据并初始化游戏世界
6. WHEN Bundle 包含 MOD THEN PolyForge SHALL 自动注册 MOD 的扩展内容

### 需求 15：CameraSystem 相机系统

**用户故事：** 作为游戏设计师，我希望使用预设的相机模板，并支持视角间的平滑切换，以便适配不同的游戏类型。

#### 验收标准

1. WHEN 系统初始化 THEN PolyForge SHALL 加载预设相机模板（FPS、TPS、ARPG、Sidescroll）
2. WHEN 切换相机模式 THEN PolyForge SHALL 在 1 秒内平滑过渡到新视角
3. WHEN 使用 FPS 模式 THEN PolyForge SHALL 将相机附加到角色头部 Socket
4. WHEN 使用 TPS 模式 THEN PolyForge SHALL 在角色后方保持固定距离和高度
5. WHEN 使用 ARPG 模式 THEN PolyForge SHALL 使用等距视角并支持旋转
6. WHEN 使用 Sidescroll 模式 THEN PolyForge SHALL 锁定 Z 轴并跟随角色 X/Y 移动
7. WHEN 相机碰撞检测 THEN PolyForge SHALL 自动调整距离避免穿透障碍物

### 需求 16：模块解耦与扩展性

**用户故事：** 作为引擎开发者，我希望所有模块高度解耦，不为特定物种或玩法写死代码，以便支持 MOD 和未来扩展。

#### 验收标准

1. WHEN 定义 System THEN PolyForge SHALL 仅依赖 Component 接口而非具体实现
2. WHEN 添加新 Component 类型 THEN PolyForge SHALL 无需修改现有 System 代码
3. WHEN 加载 MOD THEN PolyForge SHALL 动态注册 MOD 提供的 Component 和 System
4. WHEN 移除 MOD THEN PolyForge SHALL 清理 MOD 注册的所有扩展
5. WHEN 代码引用具体物种或玩法 THEN PolyForge SHALL 通过配置文件或数据驱动实现
