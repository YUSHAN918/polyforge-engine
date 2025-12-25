# Design Document

## Overview

本设计文档描述了植被系统的数据驱动架构修复方案。当前系统存在两个核心问题：

1. **数据污染问题**：在 `generateVegetation()` 中，实例的 scale 值被"烘焙"了全局缩放参数，导致新旧植被在滑块变化时表现不一致
2. **风场空间错误**：风场计算在局部空间进行，导致每个实例因随机旋转而朝向不同方向摆动

修复方案采用三阶段策略：
- **Phase 1**：数据层净化 - 确保 ECS 存储的数据是纯净的、不受 UI 状态影响的标准值
- **Phase 2**：渲染层动态合成 - 在 Vertex Shader 中通过 Uniform 动态应用全局缩放，实现零开销实时响应
- **Phase 3**：风场空间修正 - 将风场计算从局部空间迁移到世界空间，确保统一风向

## Architecture

### 数据流架构

```
UI Slider (globalScale)
    ↓
VegetationComponent.config.scale
    ↓
VegetationVisual (React Component)
    ↓
Uniform: uGlobalScale
    ↓
GPU Vertex Shader
    ↓
finalScale = instance.baseScale * uGlobalScale
```

### 关键原则

1. **数据不可变性**：`instanceCache` 中的数据一旦生成，除非密度/种子改变，否则永不修改
2. **渲染时合成**：全局缩放参数仅在渲染时（矩阵灌入时）参与计算
3. **空间一致性**：风场计算必须在世界空间进行，避免局部旋转干扰

### 问题根源分析

#### 问题 1：缩放不一致

**现象**：在架构验证观测窗口中，原始草地和新生成的草地在调整缩放滑块时表现不一致。

**根本原因**：
- 旧草生成时，`globalScale = 0.5`，实例数据中烘焙了这个值
- 新草生成时，`globalScale = 1.0`，实例数据中烘焙了新值
- 当滑块调整到 `0.8` 时，两批草的基准值不同，导致最终大小不一致

**解决方案**：
- 所有实例的 `scale` 字段存储标准化值（0.8-1.2 随机）
- `globalScale` 作为 Uniform 传入 Shader，不参与 CPU 矩阵计算
- 确保所有草地实例在 GPU 端应用最终缩放

#### 问题 2：风向不一致

**现象**：草地摆动方向混乱，每棵草朝向不同方向。

**根本原因**：
- 风场偏移在局部空间计算：`transformed.x += wind`
- 每个实例有随机的 Y 轴旋转
- 局部空间的 X 轴在世界空间中指向不同方向

**解决方案**：
- 在 Shader 中计算世界坐标：`worldPosition = modelMatrix * position`
- 基于世界坐标采样风场：`sin(time + worldPosition.x)`
- 在世界空间应用偏移，然后转回局部空间

## Components and Interfaces

### Phase 1: VegetationSystem 数据层净化

#### 修改文件：`src/core/systems/VegetationSystem.ts`

**修改点：generateVegetation() 方法**

```typescript
// ❌ 错误实现（当前代码）
// 问题：读取了 config.minHeight, maxHeight 等动态配置
const scaleX = config.minWidth + rng() * (config.maxWidth - config.minWidth);
const scaleY = config.minHeight + rng() * (config.maxHeight - config.minHeight);

instances[i] = {
  position,
  rotation,
  scale: new THREE.Vector3(scaleX, scaleY, scaleX),
  colorOffset,
};
```

```typescript
// ✅ 正确实现（修复后）
// 目标：所有实例存储标准化的缩放值
const baseScale = 1.0; // 固定基准缩放
const randomVariation = 0.8 + rng() * 0.4; // 0.8 到 1.2 的随机偏离

instances[i] = {
  position,
  rotation,
  scale: new THREE.Vector3(randomVariation, randomVariation, randomVariation),
  colorOffset,
};
```

