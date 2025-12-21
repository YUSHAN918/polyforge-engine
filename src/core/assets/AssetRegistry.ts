/**
 * PolyForge Asset System - Asset Registry
 * 
 * 核心资产注册表，实现单例模式
 * 提供资产的注册、查询、缓存管理
 * 
 * 架构：
 * - 内存缓存（Map）用于快速访问
 * - IndexedDB 用于持久化存储
 * - 三层查询策略：缓存 -> IndexedDB -> 返回
 */

import { IndexedDBStorage } from './IndexedDBStorage';
import { ModelImporter } from './ModelImporter';
import type { AssetMetadata, AssetType, AssetFilter, ImportOptions, AssetData, ModelMetadata } from './types';

/**
 * 资产注册表（单例）
 */
export class AssetRegistry {
  private static instance: AssetRegistry | null = null;
  
  private storage: IndexedDBStorage;
  private modelImporter: ModelImporter;
  private cache: Map<string, any>;           // 内存缓存
  private metadataCache: Map<string, AssetMetadata>; // 元数据缓存
  private initialized: boolean = false;

  /**
   * 私有构造函数（单例模式）
   */
  private constructor() {
    this.storage = new IndexedDBStorage();
    this.modelImporter = new ModelImporter();
    this.cache = new Map();
    this.metadataCache = new Map();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): AssetRegistry {
    if (!AssetRegistry.instance) {
      AssetRegistry.instance = new AssetRegistry();
    }
    return AssetRegistry.instance;
  }

  /**
   * 初始化注册表
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.storage.initialize();
      
      // 预加载所有元数据到缓存
      const allMetadata = await this.storage.getAllMetadata();
      for (const metadata of allMetadata) {
        this.metadataCache.set(metadata.id, metadata);
      }
      
      this.initialized = true;
      console.log(`[AssetRegistry] Initialized with ${allMetadata.length} assets`);
    } catch (error) {
      console.error('[AssetRegistry] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('AssetRegistry not initialized. Call initialize() first.');
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 注册资产
   * 
   * @param metadata 资产元数据
   * @param data 资产数据（Blob）
   * @returns 资产 ID
   */
  async registerAsset(metadata: Omit<AssetMetadata, 'id' | 'createdAt'>, data: Blob): Promise<string> {
    this.ensureInitialized();

    // 生成完整的元数据
    const fullMetadata: AssetMetadata = {
      ...metadata,
      id: this.generateId(),
      createdAt: Date.now(),
    };

    try {
      // 保存到 IndexedDB
      await this.storage.saveMetadata(fullMetadata);
      await this.storage.saveFile(fullMetadata.id, data);

      // 更新元数据缓存
      this.metadataCache.set(fullMetadata.id, fullMetadata);

      console.log(`[AssetRegistry] Registered asset: ${fullMetadata.name} (${fullMetadata.id})`);
      return fullMetadata.id;
    } catch (error) {
      console.error('[AssetRegistry] Failed to register asset:', error);
      throw error;
    }
  }

  /**
   * 导入模型资产
   * 
   * @param file 模型文件（GLB/GLTF）
   * @param options 导入选项
   * @returns 资产 ID 和元数据
   */
  async importModel(file: File, options: ImportOptions = {}): Promise<{ id: string; metadata: ModelMetadata }> {
    this.ensureInitialized();

    console.log(`[AssetRegistry] Importing model: ${file.name}`);

    try {
      // 1. 使用 ModelImporter 导入模型
      const { blob, metadata, thumbnail } = await this.modelImporter.importModel(file);

      // 2. 注册资产
      const assetId = await this.registerAsset(
        {
          name: file.name.replace(/\.(glb|gltf)$/i, ''),
          type: 'model' as any,
          category: options.category || 'models',
          tags: options.tags || ['imported', 'model'],
          size: blob.size,
          thumbnail,
        },
        blob
      );

      console.log(`[AssetRegistry] Model imported successfully: ${assetId}`);
      console.log(`[AssetRegistry] Metadata:`, metadata);

      return {
        id: assetId,
        metadata,
      };
    } catch (error) {
      console.error('[AssetRegistry] Failed to import model:', error);
      throw error;
    }
  }

