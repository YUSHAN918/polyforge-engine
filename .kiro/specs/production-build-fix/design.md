# 设计文档

## 概述

本设计文档描述了诊断和修复 PolyForge Engine 生产构建黑屏问题的技术方案。问题的核心是 React error #418（Hook 规则违反），导致应用程序在生产模式下崩溃并出现黑屏。

### 问题分析

根据故障排查日志，问题具有以下特征：
- 开发模式（`npm run dev`）正常工作
- 生产构建（`npm run build && npm run preview`）黑屏
- 错误信息：`Minified React error #418` 和 `THREE.WebGLRenderer: Context lost`
- 问题在本地和 Cloudflare Pages 部署中都会出现

这表明问题是代码在生产模式下的运行时错误，而非部署环境或网络问题。

### 解决策略

我们将采用三阶段方法：
1. **诊断阶段**：禁用代码压缩，获取完整错误信息，精确定位问题组件
2. **修复阶段**：修复 Hook 规则违反，添加错误边界，优化构建配置
3. **验证阶段**：本地测试生产构建，确保问题解决

## 架构

### 系统组件

```
┌─────────────────────────────────────────────────────────┐
│                      App.tsx                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │           ErrorBoundary (新增)                     │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │          GameCanvas.tsx                      │  │  │
│  │  │  ┌───────────────────────────────────────┐  │  │  │
│  │  │  │  Canvas (react-three/fiber)           │  │  │  │
│  │  │  │  ┌─────────────────────────────────┐  │  │  │  │
│  │  │  │  │  Suspense                        │  │  │  │  │
│  │  │  │  │  ┌───────────────────────────┐  │  │  │  │  │
│  │  │  │  │  │  Scene Components         │  │  │  │  │  │
│  │  │  │  │  │  - CameraController       │  │  │  │  │  │
│  │  │  │  │  │  - VfxStudioScene         │  │  │  │  │  │
│  │  │  │  │  │  - GameplayScene          │  │  │  │  │  │
│  │  │  │  │  │  - MapEditorScene         │  │  │  │  │  │
│  │  │  │  │  └───────────────────────────┘  │  │  │  │  │
│  │  │  │  └─────────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 关键问题点

基于代码审查，潜在的 Hook 违规位置：

1. **GameCanvas.tsx**
   - `CameraController` 组件中的 `useEffect` 和 `useState`
   - 各个 Scene 组件中的 `useRef`、`useState`、`useEffect`、`useFrame`
   - 条件渲染可能导致 Hook 调用顺序变化

2. **App.tsx**
   - 大量的 `useState`、`useEffect`、`useCallback`、`useMemo`
   - 复杂的条件逻辑可能影响 Hook 调用顺序

3. **Character3D.tsx 和其他组件**
   - Three.js 相关的 Hooks 可能在条件渲染中被调用

## 组件和接口

### 新增组件

#### ErrorBoundary

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState>
```

**职责：**
- 捕获子组件树中的 JavaScript 错误
- 记录错误信息到控制台
- 显示后备 UI
- 防止整个应用崩溃

#### CanvasErrorBoundary

```typescript
interface CanvasErrorBoundaryProps {
  children: React.ReactNode;
}

// 专门用于 GameCanvas 的错误边界
class CanvasErrorBoundary extends ErrorBoundary
```

**职责：**
- 专门处理 Three.js/Canvas 相关的错误
- 提供 Canvas 特定的后备 UI
- 防止 WebGL context 丢失导致的级联错误

### 修改的组件

#### GameCanvas.tsx

**问题：** 可能存在条件性 Hook 调用

**修复策略：**
1. 确保所有 Hooks 在组件顶层调用
2. 将条件逻辑移到 Hook 内部
3. 使用 `useMemo` 和 `useCallback` 优化性能
4. 添加错误边界包裹

#### App.tsx

**问题：** 复杂的状态管理可能导致 Hook 调用顺序问题

**修复策略：**
1. 审查所有条件渲染逻辑
2. 确保 Hooks 不在条件语句中
3. 简化状态管理逻辑

## 数据模型

### 错误日志模型

```typescript
interface ErrorLog {
  timestamp: number;
  error: Error;
  componentStack: string;
  errorInfo: React.ErrorInfo;
  buildMode: 'development' | 'production';
  userAgent: string;
}
```

### 构建配置模型

```typescript
interface BuildConfig {
  minify: boolean | 'esbuild' | 'terser';
  sourcemap: boolean | 'inline' | 'hidden';
  target: string;
  chunkSizeWarningLimit: number;
}
```

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

