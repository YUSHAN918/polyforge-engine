# Cloudflare Pages 国内访问黑屏问题 - 完整日志

## 时间线：2025-12-18

---

## 问题描述

**核心问题：** 国内用户访问 Cloudflare Pages 部署的 3D 游戏编辑器时，页面加载几秒后黑屏。

**环境：**
- 项目：React + Three.js + Vite
- 部署平台：Cloudflare Pages
- 项目名：polyforge-engine
- 国内访问：无梯子时黑屏
- 国外访问/有梯子：正常

---

## 问题排查过程

### 第一阶段：CDN 依赖问题

#### 问题 1：被墙的外部 CDN
**现象：** 控制台显示多个资源加载失败
- `fonts.googleapis.com` - Google Fonts
- `fonts.gstatic.com` - Google 字体资源
- `aistudiocdn.com` - React/Three.js 的 importmap
- `cdn.tailwindcss.com` - Tailwind CSS

**解决方案：✅ 已完成**
1. 移除 `index.html` 中的所有外部 CDN 引用
2. 删除 importmap 配置
3. 安装本地依赖：
   ```bash
   npm install -D tailwindcss@^3 postcss autoprefixer @fortawesome/fontawesome-free
   ```
4. 创建配置文件：
   - `tailwind.config.js`
   - `postcss.config.js`
   - `index.css`

**结果：** CDN 问题解决，但黑屏依然存在

---

### 第二阶段：部署配置问题

#### 问题 2：wrangler.toml 配置错误
**现象：** `ERR_CONTENT_DECODING_FAILED` 和 `ERR_INVALID_RESPONSE`

**原因：** `wrangler.toml` 使用了 Workers 专用配置，但项目用的是 Pages

**解决方案：✅ 已完成**
简化 `wrangler.toml`：
```toml
name = "polyforge-engine"
compatibility_date = "2024-01-01"
```

**结果：** 文件编码问题解决，但黑屏依然存在

---

### 第三阶段：文件传输问题

#### 问题 3：JS 文件过大导致传输失败
**现象：** `ERR_CONTENT_LENGTH_MISMATCH` - 文件大小不匹配

**原因：** 打包后的 JS 文件 1.5MB，传输时不完整

**尝试的解决方案：**

1. **文件分块（失败）**
   - 配置 Rollup 手动分块
   - 结果：分块后 Three.js 模块引用错误，导致新的崩溃

2. **Terser 压缩（失败）**
   - 添加 terser 压缩配置
   - 结果：过度压缩破坏了 React 代码，导致 `Minified React error #418`

3. **回退到默认配置（当前状态）**
   - 移除所有优化配置
   - 使用 Vite 默认的 esbuild 压缩

**结果：** 传输问题缓解，但核心黑屏问题依然存在

---

### 第四阶段：代码运行时错误（当前阶段）

#### 问题 4：React error #418 - Hook 规则违反
**现象：** 
```
Uncaught Error: Could not load
Minified React error #418
at Object.useRef (index-COyAabJJ.js:formatted)
THREE.WebGLRenderer: Context lost
```

**已尝试的解决方案：**

1. **移除 Environment 组件（部分有效）**
   - 注释掉 `<Environment preset="city" />`
   - 原因：该组件尝试从 CDN 加载环境贴图
   - 结果：减少了一个 404 错误，但黑屏依然存在

2. **调整 Suspense 边界（无效）**
   - 将光照组件移出 Suspense
   - 结果：无改善

3. **禁用代码压缩（测试中）**
   - 设置 `minify: false`
   - 目的：获取完整错误信息以精确定位问题
   - 结果：待测试

4. **React 版本测试（无效）**
   - 尝试降级到 React 18
   - 发现：`@react-three/drei` 和 `@react-three/fiber` 要求 React 19
   - 结果：回退到 React 19

---

## 关键发现

### ✅ 已确认的事实

1. **本地开发环境正常**
   - `npm run dev` 完全正常
   - 所有功能可用

2. **本地生产构建也黑屏**
   - `npm run build && npm run preview` 同样黑屏
   - **说明问题不是 Cloudflare 部署环境导致的**
   - **问题在于代码在生产模式下的运行时错误**

