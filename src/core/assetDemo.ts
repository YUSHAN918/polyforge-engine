/**
 * PolyForge Asset System - Demo
 * 
 * 演示资产系统的完整流程：
 * 1. 初始化 AssetRegistry
 * 2. 创建一个测试图片 Blob
 * 3. 注册资产到系统
 * 4. 从系统读取资产
 * 5. 显示图片到页面
 * 6. 查询资产列表
 */

import { getAssetRegistry } from './assets/AssetRegistry';
import { AssetType } from './assets/types';
import type { AssetMetadata, ModelMetadata } from './assets/types';

/**
 * 创建一个测试图片 Blob
 * 使用 Canvas 生成一个简单的渐变图片
 */
function createTestImageBlob(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // 创建 Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    // 绘制渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, '#FF6B6B');
    gradient.addColorStop(0.5, '#4ECDC4');
    gradient.addColorStop(1, '#45B7D1');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    // 绘制文字
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PolyForge', 128, 100);
    ctx.font = '20px Arial';
    ctx.fillText('Asset System', 128, 140);
    ctx.fillText('Demo Image', 128, 170);

    // 转换为 Blob
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, 'image/png');
  });
}

/**
 * 显示图片到页面
 */
function displayImage(blob: Blob, containerId: string = 'asset-demo-container'): void {
  // 创建或获取容器
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 20px;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 10px;
      z-index: 10000;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    document.body.appendChild(container);
  }

  // 清空容器
  container.innerHTML = '';

  // 创建标题
  const title = document.createElement('h3');
  title.textContent = 'Asset System Demo';
  title.style.cssText = 'color: white; margin: 0 0 10px 0; font-family: Arial;';
  container.appendChild(title);

  // 创建图片元素
  const img = document.createElement('img');
  img.src = URL.createObjectURL(blob);
  img.style.cssText = `
    display: block;
    width: 256px;
    height: 256px;
    border: 2px solid #4ECDC4;
    border-radius: 5px;
  `;
  container.appendChild(img);

  // 创建信息文本
  const info = document.createElement('p');
  info.textContent = `Size: ${(blob.size / 1024).toFixed(2)} KB`;
  info.style.cssText = 'color: #4ECDC4; margin: 10px 0 0 0; font-family: monospace;';
  container.appendChild(info);
}

/**
 * 主演示函数
 */
export async function assetDemo(): Promise<void> {
  console.clear();
  console.log('='.repeat(60));
  console.log('PolyForge Asset System Demo');
  console.log('='.repeat(60));

  try {
    // 1. 获取 AssetRegistry 实例
    console.log('\n[Step 1] Getting AssetRegistry instance...');
    const registry = getAssetRegistry();

    // 2. 初始化
    console.log('[Step 2] Initializing AssetRegistry...');
    await registry.initialize();
    console.log('✓ AssetRegistry initialized');

    // 3. 创建测试图片
    console.log('\n[Step 3] Creating test image...');
    const imageBlob = await createTestImageBlob();
    console.log(`✓ Test image created: ${(imageBlob.size / 1024).toFixed(2)} KB`);

    // 4. 注册资产
    console.log('\n[Step 4] Registering asset...');
    const assetId = await registry.registerAsset(
      {
        name: 'Demo Gradient Image',
        type: AssetType.TEXTURE,
        category: 'demo',
        tags: ['test', 'gradient', 'demo'],
        size: imageBlob.size,
        thumbnail: undefined, // 可以生成缩略图
      },
      imageBlob
    );
    console.log(`✓ Asset registered with ID: ${assetId}`);

    // 5. 读取资产
    console.log('\n[Step 5] Loading asset from registry...');
    const loadedBlob = await registry.getAsset(assetId);
    
    if (!loadedBlob) {
      throw new Error('Failed to load asset');
    }
    console.log(`✓ Asset loaded: ${(loadedBlob.size / 1024).toFixed(2)} KB`);

    // 6. 显示图片
    console.log('\n[Step 6] Displaying image...');
    displayImage(loadedBlob);
    console.log('✓ Image displayed on page (top-right corner)');

    // 7. 获取元数据
    console.log('\n[Step 7] Getting asset metadata...');
    const metadata = await registry.getMetadata(assetId);
    if (metadata) {
      console.log('✓ Metadata:', {
        id: metadata.id,
        name: metadata.name,
        type: metadata.type,
        category: metadata.category,
        tags: metadata.tags,
        size: `${(metadata.size / 1024).toFixed(2)} KB`,
        createdAt: new Date(metadata.createdAt).toLocaleString(),
      });
    }

    // 8. 查询资产
    console.log('\n[Step 8] Querying assets...');
    const allAssets = await registry.getAllMetadata();
    console.log(`✓ Total assets in registry: ${allAssets.length}`);
    
    const textureAssets = await registry.queryAssets({ type: AssetType.TEXTURE });
    console.log(`✓ Texture assets: ${textureAssets.length}`);

    const demoAssets = await registry.queryAssets({ category: 'demo' });
    console.log(`✓ Demo category assets: ${demoAssets.length}`);

    // 9. 缓存统计
    console.log('\n[Step 9] Cache statistics...');
    const cacheStats = registry.getCacheStats();
    console.log(`✓ Cached assets: ${cacheStats.size}`);
    console.log(`✓ Cache keys:`, cacheStats.keys);

    // 完成
    console.log('\n' + '='.repeat(60));
    console.log('✓ Demo completed successfully!');
    console.log('='.repeat(60));
    console.log('\nThe image should now be visible in the top-right corner.');
    console.log('Check the browser DevTools > Application > IndexedDB > PolyForgeAssets');
    console.log('\nAvailable commands:');
    console.log('  window.listAssets()     - List all assets');
    console.log('  window.clearAssets()    - Clear all assets');
    console.log('  window.assetStats()     - Show cache statistics');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    throw error;
  }
}

