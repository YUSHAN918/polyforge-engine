# Requirements Document

## Introduction

本规范定义了植被系统的数据驱动架构修复需求，解决当前系统中存在的缩放不一致和风向混乱问题。核心目标是实现数据层与渲染层的彻底解耦，确保全局缩放参数能够实时、统一地应用于所有植被实例，同时修正风场计算的空间坐标系问题。

## Glossary

- **VegetationSystem**: 植被系统，负责生成和管理植被实例数据的 ECS 系统
- **VegetationVisual**: 植被视觉组件，负责将植被数据渲染到 Three.js 场景中
- **Instance**: 植被实例，包含位置、旋转、缩放等属性的单个植被对象
- **GlobalScale**: 全局缩放系数，由 UI 滑块控制的统一缩放参数
- **InstancedMesh**: Three.js 的实例化网格对象，用于高性能渲染大量相同几何体
- **Wind_Shader**: 风场着色器，在 GPU 上计算植被的风吹摆动效果
- **World_Space**: 世界空间坐标系，场景中的全局坐标系统
- **Local_Space**: 局部空间坐标系，相对于物体自身的坐标系统
- **Matrix_Composition**: 矩阵合成，将位置、旋转、缩放组合成变换矩阵的过程

## Requirements

### Requirement 1: 数据层净化

**User Story:** 作为系统架构师，我希望植被实例数据与 UI 配置完全解耦，以便数据层保持纯净和可预测性。

#### Acceptance Criteria

1. WHEN 生成新的植被实例时，THE VegetationSystem SHALL 存储标准化的缩放值（baseScale = 1.0 或基于种子的随机偏离）
2. WHEN 生成植被实例时，THE VegetationSystem SHALL NOT 读取当前的全局缩放滑块值（minHeight、maxHeight、minWidth、maxWidth 等动态配置）
3. WHEN 用户修改全局缩放滑块时，THE VegetationSystem SHALL NOT 重新生成实例数据
4. FOR ALL 植被实例，THE instance.scale 属性 SHALL 保持不变，除非密度或种子参数改变

### Requirement 2: 渲染层 Uniform 动态缩放

**User Story:** 作为用户，我希望拖动缩放滑块时，所有植被能够实时、极速响应缩放变化，不产生任何计算卡顿。

#### Acceptance Criteria

1. WHEN 用户修改全局缩放滑块时，THE VegetationVisual SHALL 通过 Uniform 变量 `uGlobalScale` 的实时更新做出响应。
2. WHEN globalScale 值改变时，THE VegetationVisual SHALL 直接更新材质中的 Uniform 值，而不是重新灌入数万个实例矩阵。
3. WHEN 计算渲染效果时，THE Wind_Shader SHALL 在 GPU 顶点着色器中应用公式 `finalVertex = localVertex * uGlobalScale`。
4. FOR ALL 植被实例，THE 缩放变化 SHALL 在 GPU 侧瞬时应用，确保交互的绝对流畅性（零 CPU/总线 开销）。
5. WHEN 缩放更新时，THE 系统 SHALL NOT 触发 `InstancedMesh.instanceMatrix.needsUpdate`，以避免昂贵的 Buffer 重新传输。

### Requirement 3: 风场空间坐标修正

**User Story:** 作为用户，我希望看到所有植被沿着统一的风向摆动，形成自然的波浪效果，而不是各自朝向不同方向。

#### Acceptance Criteria

1. WHEN 计算风场偏移时，THE Wind_Shader SHALL 使用世界空间坐标（worldPosition.xz）作为噪声采样点
2. WHEN 应用风场偏移时，THE Wind_Shader SHALL 在世界空间中计算偏移向量，确保所有实例受到统一方向的风力影响
3. FOR ALL 植被实例，THE 风场摆动方向 SHALL 保持一致（例如：从左往右）
4. WHEN 实例具有不同的旋转角度时，THE 风场效果 SHALL NOT 受到局部旋转的影响
5. WHEN 风场动画播放时，THE 植被 SHALL 呈现波浪状的连续摆动效果

### Requirement 4: 性能和稳定性

**User Story:** 作为系统维护者，我希望修复过程不仅解决功能问题，还能利用 GPU 特性优化系统实时交互性能。

#### Acceptance Criteria

1. WHEN 修改代码时，THE 开发人员 SHALL 确保 `injectMatricesToMesh` 仅在实例数据发生物理变化时调用，而非在滑块交互时调用。
2. WHEN 更新 Uniform 时，THE 系统 SHALL 使用引用更新方式，避免触发 React 的完整重渲染周期。
3. WHEN 处理大量实例（15,000+）时，THE 系统 SHALL 在拖动缩放滑块期间保持稳定的 60 FPS，无任何掉帧风险。
4. WHEN 修复完成后，THE 系统 SHALL 通过更新后的单元测试（验证 Uniform 更新而非矩阵刷新）。
5. IF 性能测试显示滑块拖动时有任何明显的 CPU 尖峰，THEN THE 实现 SHALL 被重新检查。