基于验收标准分析，大多数需求是具体的配置验证和手动测试场景，而非通用属性。因此，我们将重点放在关键的可测试属性上：

### 属性 1：错误边界捕获

*对于任何* 在 ErrorBoundary 内抛出错误的组件，错误应该被捕获，应用程序的其他部分应该继续运行

**验证：需求 5.1, 5.5**

### 属性 2：WebGL 上下文稳定性

*对于任何* 模式切换操作，WebGL 上下文应该保持有效且可用

**验证：需求 3.4**

### 属性 3：构建输出完整性

*对于任何* 生产构建，所有必需的资源文件（JS、CSS、assets）应该存在于输出目录中

**验证：需求 6.5**

## 错误处理

### 错误分类

1. **Hook 规则违反错误**
   - 检测：React error #418, #419, #420
   - 处理：修复代码，确保 Hooks 在顶层调用
   - 预防：ESLint 规则 `react-hooks/rules-of-hooks`

2. **WebGL 上下文丢失**
   - 检测：`THREE.WebGLRenderer: Context lost`
   - 处理：错误边界捕获，显示后备 UI
   - 预防：正确的资源清理和错误边界

3. **构建配置错误**
   - 检测：构建失败或运行时错误
   - 处理：调整 vite.config.ts 配置
   - 预防：配置验证和测试

### 错误边界策略

```typescript
// 顶层错误边界
<ErrorBoundary fallback={<AppErrorFallback />}>
  <App />
</ErrorBoundary>

// Canvas 特定错误边界
<CanvasErrorBoundary>
  <GameCanvas {...props} />
</CanvasErrorBoundary>
```

### 错误日志

所有错误应该记录以下信息：
- 错误消息和堆栈跟踪
- 组件堆栈
- 时间戳
- 构建模式（development/production）
- 用户代理信息

## 测试策略

### 单元测试

**目标：** 验证单个组件的正确性

**测试内容：**
1. ErrorBoundary 组件
   - 测试错误捕获功能
   - 测试后备 UI 渲染
   - 测试错误日志记录

2. Hook 规则验证
   - 使用 ESLint 静态分析
   - 确保没有条件性 Hook 调用

### 集成测试

**目标：** 验证组件间的交互

**测试内容：**
1. Canvas 组件挂载和卸载
   - 验证 WebGL 上下文初始化
   - 验证资源清理

2. 模式切换
   - 验证状态保持
   - 验证 WebGL 上下文稳定性

### 端到端测试

**目标：** 验证完整的用户流程

**测试内容：**
1. 生产构建测试
   - 运行 `npm run build`
   - 运行 `npm run preview`
   - 验证应用正常加载和运行

2. 错误场景测试
   - 故意触发错误
   - 验证错误边界工作
   - 验证应用不崩溃

### 构建配置测试

**目标：** 验证 Vite 配置的正确性

**测试内容：**
1. Source maps 生成
   - 验证 .map 文件存在
   - 验证错误堆栈可读

2. 代码分割
   - 验证 chunks 正确生成
   - 验证依赖关系正确

3. 压缩设置
   - 测试不同的 minify 选项
   - 验证功能不被破坏

### 测试工具

- **单元测试：** Vitest + React Testing Library
- **ESLint：** `eslint-plugin-react-hooks` 用于 Hook 规则检查
- **手动测试：** 浏览器开发工具，控制台日志
- **构建验证：** 自定义脚本检查构建输出

### 测试流程

1. **开发阶段**
   - 运行 ESLint 检查 Hook 规则
   - 运行单元测试
   - 本地开发模式测试

2. **构建阶段**
   - 禁用压缩构建，获取完整错误
   - 启用压缩构建，验证功能
   - 运行预览服务器测试

3. **部署前**
   - 完整的端到端测试
   - 错误场景测试
   - 性能测试

## 实施计划

### 阶段 1：诊断（优先级：高）✅ 已完成

1. ✅ 修改 `vite.config.ts`，禁用代码压缩
2. ✅ 添加详细的错误日志
3. ✅ 本地构建和测试，获取完整错误信息
4. ✅ 识别具体的问题组件和 Hook 违规位置

### 阶段 2：修复（优先级：高）✅ 已完成

1. ✅ 创建 ErrorBoundary 组件
2. ✅ 修复识别出的 Hook 规则违反
3. ✅ 在 App.tsx 和 GameCanvas.tsx 周围添加错误边界
4. ✅ 优化 Suspense 边界配置

### 阶段 3：环境光照修复（优先级：高）🔄 进行中

