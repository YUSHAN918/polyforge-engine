# 实施计划

- [-] 1. 诊断阶段：获取完整错误信息

  - 修改构建配置以禁用压缩
  - 添加详细错误日志
  - 本地构建测试并收集错误信息
  - _需求: 1.1, 1.2, 1.4, 1.5_

- [x] 1.1 配置 Vite 以生成可调试的生产构建



  - 在 `vite.config.ts` 中设置 `minify: false`
  - 启用 source maps：`sourcemap: true`
  - 添加构建时的详细日志
  - _需求: 1.1, 1.5, 6.1, 6.3_

- [ ] 1.2 添加全局错误捕获和日志



  - 在 `index.tsx` 中添加 `window.onerror` 处理器
  - 在 `index.tsx` 中添加 `window.onunhandledrejection` 处理器
  - 创建错误日志工具函数
  - 记录错误时间戳、堆栈、用户代理等信息
  - _需求: 1.2, 1.4_

- [x] 1.3 执行本地生产构建测试

  - 运行 `npm run build`
  - 运行 `npm run preview`
  - 在浏览器中打开应用
  - 记录控制台中的所有错误信息
  - 截图保存错误堆栈
  - _需求: 1.1, 1.2, 7.1, 7.3_

- [ ] 2. 创建错误边界组件
  - 实现通用 ErrorBoundary 组件
  - 实现 Canvas 专用的 CanvasErrorBoundary
  - 设计错误后备 UI
  - _需求: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 2.1 实现 ErrorBoundary 基础组件
  - 创建 `components/ErrorBoundary.tsx`
  - 实现 `componentDidCatch` 生命周期方法
  - 实现 `getDerivedStateFromError` 静态方法
  - 添加错误状态管理
  - 实现错误日志记录功能
  - _需求: 5.1, 5.3_

- [ ] 2.2 设计和实现错误后备 UI
  - 创建 `components/ErrorFallback.tsx`
  - 设计用户友好的错误消息界面
  - 添加"重试"按钮功能
  - 添加"报告问题"链接
  - 显示简化的错误信息（非技术用户友好）
  - _需求: 5.2, 5.4_

- [ ] 2.3 实现 CanvasErrorBoundary 专用组件
  - 创建 `components/CanvasErrorBoundary.tsx`
  - 继承自 ErrorBoundary
  - 实现 Canvas 特定的后备 UI
  - 添加 WebGL 上下文检测
  - 提供 Canvas 重新初始化选项
  - _需求: 3.5, 5.4_

- [-] 3. 审查和修复 Hook 规则违反

  - 使用 ESLint 检查 Hook 规则
  - 审查 GameCanvas.tsx 中的 Hooks
  - 审查 App.tsx 中的 Hooks
  - 修复发现的违规
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 3.1 配置和运行 ESLint Hook 规则检查
  - 确保 `eslint-plugin-react-hooks` 已安装
  - 在 `.eslintrc` 中启用 `react-hooks/rules-of-hooks` 规则
  - 在 `.eslintrc` 中启用 `react-hooks/exhaustive-deps` 规则
  - 运行 `npm run lint` 或 `npx eslint . --ext .tsx,.ts`
  - 记录所有 Hook 相关的警告和错误
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 3.2 审查和修复 GameCanvas.tsx 中的 Hooks
  - 检查 `CameraController` 组件的 Hooks
  - 检查 `VfxStudioScene` 组件的 Hooks
  - 检查 `GameplayScene` 组件的 Hooks
  - 检查 `MapEditorScene` 组件的 Hooks
  - 确保所有 Hooks 在组件顶层调用
  - 将条件逻辑移到 Hook 内部
  - 移除任何条件性的 Hook 调用
  - _需求: 2.1, 2.2, 2.3, 2.4_

- [ ] 3.3 审查和修复 App.tsx 中的 Hooks
  - 检查所有 `useState` 调用
  - 检查所有 `useEffect` 调用
  - 检查所有 `useCallback` 和 `useMemo` 调用
  - 确保 Hooks 不在条件语句中
  - 确保 Hooks 在所有提前返回之前
  - 简化复杂的条件逻辑
  - _需求: 2.1, 2.2, 2.4_