**关键点**：
- 严禁读取 `config.minHeight`、`config.maxHeight`、`config.minWidth`、`config.maxWidth`
- 所有实例的 `scale` 值必须基于固定的 `baseScale = 1.0`
- 随机变化仅用于增加自然感，范围控制在 0.8-1.2

### Phase 2: VegetationSystem 数据层净化（渲染准备）

#### 修改文件：`src/core/systems/VegetationSystem.ts`

**修改点：injectMatricesToMesh() 方法**

我们必须移除该方法中对 `globalScale` 的依赖，使其仅负责灌入“纯净”的实例数据。

```typescript
private injectMatricesToMesh(): void {
  if (!this.meshHandle) return;
  
  const mesh = this.meshHandle;
  const dummy = new THREE.Object3D();
  
  let totalInstances = 0;
  
  // 遍历所有植被实体
  for (const [entityId, instances] of this.instanceCache.entries()) {
    // ... 前置校验逻辑 ... (略)

    // ❌ 删除：const globalScale = vegetation.config.scale ?? 1.0;
    
    // 物理灌入矩阵
    for (let i = 0; i < instances.length; i++) {
      const instance = instances[i];
      const matrixIndex = totalInstances + i;
      
      // 设置位置和旋转
      dummy.position.copy(instance.position);
      dummy.rotation.y = instance.rotation;
      
      // ✅ 关键：仅使用实例自身的随机缩放
      // globalScale 将在 Shader 中应用
      dummy.scale.copy(instance.scale);
      
      // 更新矩阵
      dummy.updateMatrix();
      this._tempMatrix.copy(dummy.matrix);
      mesh.setMatrixAt(matrixIndex, this._tempMatrix);
      
      // ... 颜色设置逻辑 ...
    }
    
    totalInstances += instances.length;
  }
  
  // 设置实际显示数量
  mesh.count = totalInstances;
  
  // 标记需要更新
  mesh.instanceMatrix.needsUpdate = true;
}
```

**关键点**：
- **CPU 零开销**：当用户拖动缩放滑块时，**不需要**调用此方法
- **数据纯净**：写入 Buffer 的矩阵仅包含位置、旋转和每棵草的随机差异
- **触发时机**：仅在生成新草或加载场景时调用一次

### Phase 2 (续): VegetationVisual 响应式 Uniform 更新

#### 修改文件：`src/components/rendering/VegetationVisual.tsx`

**修改点 1：通过 Uniform 传递 globalScale**

```typescript
// ✅ 提取 globalScale
const globalScale = entity?.getComponent('Vegetation')?.config?.scale ?? 1.0;

// ✅ 必须使用 ref 引用材质以直接更新 uniforms
// 避免 React 重渲染导致整个 Mesh 重建
useEffect(() => {
  if (meshRef.current && meshRef.current.material) {
    const mat = meshRef.current.material as THREE.ShaderMaterial;
    // 确保 userData.shader 已注入（因为我们使用了 onBeforeCompile）
    if (mat.userData.shader) {
      mat.userData.shader.uniforms.uGlobalScale.value = globalScale;
    }
  }
}, [globalScale]); // 仅当 scale 变化时触发
```

**关键点**：
- **性能极大提升**：更新 Uniform 是 GPU 寄存器级操作，几乎零消耗
- **无需脏标记**：不再设置 `isScaleDirty = true`，也不再触发 `injectMatricesToMesh`
- **依赖管理**：React 仅在滑块拖动时触发极其轻量的 effect

### Phase 3: Wind Shader 空间坐标修正

#### 修改文件：`src/components/rendering/VegetationVisual.tsx`

**修改点：customMaterial 的 onBeforeCompile**

```typescript
// ❌ 错误实现（当前代码）
// 问题：风场偏移在局部空间计算
mat.onBeforeCompile = (shader) => {
  shader.uniforms.time = { value: 0 };
  shader.uniforms.windStrength = { value: 0.1 };
  
  shader.vertexShader = `
    uniform float time;
    uniform float windStrength;
  ` + shader.vertexShader;

  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `
    #include <begin_vertex>
    // ❌ 问题：基于局部空间的 transformed.x
    float h = position.y;
    float wind = sin(time * 2.0 + transformed.x * 0.5) * windStrength * h;
    transformed.x += wind;
    transformed.z += wind * 0.5;
    `
  );
  
  mat.userData.shader = shader;
};
```

