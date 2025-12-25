# Implementation Plan: Vegetation Scale and Wind Fix

## Overview

本实现计划将植被系统的数据驱动架构修复分为三个阶段：数据层净化、渲染层动态合成、风场空间修正。每个阶段都包含具体的代码修改任务和验证步骤。

## Tasks

- [ ] 1. Phase 1: 数据层净化
  - 修改 VegetationSystem.generateVegetation() 方法
  - 移除对动态配置的依赖
  - 使用标准化的缩放值
  - _Requirements: 1.1, 1.2, 1.4_

- [ ] 1.1 修改 generateVegetation() 中的缩放计算逻辑
  - 定位到 `src/core/systems/VegetationSystem.ts` 的 `generateVegetation()` 方法
  - 找到当前的缩放计算代码（可能引用了 config.minHeight, maxHeight 等）
  - 替换为固定的标准化逻辑：`baseScale = 1.0`, `randomVariation = 0.8 + rng() * 0.4`
  - 确保所有实例的 scale 值在 [0.8, 1.2] 范围内
  - _Requirements: 1.1_


- [ ] 1.2 编写数据层纯净性单元测试
  - 创建测试文件：`src/core/systems/__tests__/VegetationSystem.dataPurity.test.ts`
  - 测试用例 1：验证生成的实例 scale 在 [0.8, 1.2] 范围内
  - 测试用例 2：验证相同种子生成相同的实例数据（不受 globalScale 影响）
  - 测试用例 3：验证修改 globalScale 不触发实例重新生成
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 1.3 验证数据层修复效果
  - 在浏览器控制台运行 `window.vegetationDemo()`
  - 生成草地，记录实例数据
  - 修改 globalScale，验证实例数据不变
  - _Requirements: 1.3, 1.4_

- [ ] 2. Phase 2: 渲染层 Uniform 动态缩放
  - 修改 VegetationVisual 以支持 `uGlobalScale` Uniform
  - 实现响应式 Uniform 更新 Effect
  - 确保 VegetationSystem 矩阵灌入中移除了缩放合并逻辑
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2.1 验证并修改 injectMatricesToMesh()
  - 检查 `src/core/systems/VegetationSystem.ts` 中的 `injectMatricesToMesh()`
  - **移除** 涉及 `globalScale` 的矩阵乘法，仅灌入标准化实例缩放
  - 确认 `mesh.instanceMatrix.needsUpdate = true` 仅在数据变脏时触发
  - _Requirements: 2.5_


- [ ] 2.2 实现 VegetationVisual 的 Uniform 更新逻辑
  - 打开 `src/components/rendering/VegetationVisual.tsx`
  - 在 `useEffect` 中通过 `meshRef.current.material.uniforms.uGlobalScale.value` 实时更新缩放值
  - 确保不触发 `veg.isScaleDirty = true`（除非密度/种子变化）
  - _Requirements: 2.1, 2.2, 2.4_

- [ ] 2.3 编写 Uniform 更新单元测试
  - 创建/更新测试文件：`src/core/systems/__tests__/VegetationSystem.dynamicScale.test.ts`
  - 测试用例 1：验证 `injectMatricesToMesh` 不包含 `globalScale` 因子
  - 测试用例 2：验证 `uGlobalScale` Uniform 随滑块正确更新
  - 测试用例 3：验证滑块拖动时不触发矩阵重新灌入
  - _Requirements: 2.3, 2.4_

- [ ] 2.4 手动验证缩放一致性
  - 打开架构验证观测窗口
  - 生成草地 (5000)
  - 调整"草地缩放"滑块到 0.5
  - 再次生成草地 (5000)
  - 验证新旧草地大小完全一致
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 3. Checkpoint - 验证 Phase 1 和 Phase 2 完成
  - 确保所有测试通过
  - 确保缩放一致性验证通过
  - 如有问题，向用户报告并等待指导


- [ ] 4. Phase 3: Vertex Shader 综合优化 (缩放与风场)
  - 在 Wind Shader 中注入 `uGlobalScale`
  - 实现世界空间风场采样与转置矩阵投影
  - 验证 GPU 侧混合缩放效果
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 2.3_

- [ ] 4.1 修改 Vertex Shader 核心逻辑
  - 打开 `src/components/rendering/VegetationVisual.tsx`
  - **缩放应用**：插入 `transformed *= uGlobalScale;`
  - **空间转换**：使用 `instanceRot * worldWindDir` (等效于乘转置) 替代 `inverse`
  - **风场采样**：基于 `uGlobalScale` 抵消后的偏移量应用位移
  - _Requirements: 3.1, 3.2, 3.4, 2.3_

- [ ] 4.2 编写 Shader 综合单元测试
  - 创建测试文件：`src/components/rendering/__tests__/VegetationVisual.shader.test.ts`
  - 测试用例 1：验证 Shader 包含 `uGlobalScale` 的乘法操作
  - 测试用例 2：验证风场逻辑不再包含 `inverse()` 调用
  - 测试用例 3：验证风场位移在世界坐标下的方向一致性
  - _Requirements: 3.1, 3.2, 3.3_


- [ ] 4.3 手动验证风向统一性
  - 在架构验证观测窗口中生成草地
  - 观察草地摆动方向
  - 验证所有草地沿统一方向（X 轴正方向）摆动
  - 验证形成连续的波浪效果（"麦浪"效果）
  - 验证不同旋转角度的草摆动方向相同
  - _Requirements: 3.3, 3.4, 3.5_

- [ ] 5. 最终验证和性能测试
  - 运行所有测试套件
  - 进行性能基准测试
  - 确保修复没有引入性能退化
  - _Requirements: 4.3, 4.4, 4.5_

- [ ] 5.1 运行回归测试
  - 执行命令：`npm test -- VegetationSystem`
  - 执行命令：`npm test -- rendering`
  - 验证所有现有测试保持通过状态
  - _Requirements: 4.4_

- [ ] 5.2 性能基准测试
  - 生成 15,000 个草地实例
  - 记录 FPS（应 ≥ 55）
  - 记录内存使用（应 ≤ 165MB）
  - 拖动"草地缩放"滑块，验证无明显卡顿
  - 如果性能下降超过 10%，需要优化
  - _Requirements: 4.3, 4.5_

- [ ] 5.3 最终视觉验证
  - 在架构验证观测窗口中进行完整演示
  - 验证缩放一致性：新旧草地大小一致
  - 验证风向统一性：整齐划一的"麦浪"效果
  - 验证实时响应：滑块拖动时立即生效
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.3, 3.4, 3.5_

- [ ] 6. Final Checkpoint - 确保所有测试通过
  - 确保所有单元测试通过
  - 确保所有手动验证通过
  - 确保性能基准达标
  - 向用户报告修复完成

## Notes

- 任务标记 `*` 的为可选测试任务，可根据项目需求决定是否实施
- Phase 1 和 Phase 2 必须按顺序完成，Phase 3 可以独立进行
- 每个 Checkpoint 都是暂停点，需要确认前面的任务都正确完成
- 修复过程中严禁删除现有的 `mesh.setMatrixAt` 循环体
- 所有代码修改都应该是"替换"而非"删除"
