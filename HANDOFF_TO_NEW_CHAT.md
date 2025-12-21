# PolyForge v1.3.0 - 新窗口交接文档

## 🎯 项目身份

**你是 PolyForge 资深架构师**
- 愿景：让做游戏像玩游戏一样简单
- 任务：v1.3.0 核心架构升级（ECS 引擎）

## 🔒 铁律（必须遵守）

1. **影子构建**：所有核心代码限制在 `src/core/` 目录
2. **彻底去 CDN**：零外部依赖，所有资源本地化（如 Draco 路径 `/draco/`）
3. **ECS 架构**：纯粹的 Entity-Component-System 模式
4. **中文沟通**：始终使用中文与制作人交流

## 📋 关键文档位置

- **需求文档**：`.kiro/specs/v1.3.0-core-architecture/.kiro/specs/v1.3.0-core-architecture/requirements.md`
- **设计文档**：`.kiro/specs/v1.3.0-core-architecture/.kiro/specs/v1.3.0-core-architecture/design.md`
- **任务清单**：`.kiro/specs/v1.3.0-core-architecture/.kiro/specs/v1.3.0-core-architecture/tasks.md`

## ✅ 已完成模块（60% 完成度）

### 核心 ECS（100%）
- ✅ EntityManager、ComponentRegistry、SystemManager
- ✅ SerializationService（JSON 序列化）
- ✅ 所有核心组件：Transform、Visual、Rig、Physics、Vehicle、AudioSource、Camera

### 核心系统（100%）
- ✅ Socket/Anchor 挂点系统（层级嵌套）
- ✅ Clock 时钟系统（TimeScale、子弹时间）
- ✅ CommandManager（撤销/重做）
- ✅ InputSystem（3 套预设、上下文栈）
- ✅ PhysicsSystem（Rapier 集成）
- ✅ CameraSystem（5 种模式）

### 资产管线（50%）
- ✅ **7.1** IndexedDBStorage（300+ 行）
- ✅ **7.2** ModelImporter（Draco 压缩、缩略图）
- ✅ **7.3** AudioImporter（原生 Web Audio API）
  - 文件：`src/core/assets/AudioImporter.ts`
  - 功能：MP3/WAV/OGG 解析、元数据提取、即时预览
  - 演示：`audioUploadDemo()` 完整 UI
- ⏳ **7.4** HDR 贴图导入（下一任务）
- ⏳ **7.5** 资产查询和删除
- ⏳ **7.6** 本地文件系统访问

## 🎯 下一步：Phase 7.4 - HDR 贴图导入

### 需求（需求 6.4）
- 解析 HDR 格式（.hdr 文件）
- 生成预览缩略图
- 存储到 IndexedDB

### 实现要点
1. **创建 HDRImporter.ts**
   - 使用 Three.js 的 RGBELoader 解析 .hdr 文件
   - 提取元数据：width、height、format
   - 生成 128x128 缩略图（Base64）

2. **集成到 AssetRegistry**
   - 添加 `importHDR(file: File)` 方法
   - 存储为 Blob 到 IndexedDB
   - 类型标记为 `AssetType.HDR`

3. **演示 UI**
   - 在 `assetDemo.ts` 添加 `hdrUploadDemo()`
   - 显示 HDR 信息和缩略图
   - 可选：简单的环境预览

### 参考模式
- 参考 `ModelImporter.ts` 的结构
- 参考 `AudioImporter.ts` 的元数据提取
- 保持零第三方依赖（除 Three.js 已有的）

## 📁 关键文件结构

```
src/core/
├── assets/
│   ├── AssetRegistry.ts      # 单例注册表
│   ├── IndexedDBStorage.ts   # 持久化层
│   ├── ModelImporter.ts      # ✅ 模型导入
│   ├── AudioImporter.ts      # ✅ 音频导入
│   ├── HDRImporter.ts        # ⏳ 下一步创建
│   └── types.ts              # 类型定义
├── assetDemo.ts              # 演示 UI
└── index.ts                  # 模块导出
```

## 🔧 技术栈

- **语言**：TypeScript
- **渲染**：Three.js + React Three Fiber (R3F)
- **物理**：@dimforge/rapier3d
- **存储**：原生 IndexedDB
- **音频**：原生 Web Audio API
- **构建**：Vite

## 📊 进度统计

- **总任务**：17 个主要模块
- **已完成**：10 个模块（ECS、组件、系统、部分资产）
- **进行中**：资产管线（7.1-7.3 完成，7.4-7.7 待完成）
- **待开始**：AudioSystem、WorldStateManager、RenderSystem、Bundle、MOD

## 💡 架构原则

1. **数据驱动**：配置优于硬编码
2. **组件化**：组合优于继承
3. **可序列化**：完整 JSON 支持
4. **本地优先**：零外部依赖
5. **MOD 友好**：动态加载扩展

## 🚀 启动新窗口的第一句话

```
制作人好！我是 PolyForge 资深架构师，已读取交接文档。

当前进度：Phase 7.3 音频导入已完成，准备开始 Phase 7.4 HDR 贴图导入。

请确认：是否立即开始 Phase 7.4？
```

## 📝 重要提醒

1. **始终先读取规范文档**：requirements.md、design.md、tasks.md
2. **遵守铁律**：影子构建、去 CDN、ECS 架构、中文沟通
3. **参考已完成模块**：ModelImporter 和 AudioImporter 是最佳范例
4. **保持代码风格一致**：注释、命名、结构
5. **每个阶段完成后创建完成报告**：如 `PHASE7.3_AUDIO_IMPORT_COMPLETION.md`

---

**制作人，祝新窗口开发顺利！让我们继续打造这个让做游戏像玩游戏一样简单的引擎！** 🎮✨
