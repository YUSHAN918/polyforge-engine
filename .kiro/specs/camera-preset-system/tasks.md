# 实施任务清单 - 相机预设系统 (Camera Preset System)

## 概述

本任务清单将设计文档转化为可执行的开发任务，按照小步迭代原则分为5个阶段。每个阶段都有明确的目标、任务清单和验收标准。

**实施原则**：
- **小步迭代**：每个阶段独立验收，确保稳定性
- **求稳优先**：保持 OrbitStrategy 🔒 FROZEN，渐进式修改
- **测试驱动**：每个阶段都包含测试任务
- **性能保证**：切换延迟 < 100ms，FPS ≥ 60

**优先级说明**：
- ⭐⭐⭐⭐⭐ - 核心功能，必须完成
- ⭐⭐⭐⭐ - 重要功能，强烈推荐
- ⭐⭐⭐ - 增强功能，可选但推荐

---

## 阶段 1：核心架构（优先级：⭐⭐⭐⭐⭐） ✅ 已完成

**目标**：实现 CameraPresetManager 和统一绑定逻辑，解决所有相机切换问题

### 任务清单
(已折叠，详见历史记录)

---

## 阶段 2：Strategy 清理增强（优先级：⭐⭐⭐⭐） ✅ 已完成

**目标**：增强所有 Strategy 的 exit() 方法，确保状态完全重置，实现零污染的视角切换

### 任务清单
(已折叠，详见历史记录)

---

## 阶段 2.5：机制修复与优化 (验收反馈) ✅ 已完成
 
 **目标**：解决用户在手动验收中发现的交互、视角跟随和回退机制问题。
 
 ### 任务清单
 
 - [x] 2.5.1 **TPS 视角跟随修复**
   - [x] 分析 ThirdPersonStrategy.updateTarget 逻辑
   - [x] 修复 offset 计算错误（应使用球面坐标 distance + pitch + yaw）
   - [x] 验证：角色移动时，相机应紧随其后
 
 - [x] 2.5.2 **侧轴 (Sidescroll) 视角修正**
   - [x] 修正 SidescrollStrategy 的旋转逻辑（强制 [0, 0, 0]）
   - [x] 确保 distance 正确应用到 Z 轴
   - [x] 修正：防止受到 inputSystem.resetFrameData 之前的残留输入影响
 
 - [x] 2.5.3 **FPS 自动回退修复**
   - [x] 调试 CameraSystem.update 中的回退检测逻辑
   - [x] 确保 deleteEntity 后下一帧立即触发 fallback
   - [x] 验证 UI 能够响应 activePreset: 'fps' -> 'iso' 的变化
 
 - [x] 2.5.4 **UI 交互优化 (无角色状态)**
   - [x] 修改 ArchitectureValidationPanel
   - [x] 获取当前是否在控制角色 (hasTarget)
   - [x] 如果无角色，禁用 bindTarget=true 的预设按钮 (FPS/TPS/Sidescroll)
   - [x] 添加 title/tooltip 提示 "需生成角色"
 
 - [x] 2.5.5 **ISO 视角一致性**
   - [x] 统一 CameraPresetManager 中 ISO 预设参数与 fallbackToSafePreset 的参数
   - [x] 确保删除角色后回退的 ISO 视角与初始 ISO 视角一致

---

## 阶段 3：防穿墙机制（优先级：⭐⭐⭐） ⏸️ 暂停

**目标**：实现全局防穿墙检测，为所有绑定角色的预设提供统一的防穿墙能力

### 任务清单

- [ ] 3.1 在 CameraSystem 中实现防穿墙检测（2h）
  - [ ] 3.1.1 打开 `src/core/systems/CameraSystem.ts`
  - [ ] 3.1.2 添加缓存的 Raycaster 实例
  - [ ] 3.1.3 实现 applyCollisionDetection() 私有方法
  - [ ] 3.1.4 添加性能优化注释

- [ ] 3.2 实现场景几何体获取（1h）
  - [ ] 3.2.1 实现 getSceneGeometry() 私有方法
  - [ ] 3.2.2 从 WorldStateManager 获取地形
  - [ ] 3.2.3 从 EntityManager 获取具有碰撞体的实体
  - [ ] 3.2.4 返回 THREE.Object3D[] 数组

- [ ] 3.3 集成到 Strategy（1.5h）
  - [ ] 3.3.1 集成到 IsometricStrategy
  - [ ] 3.3.2 集成到 ThirdPersonStrategy
  - [ ] 3.3.3 集成到 SidescrollStrategy

- [ ] 3.4 配置与测试（1.5h）
  - [ ] 3.4.1 确认 CameraComponent.enableCollision 字段
  - [ ] 3.4.2 创建性能测试 `CameraSystem.collision.test.ts`
  - [ ] 3.4.3 手动验证墙角堆叠情况

---

## 阶段 4：UI 集成（优先级：⭐⭐⭐⭐） ✅ 已完成

**目标**：在 UI 中集成预设选择器，实现一键切换视角的用户体验

### 任务清单
(已折叠，详见历史记录)

---
