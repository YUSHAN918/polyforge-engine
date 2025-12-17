# 实现计划

## 模块 1: GLB 导出服务核心功能

- [ ] 1.1 创建导出服务模块
  - 创建 `services/exportService.ts` 文件
  - 实现 `ModelExportService` 类
  - 导入 Three.js 和 GLTFExporter
  - 定义 `ExportOptions` 和 `ExportResult` 接口
  - _需求: 2.1, 2.2_

- [ ] 1.2 实现 GLB 导出核心逻辑
  - 实现 `exportToGLB()` 方法
  - 配置 GLTFExporter 默认选项（binary: true, maxTextureSize: 2048）
  - 使用 Promise 包装 GLTFExporter.parse() 回调
  - 添加错误捕获和处理
  - _需求: 2.1, 2.6_

- [ ] 1.3 实现文件下载功能
  - 实现 `downloadGLB()` 方法
  - 创建 Blob 对象和 URL
  - 触发浏览器下载
  - 清理临时 URL
  - _需求: 2.4_

- [ ] 1.4 实现文件名生成逻辑
  - 实现 `generateFilename()` 方法
  - 添加时间戳格式化
  - 清理特殊字符，保留中文
  - 生成格式：`{模型名称}_{时间戳}.glb`
  - _需求: 2.4_

- [ ] 1.5 添加文件大小检查
  - 检查导出的 ArrayBuffer 大小
  - 定义 MAX_FILE_SIZE 常量（10MB）
  - 返回文件大小信息
  - _需求: 4.5_

## 模块 2: 角色编辑器导出功能

- [ ] 2.1 扩展 Character3D 组件
  - 添加 `exportRef` prop 用于暴露场景引用
  - 使用 `useImperativeHandle` 暴露 groupRef
  - 确保所有可见几何体包含在导出中
  - _需求: 2.1, 4.1_

- [ ] 2.2 在 EditorPanel 添加导出按钮
  - 在编辑面板底部添加"导出 GLB"按钮
  - 添加导出图标（fa-file-export）
  - 设置按钮样式（绿色主题）
  - _需求: 3.1_

- [ ] 2.3 实现角色导出处理逻辑
  - 在 App.tsx 中添加 `handleExportCharacter` 函数
  - 创建 ModelExportService 实例
  - 获取 Character3D 的场景引用
  - 调用 exportToGLB() 方法
  - 生成文件名（使用角色名称）
  - _需求: 2.1, 2.4_

- [ ] 2.4 添加导出状态管理
  - 添加 `isExporting` 状态
  - 导出开始时设置为 true，禁用按钮
  - 导出结束时设置为 false，启用按钮
  - _需求: 2.3, 3.3_

- [ ] 2.5 添加导出进度指示器
  - 在导出按钮中显示加载动画
  - 使用 spinner 图标或文字提示
  - _需求: 2.3, 3.3_

- [ ] 2.6 添加导出结果提示
  - 成功时显示绿色提示"导出成功"
  - 失败时显示红色提示"导出失败：{错误信息}"
  - 提示 2 秒后自动消失
  - 文件过大时显示黄色警告
  - _需求: 2.6, 3.4, 3.5, 4.5_

## 模块 3: 模型工坊导出功能

- [ ] 3.1 在 ModelWorkshopPanel 添加导出按钮
  - 在工具栏区域添加"导出 GLB"按钮
  - 添加导出图标
  - 设置按钮样式
  - _需求: 3.2_

- [ ] 3.2 实现自定义模型导出逻辑
  - 在 App.tsx 中添加 `handleExportWorkshopModel` 函数
  - 从 workshopPrimitives 构建 Three.js 场景
  - 遍历所有 primitives 创建对应的 Mesh
  - 保持位置、旋转、缩放和颜色属性
  - _需求: 2.2, 4.2, 4.3_

- [ ] 3.3 处理模型层级结构
  - 创建 Group 作为根节点
  - 添加所有 primitives 作为子节点
  - 保持相对变换关系
  - _需求: 2.7, 4.4_

