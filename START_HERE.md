# 🚀 PolyForge v1.3.0 - 快速开始

## 🎊 第一阶段完全封顶！

恭喜！PolyForge v1.3.0 的核心 ECS 架构**第一阶段（任务 1.1-1.4）已全部完成**！新的引擎核心已经准备就绪，实体可以随着系统更新而"活动"，作品可以像文本一样轻便地分享！

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

✓ EntityManager, SystemManager & SerializationService created
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

💓 System Heartbeat (3 beats):
  Beat 1: Position [0.123, -0.045, 0.089]
  Beat 2: Position [0.245, -0.091, 0.178]
  Beat 3: Position [0.368, -0.136, 0.267]

💾 Serialization Test (Shadow Save):
  Position before save: [0.368, -0.136, 0.267]
  ✓ Exported: 2 entities, 1.45 KB
  ✓ World cleared: 0 entities
  ✓ Imported: 2 entities
  Position after restore: [0.368, -0.136, 0.267]
  Position matches: ✅ YES

✅ Demo completed successfully!
🎉 ECS core with SystemManager and SerializationService is working perfectly!
```

**关键验证点：**
- ✅ 实体随系统更新而移动（心跳）
- ✅ 序列化导出成功
- ✅ 清空世界后完美恢复
- ✅ **位置完美匹配！**

## 🎮 可用命令

在浏览器控制台中，你可以运行：

### 快速演示（推荐）⭐
```javascript
window.quickDemo()
```
展示所有核心功能：Entity、System、Serialization。

### 序列化演示 🆕
```javascript
window.serializationDemo()
```
完整的存档和恢复流程演示。

### 快照演示 🆕
```javascript
window.snapshotDemo()
```
时间旅行功能演示（撤销/重做）。

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
- [任务 1.4 交付报告](PHASE1.4_DELIVERY.md) - SerializationService 实现 🆕
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
  SerializationService,
  TransformComponent, 
  NameComponent,
  MovementSystem 
} from './core';

// 创建管理器
const entityManager = new EntityManager();
const systemManager = new SystemManager(entityManager);
const serializationService = new SerializationService(entityManager);
entityManager.setSystemManager(systemManager);

// 注册组件和系统
entityManager.registerComponent('Transform', TransformComponent);
entityManager.registerComponent('Name', NameComponent);
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

// 保存游戏
const json = serializationService.serializeToJSON({ name: 'My Save' });
localStorage.setItem('save', json);

// 加载游戏
const saved = localStorage.getItem('save');
if (saved) {
  serializationService.deserializeFromJSON(saved);
}

gameLoop();
```

## 🎯 已完成的功能

### 第一阶段（已完成）✅

✅ **Entity 系统**（唯一 ID、组件容器、层级关系）  
✅ **Component 系统**（标准接口、序列化支持）  
✅ **EntityManager**（高效查询、层级管理）  
✅ **SystemManager**（系统注册、优先级排序、更新循环）  
✅ **SerializationService**（完整序列化、数据验证、快照系统）🆕  
✅ **Socket/Anchor 挂点系统**  
✅ **完整的序列化/反序列化**  
✅ **全面的单元测试**  
✅ **详尽的文档**  

## 🚀 下一步

第一阶段已完全封顶！接下来可以开始：

### 阶段 2: 核心组件实现
1. **VisualComponent** - 视觉组件
2. **RigComponent** - 骨骼组件
3. **PhysicsComponent** - 物理组件
4. **VehicleComponent** - 载具组件
5. **AudioSourceComponent** - 音频源组件

### 阶段 3: Socket/Anchor 系统增强
1. **层级变换传播** - 自动更新子实体

### 阶段 4: Clock 时钟系统
1. **Clock 类** - 时间管理
2. **TimeScale 支持** - 子弹时间

## ❓ 常见问题

### Q: 新系统会影响现有功能吗？
A: 不会！我们采用**影子构建**策略，新系统在 `src/core/` 目录下独立运行，完全不影响现有代码。

### Q: 如何查看序列化效果？
A: 在浏览器控制台运行 `window.quickDemo()` 或 `window.serializationDemo()`，观察存档和恢复过程。

### Q: 序列化后的数据有多大？
A: 非常精简！2 个实体约 1.5 KB。数据结构经过优化，只保存必要信息。

### Q: 如何实现撤销/重做？
A: 使用快照系统：
```javascript
const snapshot = serializationService.createSnapshot('Label');
// 做一些操作...
serializationService.restoreSnapshot(snapshot); // 撤销！
```

### Q: 性能如何？
A: 非常好！创建 1000 个实体 < 10ms，查询 < 1ms，序列化 < 100ms。详见 [验证报告](VERIFICATION.md)。

### Q: 如何分享作品？
A: 导出为 JSON 文件：
```javascript
const json = serializationService.serializeToJSON({ name: 'My Creation' }, true);
// 保存为文件或分享 JSON 文本
```

## 🎉 恭喜！

你已经成功完成了 PolyForge v1.3.0 核心架构的**第一阶段全部任务**！

新的 ECS 引擎核心已经准备就绪：
- 💓 实体可以随着系统更新而"活动"
- 💾 作品可以像文本一样轻便地分享
- ⏱️ 支持时间旅行（快照系统）
- 🎊 地基彻底封顶！

---

**需要帮助？** 查看文档或在控制台运行演示脚本。  
**准备继续？** 查看任务清单开始第二阶段的开发。

Happy Coding! 🚀💓💾


