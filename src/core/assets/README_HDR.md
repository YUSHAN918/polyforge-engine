# PolyForge HDR 环境贴图系统

## 📋 概述

HDR（High Dynamic Range）环境贴图导入系统，支持 .hdr 格式文件的解析、预处理和场景应用。使用 Three.js RGBELoader 和 PMREMGenerator 实现高质量的 PBR 环境光照。

---

## 🎯 核心功能

### 1. HDR 文件解析
- 支持 .hdr 格式（Radiance RGBE）
- 使用 Three.js RGBELoader
- 零外部依赖

### 2. PMREMGenerator 预处理
- 生成 PMREM（Prefiltered Mipmap Radiance Environment Map）
- 预计算环境光照
- 优化 PBR 渲染性能

### 3. 全景缩略图
- 256x128 分辨率（2:1 全景比例）
- 球体内部渲染
- Base64 编码存储

### 4. 场景自动应用
- 自动设置 `scene.background`
- 自动设置 `scene.environment`
- 支持实时 IBL（Image-Based Lighting）

---

## 🚀 快速开始

### 基础使用

```typescript
import { getAssetRegistry } from '@polyforge/core';

// 1. 初始化注册表
const registry = getAssetRegistry();
await registry.initialize();

// 2. 导入 HDR 文件
const file = /* HDR File from input */;
const { id, metadata, envMap } = await registry.importHDR(file);

// 3. 应用到场景
scene.background = envMap;
scene.environment = envMap;

console.log('HDR Metadata:', metadata);
// {
//   width: 2048,
//   height: 1024,
//   format: 'hdr',
//   exposure: 1.0
// }
```

### 浏览器演示

```javascript
// 打开 HDR 上传界面
window.hdrUploadDemo()

// 设置全局场景引用（自动应用）
window.__POLYFORGE_SCENE__ = scene;
```

---

## 📚 API 文档

### HDRImporter

#### `importHDR(file: File)`

导入 HDR 文件并预处理。

**参数**:
- `file: File` - HDR 文件（.hdr 格式）

**返回**:
```typescript
{
  blob: Blob;              // 原始文件数据
  metadata: HDRMetadata;   // HDR 元数据
  thumbnail: string;       // Base64 缩略图
  envMap: THREE.Texture;   // 预处理的环境贴图
}
```

**示例**:
```typescript
const importer = new HDRImporter();
const result = await importer.importHDR(file);

// 使用 envMap
scene.background = result.envMap;
scene.environment = result.envMap;

// 显示缩略图
img.src = result.thumbnail;
```

---

### AssetRegistry

#### `importHDR(file: File, options?: ImportOptions)`

导入 HDR 并注册到资产系统。

**参数**:
- `file: File` - HDR 文件
- `options?: ImportOptions` - 导入选项
  - `category?: string` - 分类（默认: 'environments'）
  - `tags?: string[]` - 标签（默认: ['imported', 'hdr', 'environment']）

**返回**:
```typescript
{
  id: string;              // 资产 ID
  metadata: HDRMetadata;   // HDR 元数据
  envMap: THREE.Texture;   // 预处理的环境贴图
}
```

**示例**:
```typescript
const registry = getAssetRegistry();
await registry.initialize();

const { id, metadata, envMap } = await registry.importHDR(file, {
  category: 'studio-lighting',
  tags: ['studio', 'indoor', 'neutral']
});

// envMap 已缓存，可随时获取
const cachedEnvMap = registry.getHDREnvMap(id);
```

#### `getHDREnvMap(id: string)`

从缓存获取 HDR envMap。

**参数**:
- `id: string` - 资产 ID

**返回**:
- `THREE.Texture | null` - 环境贴图（如果存在）

**示例**:
```typescript
const envMap = registry.getHDREnvMap('asset_123');
if (envMap) {
  scene.environment = envMap;
}
```

---

## 🎨 HDR 元数据

### HDRMetadata 接口

```typescript
interface HDRMetadata {
  width: number;           // 宽度（像素）
  height: number;          // 高度（像素）
  format: string;          // 格式（'hdr'）
  exposure: number;        // 曝光值（默认 1.0）
}
```

### 示例数据

```json
{
  "width": 2048,
  "height": 1024,
  "format": "hdr",
  "exposure": 1.0
}
```

---

## 🔧 技术实现

### 1. RGBELoader 解析

```typescript
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const loader = new RGBELoader();
const texture = await loader.loadAsync(dataURL);
```

**特点**:
- 支持 Radiance RGBE 格式
- 解析为 DataTexture
- 保留 HDR 动态范围

### 2. PMREMGenerator 预处理

```typescript
import { PMREMGenerator } from 'three';

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
const envMap = pmremGenerator.fromEquirectangular(texture).texture;
```

**优势**:
- 预计算环境光照
- 生成 Mipmap 链
- 优化 PBR 渲染性能
- 支持实时 IBL

### 3. 全景缩略图生成

```typescript
// 创建球体几何体（翻转使纹理在内部显示）
const geometry = new THREE.SphereGeometry(10, 64, 32);
geometry.scale(-1, 1, 1);

// 应用 HDR 纹理（禁用色调映射）
const material = new THREE.MeshBasicMaterial({
  map: texture,
  toneMapped: false,
});

// 渲染 256x128 全景视图
renderer.setSize(256, 128);
renderer.render(scene, camera);
const thumbnail = canvas.toDataURL('image/png');
```

---

## 🎯 使用场景

### 1. 室外环境

```typescript
// 导入室外 HDR（天空、太阳）
const { envMap } = await registry.importHDR(outdoorHDR);

scene.background = envMap;
scene.environment = envMap;

// PBR 材质自动获得真实天空光照
```