- [ ] 3.4 审查其他组件中的 Hooks
  - 检查 `Character3D.tsx`
  - 检查 `VfxRenderer.tsx`
  - 检查所有自定义 Hooks
  - 修复发现的任何违规
  - _需求: 2.1, 2.5_

- [ ] 4. 在应用中集成错误边界
  - 在 App 组件周围添加顶层错误边界
  - 在 GameCanvas 周围添加 Canvas 错误边界
  - 测试错误边界功能
  - _需求: 5.1, 5.2, 5.4, 5.5_

- [ ] 4.1 在 index.tsx 中添加顶层错误边界
  - 导入 ErrorBoundary 组件
  - 用 ErrorBoundary 包裹 App 组件
  - 配置顶层错误后备 UI
  - 添加错误回调处理
  - _需求: 5.1, 5.5_

- [ ] 4.2 在 App.tsx 中添加 Canvas 错误边界
  - 导入 CanvasErrorBoundary 组件
  - 用 CanvasErrorBoundary 包裹 GameCanvas 组件
  - 配置 Canvas 特定的后备 UI
  - _需求: 3.5, 5.4_

- [ ] 4.3 测试错误边界功能
  - 在开发模式下故意触发错误
  - 验证错误被捕获
  - 验证后备 UI 显示
  - 验证错误日志记录
  - 验证应用其他部分仍然可用
  - _需求: 5.1, 5.2, 5.3, 5.5_

- [ ] 5. 优化 Three.js 组件初始化和清理
  - 验证 WebGL 上下文初始化
  - 添加资源清理逻辑
  - 测试模式切换的稳定性
  - _需求: 3.1, 3.2, 3.3, 3.4_

- [ ] 5.1 验证和优化 Canvas 组件初始化
  - 检查 GameCanvas 中的 Canvas 组件配置
  - 添加 WebGL 上下文初始化检查
  - 添加初始化失败的错误处理
  - 验证 Canvas 挂载时 WebGL 上下文有效
  - _需求: 3.1_

- [ ] 5.2 优化 Suspense 边界配置
  - 审查当前的 Suspense 使用
  - 确保所有异步组件都在 Suspense 内
  - 添加合适的 fallback UI
  - 测试 Suspense 内组件的渲染
  - _需求: 3.2_

- [ ] 5.3 添加 Three.js 资源清理逻辑
  - 在组件卸载时调用 `dispose()` 方法
  - 清理 geometries、materials、textures
  - 清理 WebGL 上下文引用
  - 测试资源清理的正确性
  - _需求: 3.3_

- [ ] 5.4 测试模式切换的 WebGL 稳定性
  - 在不同模式间切换（CHARACTER_EDITOR, MAP_EDITOR, GAMEPLAY 等）
  - 验证 WebGL 上下文保持有效
  - 检查是否有内存泄漏
  - 验证没有 "Context lost" 错误
  - _需求: 3.4_

- [ ] 6. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

- [ ] 7. 优化 Vite 构建配置
  - 调整压缩设置
  - 配置代码分割
  - 验证环境变量
  - 测试不同配置选项
  - _需求: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.4_

- [ ] 7.1 配置适当的代码压缩选项
  - 测试 `minify: 'esbuild'`（默认，快速）
  - 测试 `minify: 'terser'`（更好的压缩）
  - 比较构建大小和功能正确性
  - 选择最佳的压缩选项
  - 确保压缩不破坏代码功能
  - _需求: 4.1, 6.1_

- [ ] 7.2 配置代码分割策略
  - 配置 `build.rollupOptions.output.manualChunks`
  - 将 Three.js 分离到单独的 chunk
  - 将 React 和 React-DOM 分离到 vendor chunk
  - 验证 chunks 正确加载
  - 确保依赖关系不被破坏
  - _需求: 4.2, 4.4, 6.4_

- [ ] 7.3 验证环境变量配置
  - 检查 `vite.config.ts` 中的 `define` 配置
  - 验证 `VITE_ENABLE_AI` 等环境变量
  - 确保生产模式使用正确的值
  - 测试环境变量在构建后的可用性
  - _需求: 4.5_