- [ ] 3.4 添加导出状态和提示
  - 复用角色编辑器的状态管理逻辑
  - 添加加载指示器
  - 添加成功/失败提示
  - _需求: 2.3, 3.3, 3.4, 3.5_

## 模块 4: Cloudflare Pages 部署配置

- [ ] 4.1 创建 wrangler.toml 配置文件
  - 在项目根目录创建 `wrangler.toml`
  - 配置项目名称：`low3d-editor`
  - 配置构建命令：`npm run build`
  - 配置输出目录：`dist`
  - 配置文件类型规则
  - _需求: 5.1_

- [ ] 4.2 创建 GitHub Actions 工作流
  - 创建 `.github/workflows/deploy.yml` 文件
  - 配置触发条件（push to main, PR）
  - 添加 Checkout 步骤
  - 添加 Node.js 设置步骤（版本 20）
  - 添加依赖安装步骤（npm ci）
  - _需求: 1.2, 5.2_

- [ ] 4.3 配置构建步骤
  - 添加 `npm run build` 命令
  - 配置环境变量（VITE_ENABLE_AI, GEMINI_API_KEY）
  - 使用 GitHub Secrets 注入敏感信息
  - _需求: 1.2, 5.3_

- [ ] 4.4 配置 Cloudflare Pages 部署步骤
  - 使用 `cloudflare/pages-action@v1`
  - 配置 API Token（从 Secrets 读取）
  - 配置 Account ID（从 Secrets 读取）
  - 配置项目名称和输出目录
  - _需求: 1.2, 1.3_

- [ ] 4.5 配置 GitHub Secrets
  - 在 GitHub 仓库设置中添加 CLOUDFLARE_API_TOKEN
  - 添加 CLOUDFLARE_ACCOUNT_ID
  - 添加 GEMINI_API_KEY（可选）
  - 添加 VITE_ENABLE_AI（可选）
  - _需求: 5.3_

## 模块 5: 测试和验证

- [ ] 5.1 本地测试 GLB 导出功能
  - 测试导出简单角色模型
  - 测试导出复杂角色模型（多装备）
  - 测试导出自定义模型
  - 在 Blender 中验证导出的 GLB 文件
  - _需求: 2.5, 4.1, 4.2_

- [ ] 5.2 测试错误处理
  - 测试空场景导出
  - 测试导出过程中断
  - 验证错误提示显示
  - 验证控制台日志记录
  - _需求: 2.6_

- [ ] 5.3 测试文件大小警告
  - 创建大型模型（超过 10MB）
  - 验证警告提示显示
  - _需求: 4.5_

- [ ] 5.4 测试部署流程
  - 创建测试分支并推送
  - 验证 GitHub Actions 触发
  - 检查构建日志
  - 验证预览 URL 生成
  - _需求: 1.2, 1.3_

- [ ] 5.5 测试生产部署
  - 合并到 main 分支
  - 验证自动部署触发
  - 访问生产 URL
  - 验证应用正常加载
  - _需求: 1.1, 1.3_

- [ ] 5.6 性能测试
  - 测试中国大陆网络访问速度
  - 验证首屏加载时间 < 3 秒
  - 测试导出性能（简单模型 < 5 秒）
  - _需求: 1.4_

## 模块 6: 文档更新

- [ ] 6.1 更新 README.md
  - 添加 Cloudflare Pages 部署说明
  - 添加 GitHub Secrets 配置指南
  - 添加 GLB 导出功能说明
  - 添加开发环境设置说明
  - _需求: 5.3_

- [ ] 6.2 创建用户指南
  - 编写角色导出教程（带截图）
  - 编写自定义模型导出教程
  - 编写 Blender 导入指南
  - 添加常见问题解答
  - _需求: 2.1, 2.2_

- [ ] 6.3 更新部署日志
  - 记录 Cloudflare Pages 配置步骤
  - 记录遇到的问题和解决方案
  - _需求: 1.5, 5.5_

## 检查点

- [ ] 7. 最终验证
  - 确保所有测试通过
  - 验证所有需求已实现
  - 检查代码质量和注释
  - 验证部署成功且可访问
  - 用户测试反馈收集