3. **CDN 依赖已完全移除**
   - 所有资源都本地打包
   - 不再依赖被墙的外部服务

4. **错误是 React Hook 相关**
   - `Minified React error #418` 通常是 Hook 调用顺序问题
   - 但代码检查未发现明显的条件 Hook 调用

### ❓ 未解决的疑问

1. **为什么开发环境正常，生产环境崩溃？**
   - 可能是代码压缩导致的
   - 可能是某些动态引用在生产环境失效
   - 可能是 React 19 + Three.js 的兼容性问题

2. **具体是哪个组件/Hook 导致的错误？**
   - 错误信息被压缩，无法精确定位
   - 需要禁用压缩后重新测试

---

## 当前配置状态

### 已修改的文件

1. **index.html**
   - ✅ 移除所有 CDN 引用
   - ✅ 移除 importmap
   - ✅ 引用本地 CSS

2. **vite.config.ts**
   - ✅ 简化 build 配置
   - ✅ 移除分块配置
   - ✅ 移除 terser 配置
   - 🔄 当前：`minify: false`（测试中）

3. **wrangler.toml**
   - ✅ 移除 Workers 配置
   - ✅ 只保留基本信息

4. **components/GameCanvas.tsx**
   - ✅ 注释掉 `<Environment preset="city" />`
   - 🔄 调整了 Suspense 边界（效果不明显）

5. **新增文件**
   - ✅ `tailwind.config.js`
   - ✅ `postcss.config.js`
   - ✅ `index.css`
   - ✅ `deploy.bat`（自动部署脚本）

---

## 下一步建议

### 方案 A：深入调试（推荐）

1. **获取完整错误信息**
   - 当前已设置 `minify: false`
   - 重新部署后查看完整的错误堆栈
   - 精确定位是哪个组件/Hook 出问题

2. **逐步排除组件**
   - 创建最小可复现版本
   - 逐个移除功能模块，找到导致崩溃的组件

3. **检查 Three.js 相关代码**
   - 重点检查 `GameCanvas.tsx`
   - 检查 `Character3D.tsx`
   - 查看是否有条件渲染导致 Hook 顺序变化

### 方案 B：更换部署平台（备选）

如果代码问题难以解决，考虑：

1. **Vercel**
   - 对国内访问更友好
   - 自动优化和 CDN
   - 部署简单：`npx vercel`

2. **Netlify**
   - 类似 Vercel
   - 免费额度充足

3. **国内平台**
   - 阿里云 OSS + CDN
   - 腾讯云 COS + CDN
   - 完全避免墙的问题

### 方案 C：降级依赖（激进）

如果是兼容性问题：

1. 降级 `@react-three/drei` 和 `@react-three/fiber` 到稳定版本
2. 使用 React 18（需要检查兼容性）
3. 锁定 Three.js 版本到更稳定的版本

---

## 技术债务

### 需要注意的问题

1. **环境贴图缺失**
   - `public/assets/env/` 目录为空
   - 当前已注释掉 `<Environment>` 组件
   - 如需恢复，需要下载 HDR 文件

2. **代码压缩禁用**
   - 当前为了调试禁用了压缩
   - 生产环境文件会更大
   - 调试完成后需要重新启用

3. **Suspense 边界调整**
   - 光照组件被移出 Suspense
   - 可能影响加载体验
   - 需要后续优化

---

## 总结

**问题本质：** 代码在生产环境的运行时错误，与 React Hook 调用有关，而非部署或网络问题。

**已解决：** CDN 依赖、部署配置、文件传输问题

**未解决：** 核心的 React error #418 运行时错误

**建议：** 先完成方案 A 的调试，获取完整错误信息后再决定是否需要更换平台或降级依赖。

---

## 附录：有用的命令

```bash
# 本地开发
npm run dev

# 本地测试生产构建
npm run build && npm run preview

# 部署到 Cloudflare Pages
npx wrangler pages deploy dist --project-name=polyforge-engine --branch=main

# 或使用脚本
deploy.bat

# 清除缓存重新构建
rmdir /s /q dist
rmdir /s /q node_modules\.vite
npm run build
```

---

**日志创建时间：** 2025-12-18  
**最后更新：** 2025-12-18 14:00  
**状态：** 问题未解决，调试中
