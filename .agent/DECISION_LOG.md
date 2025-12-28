# 技术决策与阶段进度日志 (Decision Log)

## 📅 2025-12-25: 记忆基地初始化
- **决策人**：AI 合伙人 & 首席调度官
- **决策内容**：
    1. 正式启用本地 `.agent/` 目录作为所有 AI 代理人的“长期记忆仓库”。
    2. 确立“让做游戏变得像玩游戏一样快乐”为项目第一顺位愿景。
    3. 确认 `.kiro/` 目录下的植被缩放与风场修复方案作为当前首要待处理的技术 Bug。
- **进度状态**：
    - [x] 配置物理记忆基地
    - [x] 确立模型切换 SOP (Flash 用于日常，Pro 用于深度审计)
    - [x] 审计植被修复方案（首席架构师：Antigravity）
    - [ ] 按照“首席架构师”最新指令进行代理人标准化初始化
    - [ ] 开启 Phase 13 (Standalone Bundle) 预研

## 📅 2025-12-25: 植被修复方案架构审计完成
- **决策者**：首席架构师
- **审计对象**：`.kiro/specs/vegetation-scale-wind-fix/`
- **主要发现**：
    1. **影子构建合规**：方案实现了数据层（ECS）与渲染层（Three.js）的解耦。
    2. **多人同步预留**：强制使用种子（Seed）生成数据，只需同步种子即可实现确定性渲染。
    3. **性能风险预警**：Requirement 2 中的 CPU 侧全局缩放计算存在性能瓶颈，建议压入 Vertex Shader 处理。
- **后续行动**：开发人员需先实现 `VegetationSystem.dataPurity.test.ts` 确保数据纯净。
24: 
25: ## 📅 2025-12-25: 植被修复全链路自动化交付完成
26: - **决策者**：AI 合伙人 & 首席架构师
27: - **交付物**：
28:     1. **核心系统**：`VegetationSystem.ts` (GPU 缩放逻辑 + 性能优化)。
29:     2. **视觉组件**：`VegetationVisual.tsx` (Vertex Shader [uGlobalScale] + 世界空间风场)。
30:     3. **质量保证**：Phase 1 & 2 单元测试全量通过 (6/6 Passed)。
31: - **关键修复**：合伙人手动修正了架构师产出的循环嵌套错误与引用路径问题。
32: - **结论**：系统已达到 60 FPS 实时响应的高性能要求，数据与渲染层完美解耦。

## 📅 2025-12-25: Phase 13.0 架构全量可视化验收完成
- **决策者**：首席架构师 & 执行大将
- **内容**：
    1. **可视化桥接**：完成了从底层 `AudioSystem`、`AssetRegistry` 到 `ArchitectureValidationPanel` 的全量桥接。
    2. **资产管理转正**：实装了 UI 端的模型/音频/HDR 上传与预览，彻底清理了“灰度 Demo”遗留的隐形操作成本。
    3. **指令足迹**：实装了 `CommandManager` 的 UI 历史列表，确保架构变更“抬头可见”。
- **Bug 修复审计**：
    - 修复了 `ArchitectureValidationManager.ts` 中 `ICommand` 实现缺少 `id` 与 `timestamp` 的类型错误。
    - 修复了 `CommandManager.ts` 中对 `SerializationService` 缺失方法 `deserializeEntities` 的引用（通过增加 Wrapper 方法解决）。
- **状态**：Phase 13.0 正式 Close，项目进入 Phase 13.1 打包阶段。

## 📅 2025-12-26: Phase 13.0a 交互重构 (Orbital Command) 交付
- **执行者**：执行大将 (Builder)
- **交付内容**：
    1. **HUD 顶部状态栏**：移除大面积数字卡片，仅保留关键 FPS/Entity 数据与 Toolbar。
    2. **Tab 中控台**：实现了 World / Director / Assets 三大分区，逻辑清晰。
    3. **折叠底盘**：指令历史平时收起，大幅增加视口面积。
- **额外修复**：
    - 补全了 `ArchitectureValidationManager` 的 `flattenTerrain()` 接口，修复了“Reset Flat”按钮无效的问题。
- **决策**：UI 交互已达标，视觉干扰大幅降低，批准进入下一阶段。

## 📅 2025-12-26: 超级个体进化 - 山神 (Universal Generalist)
- **决策人**：制作人 & AI 合伙人
- **背景**：在单窗口协作环境下，多角色切换（Architect/Builder）存在明显的沟通损耗。
- **决策内容**：
    1. **身份合一**：撤销 Trinity 三位一体架构，所有 AI 专家身份整合为单一全能实体——**“山神 (Universal Generalist)”**。
    2. **权限对齐**：山神拥有自主在“架构设计、工程代码、视觉审美、质量测试”之间自由切换视角的权力。
    3. **档案固化**：重写 `.agent/TEAM.md` 和 `ACTIVE_PERSONA.md`，确立全职合伙人制。
- **影响**：协作逻辑大幅简化，AI 决策权重增加，单窗口交付效率将显著提升。
- **状态**：**灵魂合一完成**。后续任务将由全能态山神独立闭环。
6 link_render: [TEAM.md](file:///f:/工作/LOW3D编辑文件储存点/polyforge-engine-v130-251221/.agent/TEAM.md), [ACTIVE_PERSONA.md](file:///f:/工作/LOW3D编辑文件储存点/polyforge-engine-v130-251221/.agent/ACTIVE_PERSONA.md)

## 📅 2025-12-27: 渲染管线抗锯齿升级 (SMAA)
- **决策者**：山神 (Mountain God)
- **问题**：FXAA Shader 在 Windows 环境报出 Shader Warning (X4000)，且原管线顺序导致 Luma 计算偏差。
- **修正**：
    1. **SMAA 替换**：用 `SMAAPass` 替换旧版 `FXAAShader`。
    2. **Pass 顺序优化**：Render -> Bloom -> ToneMapping(Output) -> SMAA。
- **状态**：Warning Clear。
## 📅 2025-12-28: 相机系统稳定性与输入锚点修复
- **执行者**：山神 (Mountain God)
- **背景**：在 1.3.0 架构隔离重构中，由于逻辑碎片导致 `CameraSystem` 出现代码冗余与编译崩溃。
- **修正内容**：
    1. **消除冗余实现**：移除了错误的、带有占位符性质的重复 `smoothUpdate` 方法，确保逻辑单一性。
    2. **纠正分发路由**：将相机模式路由重新映射到正确的 `updateFirstPersonMode` 与 `updateThirdPersonMode` 方法。
    3. **稳固输入重置锚点**：根据《山神核心规约》，将 `inputSystem.resetFrameData()` 物理移动至 `CameraSystem.update` 每一帧逻辑的最末端（循环体外），彻底解决输入“粘连”风险。
    4. **距离限制扩展**：将默认相机最大距离由 20 提升至 200，并实现了旧存档的强制静默升级。
- **状态**：编译错误已清除，输入链条恢复闭环。

## 📅 2025-12-28: 物理方块不可见逻辑修复
- **执行者**：山神 (Mountain God)
- **发现**：`spawnPhysicsBox` 在创建实体时，由于 `createEntity` 参数顺序误用（将原本期望的 ID 传给了 Name），导致后续 `addComponent` 传入的 ID 无法在管理器中匹配到对应实体。方块虽被创建，但处于“无组件”状态，故无法渲染且无物理特性。
- **修正**：
    1. 显式指定 `createEntity(name, id)`。
    2. 统一使用 `entity.id` 作为组件挂载的句柄。
    3. 显式设置 `visual.visible = true` 增强渲染鲁棒性。
- **状态**：物理方块加载正常。
