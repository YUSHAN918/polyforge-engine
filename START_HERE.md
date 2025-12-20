# 🚀 PolyForge v1.3.0 - 快速开始

## 欢迎！

恭喜！PolyForge v1.3.0 的核心 ECS 架构已经完成了**任务 1.1, 1.2 和 1.3**。新的引擎核心已经准备就绪，现在实体可以随着系统更新而"活动"了！

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

✓ EntityManager & SystemManager created
✓ Components registered
✓ MovementSystem registered
✓ Player created: [unique-id]
✓ Socket added to player
✓ Weapon created: [unique-id]
✓ Weapon attached to player

📊 Hierarchy Check:
  Player children: 1
  Weapon parent: Player
  Socket occupied: true

💓 System Heartbeat (5 beats):
  Beat 1: Position [0.123, -0.045, 0.089]
  Beat 2: Position [0.245, -0.091, 0.178]
  Beat 3: Position [0.368, -0.136, 0.267]
  Beat 4: Position [0.490, -0.182, 0.356]
  Beat 5: Position [0.613, -0.227, 0.445]

✅ Demo completed successfully!
🎉 New ECS core with SystemManager is working perfectly!
```

**注意位置变化！** 实体的 Transform 组件在每次心跳后都会改变，这证明 SystemManager 正在工作！

## 🎮 可用命令

在浏览器控制台中，你可以运行：

### 快速演示（推荐）
```javascript
window.quickDemo()
```
展示核心功能 + 系统心跳。

### 系统演示
```javascript
window.systemDemo()
```
完整的游戏循环模拟，10 帧更新。

### 心跳演示
```javascript
window.heartbeatDemo()
```
最简洁的演示，清晰展示系统更新。

### 完整测试套件
```javascript
window.runPolyForgeTests()
```
运行所有单元测试和详细演示。

## 📚 深入了解

### 最新交付
- [任务 1.3 交付报告](PHASE1.3_DELIVERY.md) - SystemManager 实现
- [第一阶段交付报告](PHASE1_DELIVERY.md) - Entity & EntityManager
- [验证报告](VERIFICATION.md) - 详细的验证结果

### 核心文档
- [核心模块文档](src/core/README.md) - API 和使用指南

### 规范文档
- [需求文档](.kiro/specs/v1.3.0-core-architecture/requirements.md)
- [设计文档](.kiro/specs/v1.3.0-core-architecture/design.md)
- [任务清单](.kiro/specs/v1.3.0-core-architecture/tasks.md)

## 🔍 代码示例

想在代码中使用新的 ECS 系统？试试这个：

```typescript
import { 
  EntityManager, 
  SystemManager,
  TransformComponent, 
  NameComponent,
  MovementSystem 
} from './core';

// 创建管理器
const entityManager = new EntityManager();
const systemManager = new SystemManager(entityManager);
entityManager.setSystemManager(systemManager);

// 注册组件
entityManager.registerComponent('Transform', TransformComponent);
entityManager.registerComponent('Name', NameComponent);

// 注册系统
systemManager.registerSystem('MovementSystem', new MovementSystem());

// 创建实体
const player = entityManager.createEntity('Player');
entityManager.addComponent(player.id, new TransformComponent([0, 0, 0]));
entityManager.addComponent(player.id, new NameComponent('Hero'));

// 游戏循环
function gameLoop() {
  const deltaTime = 0.016; // 60 FPS
  systemManager.update(deltaTime);
  
  // 读取更新后的位置
  const transform = player.getComponent<TransformComponent>('Transform');
  console.log('Position:', transform?.position);
  
  requestAnimationFrame(gameLoop);
}

gameLoop();
```

## 🎯 已完成的功能

✅ Entity 系统（唯一 ID、组件容器、层级关系）  
✅ Component 系统（标准接口、序列化支持）  
✅ EntityManager（高效查询、层级管理）  
✅ **SystemManager（系统注册、优先级排序、更新循环）** ⭐ 新！  
✅ Socket/Anchor 挂点系统  
✅ 完整的序列化/反序列化  
✅ 全面的单元测试  
✅ 详尽的文档  

## 🚀 下一步

根据任务清单，接下来将实现：

1. **SerializationService** - 序列化服务
2. **更多组件类型** - Visual, Physics, Rig 等
3. **Clock 系统** - 时间管理

## ❓ 常见问题

### Q: 新系统会影响现有功能吗？
A: 不会！我们采用**影子构建**策略，新系统在 `src/core/` 目录下独立运行，完全不影响现有代码。

### Q: 如何查看系统更新效果？
A: 在浏览器控制台运行 `window.quickDemo()` 或 `window.heartbeatDemo()`，观察实体位置的变化。

### Q: SystemManager 是如何工作的？
A: SystemManager 管理所有系统，按优先级排序，每帧调用 `update()`，自动查询和传递需要的实体。

### Q: 性能如何？
A: 非常好！创建 1000 个实体 < 10ms，查询 < 1ms，系统更新高效。详见 [验证报告](VERIFICATION.md)。

### Q: 如何创建自定义系统？
A: 实现 `System` 接口，定义 `priority` 和 `requiredComponents`，然后注册到 SystemManager。

## 🎉 恭喜！

你已经成功完成了 PolyForge v1.3.0 核心架构的前三个任务！

新的 ECS 引擎核心已经准备就绪，实体现在可以随着系统更新而"活动"了。SystemManager 为引擎注入了真正的生命力！

---

**需要帮助？** 查看文档或在控制台运行演示脚本。  
**准备继续？** 查看任务清单开始下一阶段的开发。

Happy Coding! 🚀💓