```typescript
// ✅ 正确实现（修复后）
// 目标：风场计算在世界空间进行，并在 Vertex Shader 应用全局缩放
mat.onBeforeCompile = (shader) => {
  shader.uniforms.time = { value: 0 };
  shader.uniforms.windStrength = { value: 0.1 };
  // ✅ 新增：全局缩放 Uniform
  shader.uniforms.uGlobalScale = { value: 1.0 };
  
  shader.vertexShader = `
    uniform float time;
    uniform float windStrength;
    uniform float uGlobalScale;
  ` + shader.vertexShader;

  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `
    #include <begin_vertex>
    
    // 1. 应用全局缩放 (GPU 瞬时计算)
    transformed *= uGlobalScale;

    // 2. 计算近似世界坐标用于风场
    // 注意：InstancedMesh 的 vertex shader 中，position 是局部坐标
    
    #ifdef USE_INSTANCING
      vec4 worldInstancePos = instanceMatrix * vec4(transformed, 1.0);
    #else
      vec4 worldInstancePos = vec4(transformed, 1.0);
    #endif

    vec4 worldPosition = modelMatrix * worldInstancePos;
    
    // 3. 基于世界坐标采样
    float h = position.y; 
    float windPhase = time * 2.0 + worldPosition.x * 0.5 + worldPosition.z * 0.3;
    float windOffset = sin(windPhase) * windStrength * h;

    // 4. 应用风场 (统一世界风向：X 轴)
    // 使用转置矩阵技巧将世界风向量映射回局部空间 (廉价逆变换)
    // 假设 instanceMatrix 包含旋转和位移，缩放已由 uGlobalScale + instance.scale 处理
    
    vec3 worldWindDir = vec3(1.0, 0.0, 0.0);
    #ifdef USE_INSTANCING
       // GLSL中 vec * mat 等同于 mat_transpose * vec，即逆旋转
       vec3 localWindDir = worldWindDir * mat3(instanceMatrix); 
    #else
       vec3 localWindDir = worldWindDir;
    #endif

    transformed += localWindDir * (windOffset / uGlobalScale); 
    `
  );
  
  mat.userData.shader = shader;
};
```

**关键点**：
1. **uGlobalScale**：直接在 Shader 顶部应用乘法，GPU 并行计算，极快。
2. **世界风向修正**：通过向量乘矩阵（相当于乘转置矩阵），以极低开销将世界风向映射回局部空间，确保所有草倒向同一侧。
3. **消除 Inverse**：避免了 `inverse(modelMatrix)` 的高昂开销。

## Data Models

### VegetationInstance 接口（保持不变）

```typescript
interface VegetationInstance {
  position: THREE.Vector3;  // 世界坐标位置
  rotation: number;         // Y轴旋转角度（弧度）
  scale: THREE.Vector3;     // ✅ 标准化缩放值（0.8-1.2 随机）
  colorOffset: THREE.Color; // 颜色偏移
}
```

**关键变更**：
- `scale` 字段的语义从"最终缩放值"变为"标准化基准值"
- 不再受 `config.minHeight`、`config.maxHeight` 等参数影响
- 仅基于种子的随机数生成器产生 0.8-1.2 的随机变化

### VegetationComponent 配置

```typescript
interface VegetationConfig {
  density: number;          // 密度（每平方单位实例数）
  scale?: number;           // 🔥 全局缩放系数（默认 1.0）
  windStrength: number;     // 风力强度
  windSpeed: number;        // 风速
  baseColor: string;        // 基础颜色
  colorVariation: number;   // 颜色变化范围
  terrainEntityId: string;  // 关联的地形实体 ID
  // ... 其他配置
}
```

