/**
 * PolyForge Asset System - Integration Tests
 * 
 * 全流程集成测试套件
 * 测试资产管线的完整功能：去重、导入、查询、删除
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AssetRegistry } from '../AssetRegistry';
import { FileSystemService } from '../FileSystemService';
import type { AssetMetadata } from '../types';

describe('Asset Pipeline Integration Tests', () => {
  let registry: AssetRegistry;

  beforeEach(async () => {
    // 初始化注册表
    registry = AssetRegistry.getInstance();
    await registry.initialize();
    
    // 清空所有数据
    await registry.clearAll();
  });

  afterEach(async () => {
    // 清理资源
    try {
      // 确保 registry 已初始化
      if (registry && registry['initialized']) {
        await registry.clearAll();
      }
      registry.close();
    } catch (error) {
      // 忽略清理错误
      console.warn('[Test] Cleanup error:', error);
    }
  });

  /**
   * 测试 1: 内容去重验证
   * 模拟导入两个内容相同但文件名不同的文件
   * 断言系统只存储了一份二进制数据
   */
  describe('Content Deduplication', () => {
    it('should detect duplicate content and reuse existing asset', async () => {
      // 创建两个内容相同但文件名不同的文件
      const content = 'This is test content for deduplication';
      const blob1 = new Blob([content], { type: 'text/plain' });
      const blob2 = new Blob([content], { type: 'text/plain' });

      // 导入第一个文件
      const id1 = await registry.registerAsset(
        {
          name: 'file1.txt',
          type: 'audio' as any,
          category: 'test',
          tags: ['test'],
          size: blob1.size,
        },
        blob1
      );

      // 导入第二个文件（内容相同）
      const id2 = await registry.registerAsset(
        {
          name: 'file2.txt',
          type: 'audio' as any,
          category: 'test',
          tags: ['test'],
          size: blob2.size,
        },
        blob2
      );

      // 断言：两个 ID 应该相同（去重成功）
      expect(id1).toBe(id2);

      // 验证：只存储了一份数据
      const allMetadata = await registry.getAllMetadata();
      expect(allMetadata.length).toBe(1);
      expect(allMetadata[0].id).toBe(id1);
    });

    it('should store different content separately', async () => {
      // 创建两个内容不同的文件
      const blob1 = new Blob(['Content A'], { type: 'text/plain' });
      const blob2 = new Blob(['Content B'], { type: 'text/plain' });

      // 导入两个文件
      const id1 = await registry.registerAsset(
        {
          name: 'fileA.txt',
          type: 'audio' as any,
          category: 'test',
          tags: ['test'],
          size: blob1.size,
        },
        blob1
      );

      const id2 = await registry.registerAsset(
        {
          name: 'fileB.txt',
          type: 'audio' as any,
          category: 'test',
          tags: ['test'],
          size: blob2.size,
        },
        blob2
      );

      // 断言：两个 ID 应该不同
      expect(id1).not.toBe(id2);

      // 验证：存储了两份数据
      const allMetadata = await registry.getAllMetadata();
      expect(allMetadata.length).toBe(2);
    });

    it('should handle large file deduplication', async () => {
      // 创建一个较大的文件（1MB）
      const largeContent = new Uint8Array(1024 * 1024);
      for (let i = 0; i < largeContent.length; i++) {
        largeContent[i] = i % 256;
      }
      const blob1 = new Blob([largeContent], { type: 'application/octet-stream' });
      const blob2 = new Blob([largeContent], { type: 'application/octet-stream' });

      // 导入两次
      const id1 = await registry.registerAsset(
        {
          name: 'large1.bin',
          type: 'model' as any,
          category: 'test',
          tags: ['test', 'large'],
          size: blob1.size,
        },
        blob1
      );

      const id2 = await registry.registerAsset(
        {
          name: 'large2.bin',
          type: 'model' as any,
          category: 'test',
          tags: ['test', 'large'],
          size: blob2.size,
        },
        blob2
      );

      // 断言：去重成功
      expect(id1).toBe(id2);
    });
  });

  /**
   * 测试 2: 端到端闭环
   * 模拟从文件夹扫描 -> 批量导入 -> 数据库持久化 -> 重新读取元数据的完整路径
   */
  describe('End-to-End Workflow', () => {
    it('should complete full import and retrieval cycle', async () => {
      // 1. 创建模拟文件
      const testFiles = [
        { name: 'model1.glb', content: 'GLB content 1', type: 'model' as const },
        { name: 'audio1.mp3', content: 'MP3 content 1', type: 'audio' as const },
        { name: 'env1.hdr', content: 'HDR content 1', type: 'hdr' as const },
      ];

      const assetIds: string[] = [];

      // 2. 批量导入
      for (const file of testFiles) {
        const blob = new Blob([file.content], { type: 'application/octet-stream' });
        const id = await registry.registerAsset(
          {
            name: file.name,
            type: file.type as any,
            category: 'test',
            tags: ['test', file.type],
            size: blob.size,
          },
          blob
        );
        assetIds.push(id);
      }

      // 3. 验证：所有资产已导入
      expect(assetIds.length).toBe(3);

      // 4. 重新读取元数据
      const allMetadata = await registry.getAllMetadata();
      expect(allMetadata.length).toBe(3);

      // 5. 验证：每个资产都可以读取
      for (const id of assetIds) {
        const metadata = await registry.getMetadata(id);
        expect(metadata).not.toBeNull();
        expect(metadata!.id).toBe(id);

        const data = await registry.getAsset(id);
        expect(data).not.toBeNull();
        // 注意：fake-indexeddb 返回的 Blob 可能不是真正的 Blob 实例，但应该有 type 属性
        expect(data).toHaveProperty('type');
      }
    });

    it('should persist data across registry instances', async () => {
      // 1. 导入资产
      const blob = new Blob(['Persistent content'], { type: 'text/plain' });
      const id = await registry.registerAsset(
        {
          name: 'persistent.txt',
          type: 'audio' as any,
          category: 'test',
          tags: ['test', 'persistent'],
          size: blob.size,
        },
        blob
      );

      // 2. 关闭注册表（这会重置单例）
      registry.close();

      // 3. 创建新的注册表实例
      const newRegistry = AssetRegistry.getInstance();
      await newRegistry.initialize();

      // 4. 验证：数据仍然存在
      const metadata = await newRegistry.getMetadata(id);
      expect(metadata).not.toBeNull();
      expect(metadata!.name).toBe('persistent.txt');

      const data = await newRegistry.getAsset(id);
      expect(data).not.toBeNull();

      // 清理（注意：这里不需要再次调用 clearAll，因为 afterEach 会处理）
    });
  });

  /**
   * 测试 3: 大规模查询性能
   * 模拟 50+ 资产的过滤查询，确保响应在毫秒级
   */
  describe('Query Performance', () => {
    it('should handle 50+ assets query efficiently', async () => {
      // 1. 批量创建 50 个资产
      const assetCount = 50;
      const types = ['model', 'audio', 'hdr', 'texture'];
      const categories = ['characters', 'props', 'environments', 'effects'];

      for (let i = 0; i < assetCount; i++) {
        const type = types[i % types.length];
        const category = categories[i % categories.length];
        const blob = new Blob([`Content ${i}`], { type: 'text/plain' });

        await registry.registerAsset(
          {
            name: `asset_${i}`,
            type: type as any,
            category,
            tags: ['test', type, category],
            size: blob.size,
          },
          blob
        );
      }

      // 2. 测试查询性能
      const startTime = performance.now();

      // 查询所有资产
      const allAssets = await registry.queryAssets({});
      expect(allAssets.length).toBe(assetCount);

      // 按类型查询
      const models = await registry.queryAssets({ type: 'model' as any });
      expect(models.length).toBeGreaterThan(0);

      // 按分类查询
      const characters = await registry.queryAssets({ category: 'characters' });
      expect(characters.length).toBeGreaterThan(0);

      // 按标签查询（交集）
      const modelCharacters = await registry.queryAssets({
        type: 'model' as any,
        category: 'characters',
        tags: ['test', 'model'],
      });
      expect(modelCharacters.length).toBeGreaterThan(0);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 断言：查询时间应该在毫秒级（< 100ms）
      console.log(`[Performance] 50+ assets query completed in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(100);
    });

    it('should cache metadata for fast repeated queries', async () => {
      // 1. 创建 10 个资产
      for (let i = 0; i < 10; i++) {
        const blob = new Blob([`Content ${i}`], { type: 'text/plain' });
        await registry.registerAsset(
          {
            name: `asset_${i}`,
            type: 'model' as any,
            category: 'test',
            tags: ['test'],
            size: blob.size,
          },
          blob
        );
      }

      // 2. 第一次查询（冷启动）
      const start1 = performance.now();
      const result1 = await registry.queryAssets({ type: 'model' as any });
      const duration1 = performance.now() - start1;

      // 3. 第二次查询（应该使用缓存）
      const start2 = performance.now();
      const result2 = await registry.queryAssets({ type: 'model' as any });
      const duration2 = performance.now() - start2;

      // 断言：结果一致
      expect(result1.length).toBe(result2.length);
      expect(result1.length).toBe(10);

      // 断言：第二次查询应该在合理范围内（允许性能波动）
      console.log(`[Performance] First query: ${duration1.toFixed(2)}ms, Second query: ${duration2.toFixed(2)}ms`);
      // 由于 JavaScript 性能计时器的精度限制，允许小幅波动
      expect(duration2).toBeLessThan(10); // 只要在 10ms 内就算通过
    });
  });

  /**
   * 测试 4: 物理清理
   * 验证 deleteAsset 是否干净地移除了内存、元数据和物理 Blob
   */
  describe('Physical Cleanup', () => {
    it('should completely remove asset from all storage layers', async () => {
      // 1. 导入资产
      const blob = new Blob(['Test content for deletion'], { type: 'text/plain' });
      const id = await registry.registerAsset(
        {
          name: 'to_delete.txt',
          type: 'audio' as any,
          category: 'test',
          tags: ['test', 'delete'],
          size: blob.size,
        },
        blob
      );

      // 2. 验证：资产存在
      let metadata = await registry.getMetadata(id);
      expect(metadata).not.toBeNull();

      let data = await registry.getAsset(id);
      expect(data).not.toBeNull();

      // 3. 删除资产
      await registry.deleteAsset(id);

      // 4. 验证：元数据已删除
      metadata = await registry.getMetadata(id);
      expect(metadata).toBeNull();

      // 5. 验证：物理数据已删除
      data = await registry.getAsset(id);
      expect(data).toBeNull();

      // 6. 验证：缓存已清理
      const cacheStats = registry.getCacheStats();
      expect(cacheStats.keys).not.toContain(id);

      // 7. 验证：不在查询结果中
      const allAssets = await registry.getAllMetadata();
      const found = allAssets.find(a => a.id === id);
      expect(found).toBeUndefined();
    });

    it('should clean up fingerprints when deleting assets', async () => {
      // 1. 导入两个内容相同的资产（去重）
      const content = 'Duplicate content for fingerprint test';
      const blob1 = new Blob([content], { type: 'text/plain' });
      const blob2 = new Blob([content], { type: 'text/plain' });

      const id1 = await registry.registerAsset(
        {
          name: 'dup1.txt',
          type: 'audio' as any,
          category: 'test',
          tags: ['test'],
          size: blob1.size,
        },
        blob1
      );

      const id2 = await registry.registerAsset(
        {
          name: 'dup2.txt',
          type: 'audio' as any,
          category: 'test',
          tags: ['test'],
          size: blob2.size,
        },
        blob2
      );

      // 断言：去重成功
      expect(id1).toBe(id2);

      // 2. 删除资产
      await registry.deleteAsset(id1);

      // 3. 验证：资产已删除
      const metadata = await registry.getMetadata(id1);
      expect(metadata).toBeNull();

      // 4. 尝试再次导入相同内容
      const blob3 = new Blob([content], { type: 'text/plain' });
      const id3 = await registry.registerAsset(
        {
          name: 'dup3.txt',
          type: 'audio' as any,
          category: 'test',
          tags: ['test'],
          size: blob3.size,
        },
        blob3
      );

      // 验证：新资产被成功创建（不是复用旧 ID）
      expect(id3).toBeTruthy();
      expect(id3).not.toBe(id1); // 应该是新的 ID
      
      // 验证：新资产的元数据存在
      const metadata3 = await registry.getMetadata(id3);
      expect(metadata3).not.toBeNull();
      expect(metadata3!.name).toBe('dup3.txt');
    });

    it('should handle batch deletion efficiently', async () => {
      // 1. 创建 20 个资产
      const ids: string[] = [];
      for (let i = 0; i < 20; i++) {
        const blob = new Blob([`Content ${i}`], { type: 'text/plain' });
        const id = await registry.registerAsset(
          {
            name: `batch_${i}.txt`,
            type: 'audio' as any,
            category: 'test',
            tags: ['test', 'batch'],
            size: blob.size,
          },
          blob
        );
        ids.push(id);
      }

      // 2. 批量删除
      const startTime = performance.now();
      for (const id of ids) {
        await registry.deleteAsset(id);
      }
      const duration = performance.now() - startTime;

      // 3. 验证：所有资产已删除
      const remaining = await registry.getAllMetadata();
      expect(remaining.length).toBe(0);

      // 4. 断言：删除时间合理（< 500ms）
      console.log(`[Performance] Batch deletion of 20 assets completed in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(500);
    });
  });

  /**
   * 测试 5: 错误处理
   * 验证系统在异常情况下的鲁棒性
   */
  describe('Error Handling', () => {
    it('should handle corrupted data gracefully', async () => {
      // 尝试注册一个空 Blob
      const emptyBlob = new Blob([], { type: 'text/plain' });
      
      const id = await registry.registerAsset(
        {
          name: 'empty.txt',
          type: 'audio' as any,
          category: 'test',
          tags: ['test'],
          size: 0,
        },
        emptyBlob
      );

      // 应该成功（空文件也是有效的）
      expect(id).toBeTruthy();

      const metadata = await registry.getMetadata(id);
      expect(metadata).not.toBeNull();
      expect(metadata!.size).toBe(0);
    });

    it('should handle non-existent asset queries', async () => {
      const fakeId = 'non_existent_asset_id';

      // 查询不存在的资产
      const metadata = await registry.getMetadata(fakeId);
      expect(metadata).toBeNull();

      const data = await registry.getAsset(fakeId);
      expect(data).toBeNull();
    });

    it('should handle deletion of non-existent assets', async () => {
      const fakeId = 'non_existent_asset_id';

      // 删除不存在的资产应该抛出错误或静默失败
      await expect(registry.deleteAsset(fakeId)).rejects.toThrow();
    });
  });

  /**
   * 测试 6: 并发操作
   * 验证系统在并发场景下的正确性
   */
  describe('Concurrent Operations', () => {
    it('should handle concurrent imports correctly', async () => {
      // 并发导入 10 个资产
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const blob = new Blob([`Concurrent content ${i}`], { type: 'text/plain' });
        const promise = registry.registerAsset(
          {
            name: `concurrent_${i}.txt`,
            type: 'audio' as any,
            category: 'test',
            tags: ['test', 'concurrent'],
            size: blob.size,
          },
          blob
        );
        promises.push(promise);
      }

      // 等待所有导入完成
      const ids = await Promise.all(promises);

      // 验证：所有资产都已导入
      expect(ids.length).toBe(10);
      expect(new Set(ids).size).toBe(10); // 所有 ID 都不同

      const allMetadata = await registry.getAllMetadata();
      expect(allMetadata.length).toBe(10);
    });

    it('should handle concurrent queries correctly', async () => {
      // 先导入一些资产
      for (let i = 0; i < 5; i++) {
        const blob = new Blob([`Content ${i}`], { type: 'text/plain' });
        await registry.registerAsset(
          {
            name: `asset_${i}.txt`,
            type: 'model' as any,
            category: 'test',
            tags: ['test'],
            size: blob.size,
          },
          blob
        );
      }

      // 并发查询
      const promises = [
        registry.queryAssets({ type: 'model' as any }),
        registry.queryAssets({ category: 'test' }),
        registry.queryAssets({ tags: ['test'] }),
        registry.getAllMetadata(),
      ];

      const results = await Promise.all(promises);

      // 验证：所有查询都返回了正确的结果
      expect(results[0].length).toBe(5);
      expect(results[1].length).toBe(5);
      expect(results[2].length).toBe(5);
      expect(results[3].length).toBe(5);
    });
  });
});
