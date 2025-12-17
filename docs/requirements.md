# 需求文档

## 简介

本文档定义了 LOW3D 游戏模拟编辑器 V1.1.0 版本的功能需求。该版本主要解决两个核心痛点：
1. 部署访问问题（Vercel 在中国大陆无法访问）
2. 3D 模型导出功能缺失

本版本将实现 Cloudflare Pages 部署迁移和 GLB 模型导出功能，提升用户体验和产品可用性。

## 术语表

- **System**: LOW3D 游戏模拟编辑器系统
- **User**: 使用编辑器的开发者或创作者
- **GLB**: GL Transmission Format Binary，一种 3D 模型文件格式
- **GLTFExporter**: Three.js 提供的 GLTF/GLB 导出工具类
- **Cloudflare Pages**: Cloudflare 提供的静态网站托管服务
- **GitHub Actions**: GitHub 提供的 CI/CD 自动化工具
- **Character3D**: 系统中的 3D 角色组件
- **CustomModel**: 用户创建的自定义 3D 模型资产
- **Scene**: Three.js 场景对象，包含所有 3D 对象
- **Mesh**: Three.js 网格对象，表示 3D 几何体

## 需求

### 需求 1：Cloudflare Pages 部署迁移

**用户故事**：作为中国大陆用户，我希望能够稳定访问 LOW3D 编辑器，以便我可以正常使用编辑功能而不受网络限制。

#### 验收标准

1. WHEN 用户通过 Cloudflare Pages 域名访问应用 THEN System SHALL 成功加载完整的编辑器界面
2. WHEN 代码推送到 main 分支 THEN GitHub Actions SHALL 自动触发构建并部署到 Cloudflare Pages
3. WHEN 构建过程完成 THEN System SHALL 生成可访问的生产环境 URL
4. WHEN 用户在中国大陆网络环境下访问 THEN System SHALL 在 3 秒内完成首屏加载
5. WHEN 部署失败 THEN GitHub Actions SHALL 记录详细错误日志并通知开发者

### 需求 2：GLB 模型导出功能

**用户故事**：作为 3D 创作者，我希望能够将编辑器中创建的角色和模型导出为 GLB 文件，以便我可以在其他 3D 软件（如 Blender、Unity）中使用这些资产。

#### 验收标准

1. WHEN 用户在角色编辑器模式下点击"导出 GLB"按钮 THEN System SHALL 将当前角色（包括身体、装备、颜色）导出为单个 GLB 文件
2. WHEN 用户在模型工坊模式下点击"导出 GLB"按钮 THEN System SHALL 将当前编辑的自定义模型导出为 GLB 文件
3. WHEN 导出过程开始 THEN System SHALL 显示加载指示器并禁用导出按钮
4. WHEN 导出完成 THEN System SHALL 自动触发浏览器下载，文件名格式为 `{模型名称}_{时间戳}.glb`
5. WHEN 导出的 GLB 文件在 Blender 中打开 THEN 文件 SHALL 正确显示所有几何体、材质和颜色
6. WHEN 导出过程中发生错误 THEN System SHALL 显示用户友好的错误提示并记录详细错误信息到控制台
7. WHEN 用户导出包含多个部件的复杂模型 THEN System SHALL 保持所有部件的相对位置、旋转和缩放关系

### 需求 3：导出功能用户界面

**用户故事**：作为用户，我希望导出功能的入口清晰易找，以便我可以快速完成导出操作。

#### 验收标准

1. WHEN 用户处于角色编辑器模式 THEN System SHALL 在编辑面板中显示"导出 GLB"按钮
2. WHEN 用户处于模型工坊模式 THEN System SHALL 在工具栏中显示"导出 GLB"按钮
3. WHEN 用户点击导出按钮 THEN System SHALL 显示导出进度反馈（加载动画或进度条）
4. WHEN 导出成功 THEN System SHALL 显示成功提示消息（持续 2 秒后自动消失）
5. WHEN 导出失败 THEN System SHALL 显示错误提示消息并提供重试选项

### 需求 4：导出数据完整性

**用户故事**：作为 3D 创作者，我希望导出的 GLB 文件包含完整的模型数据，以便我可以在其他软件中进行进一步编辑。

#### 验收标准

1. WHEN 导出角色模型 THEN GLB 文件 SHALL 包含所有可见的几何体（头部、身体、四肢、装备）
2. WHEN 导出自定义模型 THEN GLB 文件 SHALL 包含所有图元（primitives）及其变换属性
3. WHEN 模型包含颜色信息 THEN GLB 文件 SHALL 保留所有材质的颜色属性
4. WHEN 模型包含多个子对象 THEN GLB 文件 SHALL 保持正确的层级结构
5. WHEN 导出的 GLB 文件大小超过 10MB THEN System SHALL 警告用户文件过大

### 需求 5：部署配置管理

**用户故事**：作为开发者，我希望部署配置清晰且易于维护，以便我可以快速排查部署问题。

#### 验收标准

1. WHEN 项目根目录存在 wrangler.toml 配置文件 THEN 文件 SHALL 包含正确的 Cloudflare Pages 项目名称和构建命令
2. WHEN GitHub Actions 工作流文件存在 THEN 文件 SHALL 包含 Cloudflare Pages 部署步骤
3. WHEN 环境变量需要配置 THEN System SHALL 在 README 中提供清晰的配置说明
4. WHEN 部署配置更新 THEN System SHALL 在下次推送时自动应用新配置
5. WHEN 开发者查看部署日志 THEN Cloudflare Pages 控制台 SHALL 显示详细的构建和部署日志