**关键字段**：
- `scale`：全局缩放系数，由 UI 滑块控制
- 此字段仅在渲染时（`injectMatricesToMesh`）参与计算
- 不影响 `instanceCache` 中存储的数据

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 数据层纯净性

*For any* 植被配置（包括不同的 globalScale 值），生成的实例数据中的 scale 值应始终在 [0.8, 1.2] 范围内，且不受 globalScale 影响。

**Validates: Requirements 1.1**

### Property 2: 数据隔离性

*For any* 相同的种子和密度配置，使用不同的 globalScale 值生成两次实例，两次生成的实例数据（位置、旋转、scale）应完全相同。

**Validates: Requirements 1.2**

### Property 3: 数据稳定性

*For any* 已生成的植被实例，修改 globalScale 后，instanceCache 中的数据应保持不变（引用和值都不变）。

**Validates: Requirements 1.3**

### Property 4: 数据不可变性

*For any* 植被实例，在不改变密度或种子的情况下，无论进行何种操作（修改 globalScale、windStrength 等），instance.scale 应始终保持不变。

**Validates: Requirements 1.4**

### Property 5: 矩阵计算正确性

*For any* 实例的 scale 值和 globalScale 值，最终设置到 InstancedMesh 的矩阵应正确应用公式：finalScale = instance.scale * globalScale。

**Validates: Requirements 2.3**

### Property 6: 批量更新原子性

*For all* 植被实例，缩放变化应在单次 injectMatricesToMesh 调用中统一应用，确保同一帧内所有实例使用相同的 globalScale。

**Validates: Requirements 2.4**

### Property 7: 风场统一性

*For any* 两个位置相同但旋转不同的植被实例，它们的风场偏移在世界空间中的方向应保持一致。

**Validates: Requirements 3.3**

### Property 8: 旋转独立性

*For any* 植被实例，其风场摆动效果不应受到实例自身 Y 轴旋转角度的影响，所有实例应沿统一的世界风向摆动。

**Validates: Requirements 3.4**

## Error Handling

### 数据层错误处理

#### 场景 1：缺少地形实体
- **触发条件**：`config.terrainEntityId` 无效或地形实体不存在
- **处理策略**：
  - 输出警告日志：`[VegetationSystem] No terrain found for vegetation entity`
  - 提前返回，不生成实例
  - 不抛出异常，避免中断其他系统

#### 场景 2：无效的种子值
- **触发条件**：`config.seed` 为 NaN 或 undefined
- **处理策略**：
  - 使用默认种子：`Math.random() * 10000`
  - 输出警告日志
  - 继续生成实例

### 渲染层错误处理

#### 场景 3：meshHandle 未注册
- **触发条件**：`VegetationVisual` 未挂载或注册失败
- **处理策略**：
  - `injectMatricesToMesh()` 提前返回
  - 不输出错误日志（正常情况，组件可能未挂载）

#### 场景 4：globalScale 无效
- **触发条件**：`vegetation.config.scale` 为 NaN、undefined 或负数
- **处理策略**：
  - 使用默认值：`globalScale = 1.0`
  - 不输出警告（使用 `??` 运算符静默处理）

### Shader 错误处理

#### 场景 5：Shader 编译失败
- **触发条件**：GLSL 语法错误或不支持的函数
- **处理策略**：
  - Three.js 会自动输出编译错误到控制台
  - 材质回退到标准材质（无风场效果）
  - 不影响其他渲染

#### 场景 6：inverse(modelMatrix) 不可逆
- **触发条件**：modelMatrix 的行列式为 0（理论上不会发生）
- **处理策略**：
  - GPU 会返回单位矩阵或零矩阵
  - 草地可能不摆动或位置错误
  - 需要在开发阶段通过测试避免

## Testing Strategy

### 测试方法论

本修复采用**双重测试策略**：
- **单元测试**：验证具体的代码逻辑和边界条件
- **属性测试**：验证通用的正确性属性（如果项目引入 PBT 库）
- **手动验证**：在架构验证观测窗口中进行视觉验证

