# 20251225 植被渲染回归事故深度复盘报告 (Incident Report)

## 1. 事故摘要 (Abstract)
- **触发时间**：2025-12-25 18:00
- **表现症状**：草地模型消失，地面仅剩随时间变化的黑色影子；缩放滑块对新旧植被失效；控制台报错 `ERROR: worldPosition: redefinition`。
- **波及范围**：全量植被渲染系统。
- **状态**：**已彻底修复**。

## 2. 根因剖析 (Root Cause Analysis - RCA)

### A. 逻辑冲突：Shader 变量“李代桃僵”
- **现象**：架构师在 Shader 注入时，手动定义了 `vec4 worldPosition`。
- **本质**：这与 Three.js (v130+) 内部标准着色器变量冲突。Shader 编译失败，GPU 取消渲染草片模型，仅输出了阴影 Pass。
- **教训**：AI 专家对特定库（如 Three.js）的高级内部逻辑存在“认知滞后”，过度自信导致了基本命名冲突。

### B. 架构断路：组件状态与渲染更新脱节
- **现象**：滑块修改了 ECS 组件的 `scale` 值，但画面无响应。
- **本质**：渲染层依赖 React 的 `useEffect` 监听，但 ECS 系统的 update 是直接修改对象属性，无法触发 React 的响应式更新。
- **教训**：在渲染主循环中，必须执行“主动拉取 (Pull)”而非“被动监听 (Push)”。

### C. 实体竞争：多 Mesh 管理漏洞
- **表现**：后生成的草会覆盖旧草的引用。
- **本质**：`VegetationSystem` 早期只支持单一 `meshHandle`。
- **教训**：单一实例模式在多实体场景下是毁灭性的。

## 3. 终极解决方案 (The Final Fix)
1. **Shader 纠偏**：将冲突变量重命名为 `vLocalWorldPos`。
2. **三权同步**：在 `useFrame` 中每帧从 ECS 同步 `scale`, `wind`, `color`。
3. **注册表模式**：升级为 `meshMap: Map<entityId, Mesh>`，实现实体隔离。
4. **几何位移**：手动上移几何体 0.5 单位，根治“半截入土”产生的黑影。

## 4. 进化后的钢铁 SOP
- **[Rule 1]** 任何 Shader 注入必须检查 Three.js 内部变量。
- **[Rule 2]** 高频变动的参数严禁依赖 React 生命周期，必须进入渲染主循环同步。
- **[Rule 3]** 创建前必须执行 `view_file` 源码对齐，禁止想象力编程。

---
**存档人**：Antigravity 总架构师  
**审批人**：合伙人 (The Partner)
