# 需求文档

## 简介

本文档规定了诊断和修复 PolyForge Engine 生产构建问题的需求。

### 问题历史

1. **初始问题**：应用程序在开发模式下正常工作，但在生产构建时出现黑屏和 React error #418（Hook 规则违反）
2. **第一次修复**：通过移除 CDN 依赖的 Environment 组件，解决了黑屏问题
3. **当前问题**：生产构建不再黑屏，但环境光照缺失（地面暗淡）且角色没有假投影（ContactShadows）

### 根本原因

- `GameCanvas.tsx` 中仍然存在 `<Environment preset="city" />`，该组件尝试从 CDN (raw.githack.com) 加载 HDR 文件
- 在无梯子环境下，CDN 连接超时导致 Environment 组件加载失败
- Environment 加载失败导致整体环境光照不足，ContactShadows 无法正常渲染
- 开发模式正常是因为 Vite 开发服务器的处理方式不同

## 术语表

- **生产构建（Production Build）**: 通过 `npm run build` 创建的优化、压缩版本的应用程序
- **开发模式（Development Mode）**: 通过 `npm run dev` 运行的未优化版本，带有热模块替换
- **React Error #418**: React 错误，表示违反了 Hook 规则（条件性 Hook 调用或在组件外调用 Hook）
- **WebGL 上下文（WebGL Context）**: Three.js 用于 3D 图形渲染的渲染上下文
- **Hook**: React 函数（useState、useEffect 等），必须遵循特定的调用规则
- **代码压缩（Minification）**: 删除空格和缩短变量名的代码压缩过程
- **Three.js**: 用于渲染游戏画布的 3D 图形库
- **系统（System）**: PolyForge Engine 应用程序

## 需求

### 需求 1

**用户故事：** 作为开发者，我想要识别导致 React Hook 错误的组件，以便修复生产构建失败的根本原因。

#### 验收标准

1. WHEN 应用程序在禁用代码压缩的情况下构建 THEN 系统 SHALL 生成可读的错误堆栈跟踪，识别失败的组件
2. WHEN 启用错误日志记录 THEN 系统 SHALL 捕获并显示完整的错误消息，包括组件名称和行号
3. WHEN 单独测试组件 THEN 系统 SHALL 隔离触发 Hook 违规的组件
4. WHEN 错误发生 THEN 系统 SHALL 在 WebGL 上下文丢失之前记录错误
5. WHEN 启用调试 THEN 系统 SHALL 保留 source maps 以准确定位错误位置

### 需求 2

**用户故事：** 作为开发者，我想要确保所有 React Hooks 遵循 Hooks 规则，以便应用程序在生产模式下正确运行。

#### 验收标准

1. WHEN 任何组件渲染 THEN 系统 SHALL 在每次渲染时以相同顺序调用所有 Hooks
2. WHEN 存在条件逻辑 THEN 系统 SHALL NOT 在条件语句内放置 Hook 调用
3. WHEN 存在循环 THEN 系统 SHALL NOT 在循环内放置 Hook 调用
4. WHEN 存在提前返回 THEN 系统 SHALL 在任何提前返回语句之前调用所有 Hooks
5. WHEN 定义自定义 Hooks THEN 系统 SHALL 确保它们仅在顶层调用其他 Hooks

### 需求 3

**用户故事：** 作为开发者，我想要验证 Three.js 组件是否正确初始化，以便不会发生 WebGL 上下文丢失。

#### 验收标准

1. WHEN Canvas 组件挂载 THEN 系统 SHALL 成功初始化 WebGL 上下文
2. WHEN 使用 Suspense 边界 THEN 系统 SHALL 确保所有子组件可以无错误渲染
3. WHEN Three.js 组件卸载 THEN 系统 SHALL 正确释放 WebGL 资源
4. WHEN 应用程序切换模式 THEN 系统 SHALL 保持 WebGL 上下文稳定性
5. WHEN 子组件中发生错误 THEN 系统 SHALL 通过错误边界防止 WebGL 上下文丢失

### 需求 4

