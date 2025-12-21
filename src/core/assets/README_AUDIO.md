# PolyForge Audio Asset Import System

## 概述

音频资产导入系统使用原生 Web Audio API 实现，支持 MP3、WAV、OGG 格式的音频文件导入。

## 特性

- ✅ 使用原生 Web Audio API（零第三方依赖）
- ✅ 支持 MP3/WAV/OGG 格式
- ✅ 自动提取音频元数据（时长、采样率、声道数）
- ✅ 存储为 Blob 到 IndexedDB
- ✅ 内置音频预览播放器

## 使用方法

### 1. 初始化资产注册表

```typescript
import { getAssetRegistry } from './core/assets/AssetRegistry';

const registry = getAssetRegistry();
await registry.initialize();
```

### 2. 导入音频文件

```typescript
// 从文件输入获取文件
const file = fileInput.files[0];

// 导入音频
const { id, metadata } = await registry.importAudio(file);

console.log('Audio ID:', id);
console.log('Duration:', metadata.duration, 'seconds');
console.log('Sample Rate:', metadata.sampleRate, 'Hz');
console.log('Channels:', metadata.numberOfChannels);
console.log('Format:', metadata.format);
```

### 3. 读取音频资产

```typescript
// 获取音频 Blob
const audioBlob = await registry.getAsset(id);

// 创建 URL 用于播放
const audioUrl = URL.createObjectURL(audioBlob);

// 创建音频元素
const audio = new Audio(audioUrl);
audio.play();
```

### 4. 查询音频资产

```typescript
// 查询所有音频资产
const audioAssets = await registry.queryAssets({ type: AssetType.AUDIO });

// 按分类查询
const musicAssets = await registry.queryAssets({ 
  type: AssetType.AUDIO,
  category: 'music' 
});

// 按标签查询
const sfxAssets = await registry.queryAssets({ 
  type: AssetType.AUDIO,
  tags: ['sfx', 'explosion'] 
});
```

## 演示

### 浏览器控制台演示

打开浏览器控制台，运行以下命令：

```javascript
// 打开音频上传界面
window.audioUploadDemo();

// 列出所有资产
window.listAssets();

// 清空所有资产
window.clearAssets();
```

### 音频上传界面

`audioUploadDemo()` 会创建一个完整的音频上传界面，包括：

1. **文件选择器**：支持 MP3/WAV/OGG 格式
2. **上传按钮**：点击上传并解析音频
3. **元数据显示**：显示时长、采样率、声道数等信息
4. **音频播放器**：内置播放/停止按钮，支持即时预览

## 音频元数据

导入音频后，系统会自动提取以下元数据：

```typescript
interface AudioMetadata {
  duration: number;        // 时长（秒）
  sampleRate: number;      // 采样率（Hz，通常为 44100 或 48000）
  numberOfChannels: number; // 声道数（1=单声道，2=立体声）
  format: string;          // 文件格式（mp3/wav/ogg）
}
```

## 支持的格式

| 格式 | 扩展名 | MIME 类型 | 说明 |
|------|--------|-----------|------|
| MP3  | .mp3   | audio/mpeg | 有损压缩，文件小 |
| WAV  | .wav   | audio/wav  | 无损，文件大 |
| OGG  | .ogg   | audio/ogg  | 有损压缩，开源 |

## 技术实现

### Web Audio API

使用原生 `AudioContext.decodeAudioData()` 方法解析音频：

```typescript
const audioContext = new AudioContext();
const arrayBuffer = await file.arrayBuffer();
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

// 提取元数据
const metadata = {
  duration: audioBuffer.duration,
  sampleRate: audioBuffer.sampleRate,
  numberOfChannels: audioBuffer.numberOfChannels,
  format: 'mp3', // 从文件扩展名判断
};
```

### IndexedDB 存储

音频文件以 Blob 形式存储到 IndexedDB：

```typescript
// 保存
await storage.saveFile(assetId, audioBlob);

// 读取
const audioBlob = await storage.getFile(assetId);
```

## 错误处理

系统会自动处理以下错误：

1. **不支持的格式**：抛出错误并提示支持的格式
2. **解码失败**：捕获 Web Audio API 错误并提示用户
3. **存储失败**：捕获 IndexedDB 错误并回滚

## 性能优化

- **内存缓存**：已加载的音频会缓存在内存中
- **延迟加载**：只在需要时从 IndexedDB 加载
- **Blob 存储**：保持原始格式，避免重复编码

## 未来扩展

- [ ] 支持音频波形预览
- [ ] 支持音频剪辑和编辑
- [ ] 支持 3D 空间音频参数
- [ ] 支持音频压缩选项
- [ ] 支持批量导入

## 相关文件

- `src/core/assets/AudioImporter.ts` - 音频导入器
- `src/core/assets/AssetRegistry.ts` - 资产注册表
- `src/core/assets/types.ts` - 类型定义
- `src/core/assetDemo.ts` - 演示代码

## 测试

在浏览器中测试：

1. 启动开发服务器：`npm run dev`
2. 打开浏览器控制台
3. 运行：`window.audioUploadDemo()`
4. 选择一个音频文件并上传
5. 查看元数据和播放音频

## 注意事项

⚠️ **严禁使用第三方音频库**：本系统完全基于原生 Web Audio API 实现，不依赖任何第三方库。

✅ **浏览器兼容性**：Web Audio API 在所有现代浏览器中都得到支持（Chrome、Firefox、Safari、Edge）。

🔒 **安全性**：音频文件存储在本地 IndexedDB 中，不会上传到服务器。