### 单元测试计划

#### Test Suite 1: 数据层纯净性测试

**文件**：`src/core/systems/__tests__/VegetationSystem.dataPurity.test.ts`

```typescript
describe('VegetationSystem - Data Layer Purity', () => {
  test('生成的实例 scale 应在 [0.8, 1.2] 范围内', () => {
    // 使用不同的 globalScale 值生成实例
    // 验证所有实例的 scale 都在标准范围内
  });

  test('相同种子应生成相同的实例数据', () => {
    // 使用相同种子但不同 globalScale 生成两次
    // 验证实例数据完全相同
  });

  test('修改 globalScale 不应触发实例重新生成', () => {
    // 生成实例后修改 globalScale
    // 验证 instanceCache 引用和数据不变
  });
});
```

#### Test Suite 2: 渲染层动态缩放测试

**文件**：`src/core/systems/__tests__/VegetationSystem.dynamicScale.test.ts`

**注意**：由于缩放逻辑移至 GPU，原有测试需修改为验证 Uniform 更新。

```typescript
describe('VegetationSystem - Dynamic Scaling', () => {
  test('injectMatricesToMesh 不应再读取 globalScale', () => {
    // 验证生成的矩阵仅包含 instance.scale，不包含 globalScale 因子
  });

  test('VegetationVisual 应响应 globalScale 变化并更新 Uniform', () => {
    // Mock 材质和 userData.shader
    // 修改 Vegetation 组件的 config.scale
    // 验证 shader.uniforms.uGlobalScale.value 被更新
  });
  
  test('InjectMatrices 仅在实例列表变脏时调用', () => {
    // 修改 globalScale
    // 验证 injectMatricesToMesh 未被触发
  });
});
```

#### Test Suite 3: Wind Shader 测试

**文件**：`src/components/rendering/__tests__/VegetationVisual.shader.test.ts`

```typescript
describe('VegetationVisual - Wind Shader', () => {
  test('Shader 代码应包含 worldPosition 计算', () => {
    // 检查 shader.vertexShader 包含 'modelMatrix * vec4(position, 1.0)'
  });

  test('Shader 代码应包含 inverse(modelMatrix)', () => {
    // 检查 shader.vertexShader 包含 'inverse(modelMatrix)'
  });

  test('风场偏移应基于世界坐标', () => {
    // 检查 windPhase 计算使用 worldPosition.x
  });
});
```

### 手动验证清单

#### 验证步骤 1：缩放一致性

1. 打开架构验证观测窗口
2. 点击"生成草地 (5000)"按钮
3. 调整"草地缩放"滑块到 0.5
4. 再次点击"生成草地 (5000)"
5. **预期结果**：新旧草地大小完全一致

#### 验证步骤 2：风向统一性

1. 在观测窗口中生成草地
2. 观察草地摆动方向
3. **预期结果**：
   - 所有草地沿统一方向（X 轴正方向）摆动
   - 形成连续的波浪效果
   - 不同旋转角度的草摆动方向相同

#### 验证步骤 3：性能验证

1. 生成 15,000 个草地实例
2. 拖动"草地缩放"滑块
3. 观察 FPS 显示
4. **预期结果**：
   - FPS 保持在 55-60 之间
   - 滑块拖动时无明显卡顿
   - 缩放变化实时响应

### 回归测试

修复完成后，必须运行以下现有测试：

```bash
# 运行所有 VegetationSystem 相关测试
npm test -- VegetationSystem

# 运行所有渲染相关测试
npm test -- rendering
```

**通过标准**：所有现有测试必须保持通过状态。

### 性能基准

**修复前基准**（15,000 实例）：
- FPS: 58-60
- 内存: ~150MB

**修复后要求**：
- FPS: ≥ 55（允许 10% 下降）
- 内存: ≤ 165MB（允许 10% 增长）

如果性能下降超过 10%，需要进行优化。