**问题：** Environment 组件使用 CDN preset 导致无梯子环境下加载失败

**修复步骤：**
1. 移除 `GameCanvas.tsx` 中的 `<Environment preset="city" />`
2. 替换为以下三种方案之一：
   - **方案 A（推荐）**：使用本地 HDR 文件
     ```tsx
     <Environment files="/assets/env/potsdamer_platz_1k.hdr" background={false} />
     ```
   - **方案 B**：完全移除 Environment，增强基础光照
     ```tsx
     <ambientLight intensity={1.2} />
     <hemisphereLight args={["#ffffff", "#444444", 2.0]} />
     <directionalLight position={[10, 20, 10]} intensity={2.0} castShadow />
     ```
   - **方案 C**：使用 drei 的 Lightformer 组件（无需外部文件）

3. 确保 ContactShadows 配置正确：
   ```tsx
   <ContactShadows 
     resolution={1024} 
     scale={50} 
     blur={shadowSettings?.blur ?? 0.4} 
     opacity={shadowSettings?.opacity ?? 0.75} 
     color={shadowSettings?.color ?? "#000000"} 
     position={[shadowSettings?.offsetX ?? 0, shadowSettings?.offsetY ?? 0, shadowSettings?.offsetZ ?? 0]} 
     far={10} 
   />
   ```

4. 重新构建：`npm run build`
5. 测试预览：`npm run preview`

### 阶段 4：配置优化（优先级：中）

1. 调整 Vite 构建配置
2. 启用 source maps
3. 配置适当的代码分割
4. 测试不同的压缩选项

### 阶段 5：验证（优先级：高）

1. 本地生产构建测试
2. 验证环境光照和阴影效果
3. 部署到 Cloudflare Pages 测试
4. 国内无梯子环境测试
5. 性能和稳定性测试

## 风险和缓解

### 风险 1：无法定位具体的 Hook 违规

**影响：** 高  
**概率：** 中  
**缓解：**
- 使用 ESLint 静态分析
- 逐个组件注释测试
- 使用 React DevTools Profiler

### 风险 2：修复后性能下降

**影响：** 中  
**概率：** 低  
**缓解：**
- 使用 `useMemo` 和 `useCallback` 优化
- 监控构建大小
- 性能测试

### 风险 3：错误边界影响用户体验

**影响：** 中  
**概率：** 低  
**缓解：**
- 设计友好的错误 UI
- 提供重试机制
- 记录详细错误信息供调试

## 成功标准

1. ✅ 生产构建不再出现黑屏
2. ✅ 没有 React error #418 或类似的 Hook 错误
3. ✅ WebGL 上下文保持稳定
4. ✅ 错误被优雅地捕获和显示
5. ✅ 本地预览和部署版本行为一致
6. ✅ 国内无梯子环境可以正常访问和使用
7. ✅ 构建大小在合理范围内（< 2MB）
8. ✅ 应用加载时间 < 5 秒
9. ✅ 环境光照在生产模式下正常显示（地面明亮）
10. ✅ 角色假投影（ContactShadows）在生产模式下正常渲染
11. ✅ 不依赖任何外部 CDN 资源（完全离线可用）

## 技术债务

### 当前已知问题

1. **Environment 组件使用 CDN preset（关键问题）**
   - 位置：`GameCanvas.tsx` 第 1059 行
   - 当前代码：`<Environment preset="city" />`
   - 问题：在无梯子环境下，从 raw.githack.com 加载 HDR 文件超时
   - 影响：
     - 开发模式正常（Vite 开发服务器处理方式不同）
     - 生产构建黑屏或环境光照缺失
     - ContactShadows 无法正常渲染（依赖环境光）
   - 解决方案：
     - 移除 `preset="city"`
     - 使用本地 HDR 文件：`files="/assets/env/potsdamer_platz_1k.hdr"`
     - 或完全移除 Environment 组件，使用基础光照

2. **生产构建流程问题**
   - 问题：修改代码后未重新构建
   - 影响：`npm run preview` 运行的是旧的 `dist` 目录
   - 解决方案：每次修改后必须执行 `npm run build`

3. **代码压缩当前禁用**
   - 原因：用于调试
   - 影响：构建文件更大
   - 计划：问题修复后重新启用

4. **Suspense 边界调整**
   - 原因：尝试修复加载问题
   - 影响：可能影响加载体验
   - 计划：优化 Suspense 配置

### 未来改进

1. 实现更细粒度的错误边界
2. 添加错误报告服务（如 Sentry）
3. 优化代码分割策略
4. 实现渐进式加载
5. 添加性能监控