- [ ] 7.4 验证 React 生产版本
  - 检查构建输出中的 React 版本
  - 确保使用 `react.production.min.js`
  - 验证没有开发模式的警告
  - _需求: 6.2_

- [ ] 8. 完整的生产构建测试
  - 运行完整的构建流程
  - 本地预览测试
  - 验证所有功能正常
  - 检查构建输出
  - _需求: 6.5, 7.1, 7.2, 7.4, 7.5_

- [ ] 8.1 执行完整构建并验证输出
  - 清理之前的构建：`rm -rf dist`
  - 运行 `npm run build`
  - 检查构建是否成功完成
  - 验证 `dist` 目录结构
  - 检查所有必需的文件是否存在（HTML, JS, CSS, assets）
  - 验证 source maps 文件存在
  - 检查构建大小是否在合理范围内
  - _需求: 6.3, 6.5_

- [ ] 8.2 本地预览服务器测试
  - 运行 `npm run preview`
  - 在浏览器中打开预览 URL
  - 测试所有主要功能
  - 测试所有模式切换
  - 检查控制台是否有错误
  - 验证网络请求正常
  - _需求: 7.1, 7.2, 7.3, 7.5_

- [ ] 8.3 功能完整性测试
  - 测试角色编辑器功能
  - 测试地图编辑器功能
  - 测试游戏玩法模式
  - 测试模型工作室
  - 测试动作工作室
  - 测试 VFX 编辑器
  - 验证所有功能与开发模式一致
  - _需求: 4.1, 7.4_

- [ ] 8.4 错误场景测试
  - 故意触发各种错误
  - 验证错误边界捕获错误
  - 验证后备 UI 显示
  - 验证应用不崩溃
  - 验证错误日志记录
  - _需求: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 9. 部署到 Cloudflare Pages 并测试
  - 部署到 Cloudflare Pages
  - 国外环境测试
  - 国内无梯子环境测试
  - 性能测试
  - _需求: 所有需求的最终验证_

- [ ] 9.1 部署到 Cloudflare Pages
  - 运行 `npx wrangler pages deploy dist --project-name=polyforge-engine --branch=main`
  - 或使用 `deploy.bat` 脚本
  - 等待部署完成
  - 记录部署 URL
  - _需求: 7.2_

- [ ] 9.2 国外环境测试（有梯子或国外服务器）
  - 访问部署的 URL
  - 测试所有主要功能
  - 检查加载速度
  - 验证没有错误
  - _需求: 7.4_

- [ ] 9.3 国内无梯子环境测试
  - 在国内网络环境下访问
  - 验证页面能正常加载
  - 验证没有黑屏
  - 测试所有功能
  - 检查是否有资源加载失败
  - _需求: 所有需求的最终目标_

- [ ] 9.4 性能和稳定性测试
  - 测试首次加载时间
  - 测试交互响应速度
  - 长时间运行测试（检查内存泄漏）
  - 多次模式切换测试
  - 验证 WebGL 上下文稳定性
  - _需求: 3.4, 成功标准_

- [ ] 10. 最终检查点 - 验证所有成功标准
  - 确保所有测试通过，如有问题请询问用户

- [ ] 11. 文档更新和清理
  - 更新故障排查日志
  - 记录解决方案
  - 清理临时代码
  - 更新 README
  - _技术债务清理_

- [ ] 11.1 更新故障排查日志
  - 在 `troubleshooting-log.md` 中记录最终解决方案
  - 记录根本原因
  - 记录修复步骤
  - 添加"已解决"状态
  - _文档_

- [ ] 11.2 清理临时调试代码
  - 移除临时的 console.log
  - 移除调试用的注释代码
  - 确认所有 TODO 已处理
  - _代码清理_

- [ ] 11.3 处理技术债务
  - 评估是否重新启用 Environment 组件
  - 如需要，下载并配置本地 HDR 文件
  - 优化 Suspense 边界配置
  - 记录剩余的技术债务
  - _技术债务_

- [ ] 11.4 更新项目文档
  - 更新 README.md 中的构建说明
  - 添加故障排查指南
  - 记录已知问题和解决方案
  - 添加错误边界使用说明
  - _文档_