/**
 * 列出所有资产
 */
export async function listAssets(): Promise<void> {
  const registry = getAssetRegistry();
  const assets = await registry.getAllMetadata();
  
  console.log('\n📦 Asset Registry Contents:');
  console.log('='.repeat(60));
  
  if (assets.length === 0) {
    console.log('No assets found. Run window.assetDemo() first.');
    return;
  }

  assets.forEach((asset, index) => {
    console.log(`\n[${index + 1}] ${asset.name}`);
    console.log(`  ID: ${asset.id}`);
    console.log(`  Type: ${asset.type}`);
    console.log(`  Category: ${asset.category}`);
    console.log(`  Tags: ${asset.tags.join(', ')}`);
    console.log(`  Size: ${(asset.size / 1024).toFixed(2)} KB`);
    console.log(`  Created: ${new Date(asset.createdAt).toLocaleString()}`);
  });
  
  console.log('\n' + '='.repeat(60));
}

/**
 * 清空所有资产
 */
export async function clearAssets(): Promise<void> {
  const registry = getAssetRegistry();
  await registry.clearAll();
  console.log('✓ All assets cleared');
  
  // 移除显示的图片
  const container = document.getElementById('asset-demo-container');
  if (container) {
    container.remove();
  }
}

/**
 * 显示缓存统计
 */
export function assetStats(): void {
  const registry = getAssetRegistry();
  const stats = registry.getCacheStats();
  
  console.log('\n📊 Asset Cache Statistics:');
  console.log('='.repeat(60));
  console.log(`Cached items: ${stats.size}`);
  console.log(`Cache keys:`, stats.keys);
  console.log('='.repeat(60));
}

// 导出到 window 对象（用于浏览器控制台）
if (typeof window !== 'undefined') {
  (window as any).assetDemo = assetDemo;
  (window as any).listAssets = listAssets;
  (window as any).clearAssets = clearAssets;
  (window as any).assetStats = assetStats;
}


/**
 * 模型上传演示
 * 创建一个文件上传界面，允许用户上传 GLB 文件
 */