### 2. 室内环境

```typescript
// 导入室内 HDR（工作室灯光）
const { envMap } = await registry.importHDR(studioHDR);

scene.background = null; // 不显示背景
scene.environment = envMap; // 仅用于环境光

// 材质获得工作室光照效果
```

### 3. 动态切换

```typescript
// 白天环境
const dayEnvMap = registry.getHDREnvMap('day_hdr_id');
scene.environment = dayEnvMap;

// 夜晚环境
const nightEnvMap = registry.getHDREnvMap('night_hdr_id');
scene.environment = nightEnvMap;
```

---

## 🚀 核弹级功能：场景自动应用

### 设置全局场景引用

```typescript
// 在 Three.js 初始化后
window.__POLYFORGE_SCENE__ = scene;
```

### 自动应用流程

1. 用户上传 HDR 文件
2. 系统解析并预处理
3. 自动检测全局场景引用
4. 自动设置 `scene.background` 和 `scene.environment`
5. 场景立即更新！✨

### 手动应用

如果未设置全局引用，可手动应用：

```typescript
const registry = getAssetRegistry();
const envMap = registry.getHDREnvMap('asset_id');

scene.background = envMap;
scene.environment = envMap;
```

---

## 📊 性能优化

### 1. envMap 缓存

```typescript
// envMap 自动缓存，避免重复预处理
const envMap1 = registry.getHDREnvMap(id); // 从缓存获取
const envMap2 = registry.getHDREnvMap(id); // 同一个实例
```

### 2. 资源清理

```typescript
// 清空缓存时自动清理纹理
registry.clearCache(); // 调用 envMap.dispose()

// 关闭注册表时清理所有资源
registry.close();
```

### 3. 渲染优化

- PMREMGenerator 预计算环境光照
- 生成 Mipmap 链，支持不同粗糙度
- 避免实时环境光计算

---

## 🎓 最佳实践

### 1. HDR 文件选择

- **分辨率**: 2048x1024 或 4096x2048
- **格式**: Radiance RGBE (.hdr)
- **内容**: 等距柱状投影（Equirectangular）

### 2. 曝光调整

```typescript
// 调整环境光强度
scene.environment.intensity = 0.5; // 降低 50%

// 或使用 renderer 的曝光
renderer.toneMappingExposure = 1.5;
```

### 3. 背景与环境分离

```typescript
// 仅用于环境光，不显示背景
scene.background = null;
scene.environment = envMap;

// 或使用纯色背景
scene.background = new THREE.Color(0x000000);
scene.environment = envMap;
```

### 4. 多环境管理

```typescript
// 预加载多个环境
const environments = {
  day: await registry.importHDR(dayHDR),
  night: await registry.importHDR(nightHDR),
  studio: await registry.importHDR(studioHDR),
};

// 快速切换
function setEnvironment(name: string) {
  const envMap = registry.getHDREnvMap(environments[name].id);
  scene.environment = envMap;
}
```

---

## 🐛 故障排除

### 问题 1: HDR 文件无法加载

**原因**: 文件格式不正确

**解决**:
- 确保文件是 .hdr 格式（Radiance RGBE）
- 使用专业工具（如 HDRIHaven）下载标准 HDR

### 问题 2: 场景未自动应用

**原因**: 未设置全局场景引用

**解决**:
```typescript
window.__POLYFORGE_SCENE__ = scene;
```

### 问题 3: 环境光过亮/过暗

**原因**: HDR 曝光值不合适

**解决**:
```typescript
// 调整 renderer 曝光
renderer.toneMappingExposure = 1.5;

// 或调整环境光强度
scene.environment.intensity = 0.5;
```

### 问题 4: 内存占用过高

**原因**: envMap 未清理

**解决**:
```typescript
// 定期清理不用的 envMap
registry.clearCache();

// 或手动清理
const envMap = registry.getHDREnvMap(id);
envMap.dispose();
```

---

## 📝 示例代码

### 完整示例

```typescript
import { getAssetRegistry } from '@polyforge/core';
import * as THREE from 'three';

// 1. 初始化场景
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// 2. 设置全局引用（可选）
window.__POLYFORGE_SCENE__ = scene;

// 3. 初始化资产注册表
const registry = getAssetRegistry();
await registry.initialize();

// 4. 导入 HDR
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  
  try {
    const { id, metadata, envMap } = await registry.importHDR(file);
    
    console.log('HDR imported:', metadata);
    
    // 应用到场景
    scene.background = envMap;
    scene.environment = envMap;
    
    console.log('HDR applied to scene!');
  } catch (error) {
    console.error('Failed to import HDR:', error);
  }
});

// 5. 或使用演示界面
window.hdrUploadDemo();
```

---

## 🔗 相关资源

### HDR 资源网站
- [Poly Haven](https://polyhaven.com/hdris) - 免费高质量 HDR
- [HDRI Haven](https://hdrihaven.com/) - 免费 HDR 环境贴图
- [HDR Labs](http://www.hdrlabs.com/) - 商业 HDR 资源

### Three.js 文档
- [RGBELoader](https://threejs.org/docs/#examples/en/loaders/RGBELoader)
- [PMREMGenerator](https://threejs.org/docs/#api/en/extras/PMREMGenerator)
- [Environment Mapping](https://threejs.org/docs/#manual/en/introduction/Environment-maps)

---

## ✅ 总结

PolyForge HDR 环境贴图系统提供：

- ✅ 完整的 HDR 导入流程
- ✅ PMREMGenerator 预处理
- ✅ 全景缩略图生成
- ✅ 场景自动应用
- ✅ 智能缓存管理
- ✅ 零外部依赖

**让 PBR 渲染更真实，让环境光照更简单！** 🌅✨
