# 🚀 PolyForge v1.3.0 - 快速开始

## 欢迎！

恭喜！PolyForge v1.3.0 的核心 ECS 架构第一阶段已经完成。新的引擎核心已经准备就绪，让我们来验证一下！

## 🎯 快速验证（3 步）

### 步骤 1: 启动开发服务器

```bash
npm run dev
```

### 步骤 2: 打开浏览器

访问 `http://localhost:5173`（或控制台显示的地址）

### 步骤 3: 打开控制台并运行演示

按 `F12` 打开浏览器控制台，然后运行：

```javascript
window.quickDemo()
```

## ✅ 预期结果

你应该看到类似这样的输出：

```
🎮 PolyForge v1.3.0 - Quick Demo

✓ EntityManager created
✓ Components registered
✓ Player created: [unique-id]
✓ Socket added to player
✓ Weapon created: [unique-id]
✓ Weapon attached to player

📊 Hierarchy Check:
  Player children: 1
  Weapon parent: Player
  Socket occupied: true

🔍 Query Test:
  Entities with Transform: 2
  Entities with Transform + Name: 2

💾 Serialization Test:
  Serialized size: 1.23 KB
  Entities serialized: 2

📖 Component Data:
  Player position: [0, 0, 0]
  Player name: Hero
  Player description: The main character

📈 Statistics:
  Total entities: 2
  Active entities: 2
  Root entities: 1
  Component types: 2
  Avg components/entity: 2.00

✅ Demo completed successfully!
🎉 New ECS core is working perfectly!
```

## 🎮 可用命令

在浏览器控制台中，你可以运行：

### 快速演示（推荐）
```javascript
window.quickDemo()
```
简洁的输出，展示核心功能。

### 完整测试套件
```javascript
window.runPolyForgeTests()
```
运行所有单元测试和详细演示。

## 📚 深入了解

### 核心文档
- [第一阶段交付报告](PHASE1_DELIVERY.md) - 完整的交付内容
- [验证报告](VERIFICATION.md) - 详细的验证结果
- [核心模块文档](src/core/README.md) - API 和使用指南

### 规范文档
- [需求文档](.kiro/specs/v1.3.0-core-architecture/requirements.md)
- [设计文档](.kiro/specs/v1.3.0-core-architecture/design.md)
- [任务清单](.kiro/specs/v1.3.0-core-architecture/tasks.md)

## 🔍 代码示例

想在代码中使用新的 ECS 系统？试试这个：

```typescript
import { EntityManager, TransformComponent, NameComponent } from './core';

// 创建管理器
const manager = new EntityManager();

// 注册组件
manager.registerComponent('Transform', TransformComponent);
manager.registerComponent('Name', NameComponent);

// 创建实体
const player = manager.createEntity('Player');
manager.addComponent(player.id, new TransformComponent([0, 0, 0]));
manager.addComponent(player.id, new NameComponent('Hero'));

// 查询实体
const entities = manager.getEntitiesWithComponents(['Transform', 'Name']);
console.log(`Found ${entities.length} entities`);

// 序列化
const data = manager.serializeAll();
console.log('Serialized:', JSON.stringify(data, null, 2));
```

## 🎯 已完成的功能

✅ Entity 系统（唯一 ID、组件容器、层级关系）  
✅ Component 系统（标准接口、序列化支持）  
✅ EntityManager（高效查询、层级管理）  
✅ Socket/Anchor 挂点系统  
✅ 完整的序列化/反序列化  
✅ 全面的单元测试  
✅ 详尽的文档  

## 🚀 下一步

根据任务清单，接下来将实现：

1. **SystemManager** - 系统管理器
2. **SerializationService** - 序列化服务
3. **更多组件类型** - Visual, Physics, Rig 等

## ❓ 常见问题

### Q: 新系统会影响现有功能吗？
A: 不会！我们采用**影子构建**策略，新系统在 `src/core/` 目录下独立运行，完全不影响现有代码。

### Q: 如何查看测试结果？
A: 在浏览器控制台运行 `window.quickDemo()` 或 `window.runPolyForgeTests()`。

### Q: 性能如何？
A: 非常好！创建 1000 个实体 < 10ms，查询 < 1ms。详见 [验证报告](VERIFICATION.md)。

### Q: 如何开始下一阶段？
A: 查看 [任务清单](.kiro/specs/v1.3.0-core-architecture/tasks.md) 中的任务 1.3。

## 🎉 恭喜！

你已经成功完成了 PolyForge v1.3.0 核心架构的第一阶段！

新的 ECS 引擎核心已经准备就绪，可以开始构建更强大的功能了。

---

**需要帮助？** 查看文档或在控制台运行演示脚本。  
**准备继续？** 查看任务清单开始下一阶段的开发。

Happy Coding! 🚀