  /**
   * 获取资产
   * 三层查询策略：缓存 -> IndexedDB -> 返回
   * 
   * @param id 资产 ID
   * @returns 资产数据（Blob）
   */
  async getAsset(id: string): Promise<Blob | null> {
    this.ensureInitialized();

    // 1. 检查内存缓存
    if (this.cache.has(id)) {
      console.log(`[AssetRegistry] Cache hit: ${id}`);
      return this.cache.get(id);
    }

    // 2. 从 IndexedDB 加载
    try {
      const data = await this.storage.getFile(id);
      
      if (data) {
        // 3. 更新缓存
        this.cache.set(id, data);
        console.log(`[AssetRegistry] Loaded from IndexedDB: ${id}`);
        return data;
      }

      console.warn(`[AssetRegistry] Asset not found: ${id}`);
      return null;
    } catch (error) {
      console.error(`[AssetRegistry] Failed to get asset ${id}:`, error);
      return null;
    }
  }

  /**
   * 获取资产元数据
   * 
   * @param id 资产 ID
   * @returns 资产元数据
   */
  async getMetadata(id: string): Promise<AssetMetadata | null> {
    this.ensureInitialized();

    // 优先从缓存获取
    if (this.metadataCache.has(id)) {
      return this.metadataCache.get(id)!;
    }

    // 从 IndexedDB 加载
    try {
      const metadata = await this.storage.getMetadata(id);
      if (metadata) {
        this.metadataCache.set(id, metadata);
      }
      return metadata;
    } catch (error) {
      console.error(`[AssetRegistry] Failed to get metadata ${id}:`, error);
      return null;
    }
  }

  /**
   * 删除资产
   * 
   * @param id 资产 ID
   */
  async deleteAsset(id: string): Promise<void> {
    this.ensureInitialized();

    try {
      // 从 IndexedDB 删除
      await this.storage.deleteAsset(id);

      // 从缓存删除
      this.cache.delete(id);
      this.metadataCache.delete(id);

      console.log(`[AssetRegistry] Deleted asset: ${id}`);
    } catch (error) {
      console.error(`[AssetRegistry] Failed to delete asset ${id}:`, error);
      throw error;
    }
  }

  /**
   * 查询资产
   * 
   * @param filter 查询过滤器
   * @returns 匹配的资产元数据列表
   */
  async queryAssets(filter: AssetFilter = {}): Promise<AssetMetadata[]> {
    this.ensureInitialized();

    let results: AssetMetadata[] = [];

    try {
      // 如果有类型过滤，使用索引查询
      if (filter.type) {
        results = await this.storage.getMetadataByType(filter.type);
      } 
      // 如果有分类过滤，使用索引查询
      else if (filter.category) {
        results = await this.storage.getMetadataByCategory(filter.category);
      } 
      // 否则获取所有
      else {
        results = Array.from(this.metadataCache.values());
      }

      // 应用额外的过滤条件
      if (filter.tags && filter.tags.length > 0) {
        results = results.filter(metadata => 
          filter.tags!.every(tag => metadata.tags.includes(tag))
        );
      }

      if (filter.namePattern) {
        const pattern = filter.namePattern.toLowerCase();
        results = results.filter(metadata => 
          metadata.name.toLowerCase().includes(pattern)
        );
      }

      return results;
    } catch (error) {
      console.error('[AssetRegistry] Failed to query assets:', error);
      return [];
    }
  }

  /**
   * 获取所有资产元数据
   */
  async getAllMetadata(): Promise<AssetMetadata[]> {
    this.ensureInitialized();
    return Array.from(this.metadataCache.values());
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[AssetRegistry] Cache cleared');
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * 清空所有数据（用于测试）
   */
  async clearAll(): Promise<void> {
    this.ensureInitialized();
    
    await this.storage.clear();
    this.cache.clear();
    this.metadataCache.clear();
    
    console.log('[AssetRegistry] All data cleared');
  }

  /**
   * 关闭注册表
   */
  close(): void {
    this.storage.close();
    this.modelImporter.dispose();
    this.cache.clear();
    this.metadataCache.clear();
    this.initialized = false;
    AssetRegistry.instance = null;
    console.log('[AssetRegistry] Closed');
  }
}

/**
 * 导出单例访问函数
 */
export function getAssetRegistry(): AssetRegistry {
  return AssetRegistry.getInstance();
}
