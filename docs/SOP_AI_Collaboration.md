# 🤖 PolyForge AI 协作开发大统一 SOP (v2.0)

**版本**: v2.0  
**最后更新**: 2025-12-23  
**核心精神**: "Rich Architect, Poor Builder, Ordered Sharding"

---

## 1. 👥 核心身份体系 (The Trinity)

我们采用"三位一体"协作模型，明确决策、设计与执行的边界：

### 制作人 (Producer - 我)
- **职责**：提出愿景、验收视觉表现（UI/特效）、掌控节奏、执行关键 Git 提交。
- **权力**：拥有一票否决权，负责在 AI 陷入局部最优解时进行"降维打击"。

### 首席架构师 (Architect - KIRO & GEMINI)
- **职责**：设计底层数学模型、编写高强度指令包（Prompt）、审计代码逻辑、预判性能瓶颈（如 GC 抖动）。
- **准则**：严守 ECS 架构、影子构建与去 CDN 化红线。

### 开发大将 (Builder - KIRO / Cline / Cursor)
- **职责**：物理文件写入、具体业务代码实现、Bug 修复、维护 tasks/ 分片文档。
- **定位**：高效率的"搬砖人"，必须在架构师提供的指令包框架内活动。

---

## 2. ⚖️ 核心开发铁律 (The Code Bible)

任何参与项目的 AI 必须无条件遵守，否则视为非法代码：

### 影子构建 (Shadow Refactor)
- 核心逻辑锁定在 `src/core/`（ECS 模式）。
- UI 组件只负责响应式渲染，严禁包含引擎计算逻辑。

### 去 CDN 化 (Local First)
- 所有库、WASM、资产必须引用本地路径，确保编辑器在完全离线状态下依然稳健。

### 极致性能循环
- 在 `System.update` 中严禁创建临时对象（Vector3/Matrix4），必须复用预分配的内存。

### React 19 平滑演进
- 当前（v1.3.0）保持 React 18 的 `useRef` + `useMemo` 优化。
- 非 Phase 15 任务，禁止使用 React 19 新特性。

---

## 3. 📚 唯一事实来源 (Single Source of Truth)

为对抗 AI 的"信息熵增"，我们建立物理分片文档体系：

### 仪表盘 (PROGRESS_SUMMARY.md)
- 根目录下的全景图，包含各 Phase 进度及指向详细任务的超链接。

### 法典库 (docs/)
- **design.md**：核心架构图、数据流向、接口定义。
- **requirements.md**：原始需求与功能边界。

### 分片任务 (docs/tasks/)
- **tasks_infra.md (P1-7)**：基础设施档案（只读）。
- **tasks_features.md (P8-12)**：核心系统（稳定态）。
- **tasks_v1.3_final.md (P13-17)**：当前主战场。

---

## 4. 🔄 标准工作流 (Standard Workflow)

### 第一阶段：设计与分片 (In Kiro Architect Mode)
1. **指令驱动**：架构师（我）提供高强度指令包。
2. **Spec 固化**：KIRO 先在 `docs/tasks/` 更新任务细节，严禁直接写代码。
3. **审计**：制作人检查 `design.md` 的逻辑是否符合"直觉式交互"。

### 第二阶段：高性价比落地 (In Cline / Cursor Builder Mode)
1. **上下文加载**：新会话开启时，发送【神经同步快照】。
2. **分步执行**：让 Builder 按照 `tasks_v1.3_final.md` 的子项，以"每次不超过 3 个功能"的节奏搬砖。
3. **降本策略**：复杂架构找 Kiro (Claude 4.5)，高频代码落地找 Cline (DeepSeek/Sonnet 3.5)。

### 第三阶段：上帝验证 (Debug & Validation)
1. **中枢注入**：新功能完成后，必须注入 `testRunner.ts` 的 `window` 对象。
2. **控制台验收**：通过 `window.terrainControls.createMountain()` 等上帝指令直接验证影子引擎，不依赖尚未对齐的 UI。

---

## 5. 🚨 报错与过载处理 (Troubleshooting)

### 转圈圈 (Aborted)
- **原因**：文件过大导致。
- **解法**：立即执行文档物理拆分，或者分段重写文件。

### 神经断层 (Context Full)
- **原因**：占用超过 80% 或逻辑开始混乱。
- **解法**：立即开启新会话，输入以下【冷启动 Prompt】。

#### [冷启动 Prompt 模板]

```
你好，我是 PolyForge 项目的 Builder。

请读取 PROGRESS_SUMMARY.md 了解大局。
请读取 docs/design.md 同步架构设计。
目前正在执行 docs/tasks/tasks_v1.3_final.md 中的 [具体 Phase]。

红线：ECS 架构、本地资产、禁止 React 19。

请确认你已就绪。
```

---

## 6. 🚀 部署运维 (Ops)

### Git 策略
- 每完成一个关键 Phase，制作人执行一次：
  ```bash
  git add .
  git commit -m "Phase X: [Summary]"
  ```

### CI/CD
- 使用 **Cloudflare Pages** 直连 GitHub
- Vite 预设
- 构建命令：`npm run build`
- 输出目录：`dist`

---

## 📋 快速参考

### 文档结构
```
PolyForge/
├── PROGRESS_SUMMARY.md          # 全景仪表盘
├── docs/
│   ├── SOP_AI_Collaboration.md  # 本文档
│   ├── design.md                # 架构设计
│   ├── requirements.md          # 需求文档
│   └── tasks/
│       ├── tasks_infra.md       # Phase 1-7
│       ├── tasks_features.md    # Phase 8-12
│       └── tasks_v1.3_final.md  # Phase 13-17
└── .kiro/specs/                 # 临时任务区
```

### 核心命令
```javascript
// 控制台验证
window.terrainControls.createMountain();
window.vegetationControls.spawnGrass(5000);
window.renderDemoControls.setTimeOfDay(18);
```

---

**制作人**: YUSHAN  
**最后审计**: 2025-12-23
