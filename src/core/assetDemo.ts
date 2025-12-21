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
import type { AssetMetadata } from './assets/types';

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