**用户故事：** 作为开发者，我想要确保生产构建优化不会破坏代码，以便应用程序在开发和生产环境中表现一致。

#### 验收标准

1. WHEN 代码被压缩 THEN 系统 SHALL 保留所有组件的功能行为
2. WHEN 依赖项被打包 THEN 系统 SHALL 维护正确的导入解析
3. WHEN 发生 tree-shaking THEN 系统 SHALL NOT 删除实际使用的代码
4. WHEN 应用代码分割 THEN 系统 SHALL 在渲染前加载所有必需的代码块
5. WHEN 替换环境变量 THEN 系统 SHALL 为生产模式使用正确的值

### 需求 5

**用户故事：** 作为开发者，我想要在关键组件周围实现错误边界，以便优雅地捕获和显示错误，而不是导致黑屏。

#### 验收标准

1. WHEN 组件抛出错误 THEN 系统 SHALL 在错误边界中捕获错误
2. WHEN 捕获到错误 THEN 系统 SHALL 显示用户友好的错误消息
3. WHEN 发生错误 THEN 系统 SHALL 将详细的错误信息记录到控制台
4. WHEN Canvas 组件失败 THEN 系统 SHALL 显示后备 UI 而不是黑屏
5. WHEN 捕获到错误 THEN 系统 SHALL 防止整个应用程序崩溃

### 需求 6

**用户故事：** 作为开发者，我想要验证构建配置，以便 Vite 生成正确的生产包。

#### 验收标准

1. WHEN 构建运行 THEN 系统 SHALL 使用保持代码正确性的适当压缩设置
2. WHEN React 被打包 THEN 系统 SHALL 使用 React 的生产版本
3. WHEN 生成 source maps THEN 系统 SHALL 包含它们以用于调试生产问题
4. WHEN 创建代码块 THEN 系统 SHALL 确保正确的代码分割而不破坏依赖关系
5. WHEN 构建完成 THEN 系统 SHALL 验证所有必需的资源都包含在输出中

### 需求 7

**用户故事：** 作为开发者，我想要在本地测试生产构建，以便在部署前重现和修复问题。

#### 验收标准

1. WHEN 运行 `npm run preview` THEN 系统 SHALL 在本地提供生产构建服务
2. WHEN 预览服务器启动 THEN 系统 SHALL 使用与部署相同的构建输出
3. WHEN 预览中发生错误 THEN 系统 SHALL 在浏览器控制台中显示它们
4. WHEN 应用程序在预览中加载 THEN 系统 SHALL 与部署版本的行为完全一致
5. WHEN 在预览中测试 THEN 系统 SHALL 允许检查网络请求和控制台日志

### 需求 8

**用户故事：** 作为开发者，我想要确保环境光照在生产模式下正常工作，以便用户看到明亮的场景和正确的阴影效果。

#### 验收标准

1. WHEN 应用程序在生产模式下运行 THEN 系统 SHALL NOT 尝试从外部 CDN 加载任何资源
2. WHEN Environment 组件渲染 THEN 系统 SHALL 使用本地 HDR 文件或完全基于代码的光照方案
3. WHEN 场景加载完成 THEN 系统 SHALL 显示明亮的地面和环境光照
4. WHEN 角色渲染 THEN 系统 SHALL 在角色脚下显示接触阴影（ContactShadows）
5. WHEN 在无网络连接环境下运行 THEN 系统 SHALL 保持所有光照和阴影效果正常

### 需求 9

**用户故事：** 作为开发者，我想要确保代码修改后正确重新构建，以便生产预览反映最新的代码更改。

#### 验收标准

1. WHEN 修改源代码 THEN 系统 SHALL 要求开发者运行 `npm run build` 以更新生产构建
2. WHEN 运行 `npm run build` THEN 系统 SHALL 清空并重新生成 `dist` 目录
3. WHEN 构建完成 THEN 系统 SHALL 确保所有代码更改都反映在 `dist` 目录中
4. WHEN 运行 `npm run preview` THEN 系统 SHALL 提供最新构建的内容
5. WHEN 开发者忘记重新构建 THEN 系统 SHALL 在文档中明确说明构建流程