export function modelUploadDemo(): void {
  console.clear();
  console.log('='.repeat(60));
  console.log('PolyForge Model Upload Demo');
  console.log('='.repeat(60));

  // 创建或获取容器
  let container = document.getElementById('model-upload-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'model-upload-container';
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 30px;
      background: rgba(0, 0, 0, 0.95);
      border-radius: 15px;
      z-index: 10000;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
      min-width: 400px;
      max-width: 600px;
    `;
    document.body.appendChild(container);
  }

  // 清空容器
  container.innerHTML = '';

  // 创建标题
  const title = document.createElement('h2');
  title.textContent = '📦 Model Upload';
  title.style.cssText = 'color: white; margin: 0 0 20px 0; font-family: Arial; text-align: center;';
  container.appendChild(title);

  // 创建文件输入
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.glb,.gltf';
  fileInput.style.cssText = `
    display: block;
    width: 100%;
    padding: 10px;
    margin-bottom: 15px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px dashed #4ECDC4;
    border-radius: 8px;
    color: white;
    font-family: Arial;
    cursor: pointer;
  `;
  container.appendChild(fileInput);

  // 创建上传按钮
  const uploadButton = document.createElement('button');
  uploadButton.textContent = 'Upload Model';
  uploadButton.disabled = true;
  uploadButton.style.cssText = `
    display: block;
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    margin-bottom: 15px;
    opacity: 0.5;
  `;
  container.appendChild(uploadButton);

  // 创建进度显示
  const progressDiv = document.createElement('div');
  progressDiv.style.cssText = 'color: #4ECDC4; font-family: monospace; font-size: 14px; margin-bottom: 15px; display: none;';
  container.appendChild(progressDiv);

  // 创建结果显示区域
  const resultDiv = document.createElement('div');
  resultDiv.style.cssText = 'color: white; font-family: Arial; font-size: 14px;';
  container.appendChild(resultDiv);

  // 创建关闭按钮
  const closeButton = document.createElement('button');
  closeButton.textContent = '✕ Close';
  closeButton.style.cssText = `
    display: block;
    width: 100%;
    padding: 10px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    margin-top: 15px;
  `;
  closeButton.onclick = () => container?.remove();
  container.appendChild(closeButton);

  // 文件选择事件
  let selectedFile: File | null = null;
  fileInput.onchange = (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      selectedFile = files[0];
      uploadButton.disabled = false;
      uploadButton.style.opacity = '1';
      console.log(`[ModelUpload] File selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`);
    }
  };

  // 上传按钮事件
  uploadButton.onclick = async () => {
    if (!selectedFile) return;

    try {
      // 禁用按钮
      uploadButton.disabled = true;
      uploadButton.textContent = 'Uploading...';
      progressDiv.style.display = 'block';
      progressDiv.textContent = '⏳ Initializing...';
      resultDiv.innerHTML = '';

      // 初始化注册表
      const registry = getAssetRegistry();
      await registry.initialize();
      progressDiv.textContent = '⏳ Parsing model...';

      // 导入模型
      const startTime = Date.now();
      const { id, metadata } = await registry.importModel(selectedFile);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      progressDiv.textContent = `✓ Upload complete in ${duration}s`;

      // 显示结果
      const assetMetadata = await registry.getMetadata(id);
      if (assetMetadata) {
        resultDiv.innerHTML = `
          <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; margin-top: 15px;">
            <h3 style="margin: 0 0 10px 0; color: #4ECDC4;">✓ Model Imported</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${assetMetadata.name}</p>
            <p style="margin: 5px 0;"><strong>ID:</strong> <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">${id}</code></p>
            <p style="margin: 5px 0;"><strong>Size:</strong> ${(assetMetadata.size / 1024).toFixed(2)} KB</p>
            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 10px 0;">
            <h4 style="margin: 10px 0 5px 0; color: #4ECDC4;">Model Statistics:</h4>
            <p style="margin: 5px 0;"><strong>Vertices:</strong> ${metadata.vertices.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Faces:</strong> ${metadata.faces.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Bones:</strong> ${metadata.bones}</p>
            <p style="margin: 5px 0;"><strong>Animations:</strong> ${metadata.animations}</p>
            <p style="margin: 5px 0;"><strong>Materials:</strong> ${metadata.materials}</p>
            <p style="margin: 5px 0;"><strong>Textures:</strong> ${metadata.textures}</p>
            ${assetMetadata.thumbnail ? `
              <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 10px 0;">
              <h4 style="margin: 10px 0 5px 0; color: #4ECDC4;">Preview:</h4>
              <img src="${assetMetadata.thumbnail}" style="width: 128px; height: 128px; border: 2px solid #4ECDC4; border-radius: 8px; display: block; margin: 10px 0;">
            ` : ''}
          </div>
        `;
      }

      // 重置按钮
      uploadButton.textContent = 'Upload Another Model';
      uploadButton.disabled = false;
      fileInput.value = '';
      selectedFile = null;

      console.log('[ModelUpload] Upload complete!');
      console.log('Model ID:', id);
      console.log('Metadata:', metadata);

    } catch (error) {
      console.error('[ModelUpload] Upload failed:', error);
      progressDiv.textContent = '❌ Upload failed';
      progressDiv.style.color = '#FF6B6B';
      resultDiv.innerHTML = `
        <div style="background: rgba(255, 107, 107, 0.1); padding: 15px; border-radius: 8px; margin-top: 15px; border: 1px solid #FF6B6B;">
          <p style="margin: 0; color: #FF6B6B;"><strong>Error:</strong> ${(error as Error).message}</p>
        </div>
      `;
      uploadButton.textContent = 'Try Again';
      uploadButton.disabled = false;
    }
  };

  console.log('\n✓ Model upload interface created');
  console.log('Select a GLB/GLTF file and click "Upload Model"');
}

// 导出到 window 对象
if (typeof window !== 'undefined') {
  (window as any).modelUploadDemo = modelUploadDemo;
}


/**
 * 音频上传演示
 * 创建一个文件上传界面，允许用户上传音频文件
 */
export function audioUploadDemo(): void {
  console.clear();
  console.log('='.repeat(60));
  console.log('PolyForge Audio Upload Demo');
  console.log('='.repeat(60));

  // 创建或获取容器
  let container = document.getElementById('audio-upload-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'audio-upload-container';
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 30px;
      background: rgba(0, 0, 0, 0.95);
      border-radius: 15px;
      z-index: 10000;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
      min-width: 400px;
      max-width: 600px;
    `;
    document.body.appendChild(container);
  }

  // 清空容器
  container.innerHTML = '';

  // 创建标题
  const title = document.createElement('h2');
  title.textContent = '🎵 Audio Upload';
  title.style.cssText = 'color: white; margin: 0 0 20px 0; font-family: Arial; text-align: center;';
  container.appendChild(title);

  // 创建文件输入
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.mp3,.wav,.ogg';
  fileInput.style.cssText = `
    display: block;
    width: 100%;
    padding: 10px;
    margin-bottom: 15px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px dashed #4ECDC4;
    border-radius: 8px;
    color: white;
    font-family: Arial;
    cursor: pointer;
  `;
  container.appendChild(fileInput);

  // 创建上传按钮
  const uploadButton = document.createElement('button');
  uploadButton.textContent = 'Upload Audio';
  uploadButton.disabled = true;
  uploadButton.style.cssText = `
    display: block;
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    margin-bottom: 15px;
    opacity: 0.5;
  `;
  container.appendChild(uploadButton);

  // 创建进度显示
  const progressDiv = document.createElement('div');
  progressDiv.style.cssText = 'color: #4ECDC4; font-family: monospace; font-size: 14px; margin-bottom: 15px; display: none;';
  container.appendChild(progressDiv);

  // 创建结果显示区域
  const resultDiv = document.createElement('div');
  resultDiv.style.cssText = 'color: white; font-family: Arial; font-size: 14px;';
  container.appendChild(resultDiv);

  // 创建音频播放器容器
  const audioPlayerDiv = document.createElement('div');
  audioPlayerDiv.style.cssText = 'margin-top: 15px; display: none;';
  container.appendChild(audioPlayerDiv);

  // 创建关闭按钮
  const closeButton = document.createElement('button');
  closeButton.textContent = '✕ Close';
  closeButton.style.cssText = `
    display: block;
    width: 100%;
    padding: 10px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    margin-top: 15px;
  `;
  closeButton.onclick = () => {
    // 停止所有音频播放
    const audioElements = container?.querySelectorAll('audio');
    audioElements?.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    container?.remove();
  };
  container.appendChild(closeButton);

  // 文件选择事件
  let selectedFile: File | null = null;
  fileInput.onchange = (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      selectedFile = files[0];
      uploadButton.disabled = false;
      uploadButton.style.opacity = '1';
      console.log(`[AudioUpload] File selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`);
    }
  };

  // 上传按钮事件
  uploadButton.onclick = async () => {
    if (!selectedFile) return;

    try {
      // 禁用按钮
      uploadButton.disabled = true;
      uploadButton.textContent = 'Uploading...';
      progressDiv.style.display = 'block';
      progressDiv.textContent = '⏳ Initializing...';
      resultDiv.innerHTML = '';
      audioPlayerDiv.style.display = 'none';
      audioPlayerDiv.innerHTML = '';

      // 初始化注册表
      const registry = getAssetRegistry();
      await registry.initialize();
      progressDiv.textContent = '⏳ Parsing audio...';

      // 导入音频
      const startTime = Date.now();
      const { id, metadata } = await registry.importAudio(selectedFile);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      progressDiv.textContent = `✓ Upload complete in ${duration}s`;

      // 显示结果
      const assetMetadata = await registry.getMetadata(id);
      if (assetMetadata) {
        // 格式化时长
        const minutes = Math.floor(metadata.duration / 60);
        const seconds = Math.floor(metadata.duration % 60);
        const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        resultDiv.innerHTML = `
          <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; margin-top: 15px;">
            <h3 style="margin: 0 0 10px 0; color: #4ECDC4;">✓ Audio Imported</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${assetMetadata.name}</p>
            <p style="margin: 5px 0;"><strong>ID:</strong> <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">${id}</code></p>
            <p style="margin: 5px 0;"><strong>Size:</strong> ${(assetMetadata.size / 1024).toFixed(2)} KB</p>
            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 10px 0;">
            <h4 style="margin: 10px 0 5px 0; color: #4ECDC4;">Audio Information:</h4>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${durationStr} (${metadata.duration.toFixed(2)}s)</p>
            <p style="margin: 5px 0;"><strong>Sample Rate:</strong> ${metadata.sampleRate.toLocaleString()} Hz</p>
            <p style="margin: 5px 0;"><strong>Channels:</strong> ${metadata.numberOfChannels} (${metadata.numberOfChannels === 1 ? 'Mono' : metadata.numberOfChannels === 2 ? 'Stereo' : 'Multi-channel'})</p>
            <p style="margin: 5px 0;"><strong>Format:</strong> ${metadata.format.toUpperCase()}</p>
          </div>
        `;

        // 创建音频播放器
        const audioBlob = await registry.getAsset(id);
        if (audioBlob) {
          const audioUrl = URL.createObjectURL(audioBlob);
          
          audioPlayerDiv.innerHTML = `
            <div style="background: rgba(78, 205, 196, 0.1); padding: 15px; border-radius: 8px; border: 1px solid #4ECDC4;">
              <h4 style="margin: 0 0 10px 0; color: #4ECDC4;">🎧 Audio Preview</h4>
              <audio controls style="width: 100%; margin-bottom: 10px;">
                <source src="${audioUrl}" type="${selectedFile.type}">
                Your browser does not support the audio element.
              </audio>
              <div style="display: flex; gap: 10px;">
                <button id="play-btn" style="flex: 1; padding: 8px; background: #4ECDC4; color: black; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">▶ Play</button>
                <button id="stop-btn" style="flex: 1; padding: 8px; background: #FF6B6B; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">⏹ Stop</button>
              </div>
            </div>
          `;
          audioPlayerDiv.style.display = 'block';

          // 获取音频元素和按钮
          const audioElement = audioPlayerDiv.querySelector('audio') as HTMLAudioElement;
          const playBtn = audioPlayerDiv.querySelector('#play-btn') as HTMLButtonElement;
          const stopBtn = audioPlayerDiv.querySelector('#stop-btn') as HTMLButtonElement;

          // 播放按钮
          playBtn.onclick = () => {
            if (audioElement.paused) {
              audioElement.play();
              playBtn.textContent = '⏸ Pause';
            } else {
              audioElement.pause();
              playBtn.textContent = '▶ Play';
            }
          };

          // 停止按钮
          stopBtn.onclick = () => {
            audioElement.pause();
            audioElement.currentTime = 0;
            playBtn.textContent = '▶ Play';
          };

          // 音频结束事件
          audioElement.onended = () => {
            playBtn.textContent = '▶ Play';
          };
        }
      }

      // 重置按钮
      uploadButton.textContent = 'Upload Another Audio';
      uploadButton.disabled = false;
      fileInput.value = '';
      selectedFile = null;

      console.log('[AudioUpload] Upload complete!');
      console.log('Audio ID:', id);
      console.log('Metadata:', metadata);

    } catch (error) {
      console.error('[AudioUpload] Upload failed:', error);
      progressDiv.textContent = '❌ Upload failed';
      progressDiv.style.color = '#FF6B6B';
      resultDiv.innerHTML = `
        <div style="background: rgba(255, 107, 107, 0.1); padding: 15px; border-radius: 8px; margin-top: 15px; border: 1px solid #FF6B6B;">
          <p style="margin: 0; color: #FF6B6B;"><strong>Error:</strong> ${(error as Error).message}</p>
        </div>
      `;
      uploadButton.textContent = 'Try Again';
      uploadButton.disabled = false;
    }
  };

  console.log('\n✓ Audio upload interface created');
  console.log('Select an MP3/WAV/OGG file and click "Upload Audio"');
}

// 导出到 window 对象
if (typeof window !== 'undefined') {
  (window as any).audioUploadDemo = audioUploadDemo;
}
