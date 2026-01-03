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

import * as THREE from 'three';
import { eventBus } from '../EventBus';
import { IndexedDBStorage } from './IndexedDBStorage';
import { ModelImporter } from './ModelImporter';
import { AudioImporter } from './AudioImporter';
import { HDRImporter } from './HDRImporter';
import { TextureImporter } from './TextureImporter';
import type { AssetMetadata, AssetType, AssetFilter, ImportOptions, AssetData, ModelMetadata, AudioMetadata, HDRMetadata, TextureMetadata } from './types';

/**
 * 资产注册表（单例）
 */
export class AssetRegistry {
  private static instance: AssetRegistry | null = null;

  private storage: IndexedDBStorage;
  private modelImporter: ModelImporter;
  private audioImporter: AudioImporter;
  private hdrImporter: HDRImporter;
  private textureImporter: TextureImporter;
  private cache: Map<string, any>;           // 内存缓存
  private metadataCache: Map<string, AssetMetadata>; // 元数据缓存
  private envMapCache: Map<string, THREE.Texture>; // HDR envMap 缓存
  private initialized: boolean = false;

  /**
   * 私有构造函数（单例模式）
   */
  private constructor() {
    this.storage = new IndexedDBStorage();
    this.modelImporter = new ModelImporter();
    this.audioImporter = new AudioImporter();
    this.hdrImporter = new HDRImporter();
    this.textureImporter = new TextureImporter();
    this.cache = new Map();
    this.metadataCache = new Map();
    this.envMapCache = new Map();
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
   * 检查注册表是否已初始化
   */
  public isInitialized(): boolean {
    return this.initialized;
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
      eventBus.emit('ASSET_REGISTRY_CHANGED');
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
   * 等待初始化完成 (Promise)
   * 修复 AssetRegistry not initialized 时序问题的关键方法
   */
  public async waitForInitialization(): Promise<void> {
    if (this.initialized) return;

    // 如果正在初始化但未完成，或者还没开始，我们简单轮询等待
    // (更优雅的方式是使用 Promise resolver，但这里简单起见)
    return new Promise((resolve) => {
      const check = () => {
        if (this.initialized) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 计算文件内容的 SHA-256 哈希值
   * 用于内容去重
   */
  private async calculateHash(data: Blob | ArrayBuffer): Promise<string> {
    try {
      // 如果是 Blob，转换为 ArrayBuffer
      const buffer = data instanceof Blob ? await data.arrayBuffer() : data;

      // 使用 Web Crypto API 计算 SHA-256
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);

      // 转换为十六进制字符串
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      return hashHex;
    } catch (error) {
      console.error('[AssetRegistry] Failed to calculate hash:', error);
      throw error;
    }
  }

  /**
   * 检查内容是否已存在（去重）
   * 
   * @param data 文件数据
   * @returns 如果存在，返回已有资产的 ID；否则返回 null
   */
  private async checkDuplication(data: Blob): Promise<string | null> {
    try {
      // 1. 计算内容哈希
      const hash = await this.calculateHash(data);

      // 2. 查询指纹表
      const fingerprint = await this.storage.getFingerprintByHash(hash);

      if (fingerprint) {
        // 3. 验证资产是否仍然存在（防止指纹未被清理的情况）
        const metadata = await this.storage.getMetadata(fingerprint.assetId);

        if (metadata) {
          console.log(`[AssetRegistry] Content duplication detected! Hash: ${hash}, Existing asset: ${fingerprint.assetId}`);
          return fingerprint.assetId;
        } else {
          // 资产已被删除，但指纹未被清理（可能是测试环境限制）
          console.warn(`[AssetRegistry] Found orphaned fingerprint for hash: ${hash}, cleaning up...`);
          await this.storage.deleteFingerprint(hash);
          return null;
        }
      }

      return null;
    } catch (error) {
      console.error('[AssetRegistry] Failed to check duplication:', error);
      // 去重检查失败不应阻止导入，返回 null 继续正常流程
      return null;
    }
  }

  /**
   * 强行注册资产（用于 Bundle 恢复，保持 ID 一致性）
   * 
   * @param metadata 完整资产元数据（含 ID）
   * @param data 资产数据（Blob）
   */
  async forceRegisterAsset(metadata: AssetMetadata, data: Blob): Promise<string> {
    this.ensureInitialized();

    try {
      // 1. 保存到 IndexedDB
      await this.storage.saveMetadata(metadata);
      await this.storage.saveFile(metadata.id, data);

      // 2. 计算内容哈希并保存指纹（用于去重）
      const hash = await this.calculateHash(data);
      await this.storage.saveFingerprint({
        hash,
        size: data.size,
        assetId: metadata.id,
      });

      // 3. 更新元数据缓存
      this.metadataCache.set(metadata.id, metadata);

      console.log(`[AssetRegistry] Force registered asset: ${metadata.name} (${metadata.id})`);
      eventBus.emit('ASSET_REGISTRY_CHANGED');
      return metadata.id;
    } catch (error) {
      console.error('[AssetRegistry] Failed to force register asset:', error);
      throw error;
    }
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

    try {
      // 1. 检查内容去重
      const existingAssetId = await this.checkDuplication(data);

      if (existingAssetId) {
        // 内容已存在，直接返回已有资产的 ID
        console.log(`[AssetRegistry] Skipping duplicate content, reusing asset: ${existingAssetId}`);
        return existingAssetId;
      }

      // 2. 生成完整的元数据
      const fullMetadata: AssetMetadata = {
        ...metadata,
        id: this.generateId(),
        createdAt: Date.now(),
      } as AssetMetadata; // 明确强制转换为 AssetMetadata

      // 3. 计算内容哈希并保存指纹
      const hash = await this.calculateHash(data);
      await this.storage.saveFingerprint({
        hash,
        size: data.size,
        assetId: fullMetadata.id,
      });

      // 4. 保存到 IndexedDB
      await this.storage.saveMetadata(fullMetadata);
      await this.storage.saveFile(fullMetadata.id, data);

      // 5. 更新元数据缓存
      this.metadataCache.set(fullMetadata.id, fullMetadata);

      console.log(`[AssetRegistry] Registered asset: ${fullMetadata.name} (${fullMetadata.id})`);
      eventBus.emit('ASSET_REGISTRY_CHANGED');
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
          modelStats: metadata, // 🔥 核心修复：持久化精准几何数据
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
   * 智能推断音频子分类
   * @param filename 文件名
   */
  private inferAudioSubCategory(filename: string): any {
    const name = filename.toLowerCase();

    // BGM / Music
    if (/bgm|music|track|ost|theme|score|soundtrack/.test(name)) return 'bgm';

    // SFX / Effects
    if (/sfx|effect|hit|explosion|click|shoot|gun|attack|slash|coin|ui|step|jump|footstep/.test(name)) return 'sfx';

    // Voice / Dialog
    if (/voice|dialog|speech|narrat|vocal|talk/.test(name)) return 'voice';

    // Ambient / Environment
    if (/ambient|nature|environment|wind|rain|forest|city|crowd|atmosphere/.test(name)) return 'ambient';

    return 'general';
  }

  /**
   * 导入音频资产
   * 
   * @param file 音频文件（MP3/WAV/OGG）
   * @param options 导入选项
   * @returns 资产 ID 和元数据
   */
  async importAudio(file: File, options: ImportOptions = {}): Promise<{ id: string; metadata: AudioMetadata }> {
    this.ensureInitialized();

    console.log(`[AssetRegistry] Importing audio: ${file.name}`);

    try {
      // 1. 使用 AudioImporter 导入音频
      const { blob, metadata } = await this.audioImporter.importAudio(file);

      // 2. 智能分类
      const subCategory = options.category && options.category !== 'audio'
        ? options.category // 如果用户手动指定了非 audio 的分类（可能是旧逻辑），作为兜底
        : this.inferAudioSubCategory(file.name);

      // 3. 注册资产
      const assetId = await this.registerAsset(
        {
          name: file.name.replace(/\.(mp3|wav|ogg)$/i, ''),
          type: 'audio' as any,
          category: options.category || 'audio',
          subCategory, // 🔥 新增子分类
          tags: options.tags || ['imported', 'audio', metadata.format],
          size: blob.size,
          audioMetadata: metadata, // 🔥 核心修复：持久化音频元数据（时长等）
        },
        blob
      );

      console.log(`[AssetRegistry] Audio imported successfully: ${assetId} (Sub-Category: ${subCategory})`);
      console.log(`[AssetRegistry] Metadata:`, metadata);

      return {
        id: assetId,
        metadata,
      };
    } catch (error) {
      console.error('[AssetRegistry] Failed to import audio:', error);
      throw error;
    }
  }

  /**
   * 导入 HDR 环境贴图
   * 
   * @param file HDR 文件
   * @param options 导入选项
   * @returns 资产 ID、元数据和预处理的 envMap
   */
  async importHDR(file: File, options: ImportOptions = {}): Promise<{
    id: string;
    metadata: HDRMetadata;
    envMap: THREE.Texture;
  }> {
    this.ensureInitialized();

    console.log(`[AssetRegistry] Importing HDR: ${file.name}`);

    try {
      // 1. 使用 HDRImporter 导入 HDR
      const { blob, metadata, thumbnail, envMap } = await this.hdrImporter.importHDR(file);

      // 2. 注册资产
      const assetId = await this.registerAsset(
        {
          name: file.name.replace(/\.hdr$/i, ''),
          type: 'hdr' as any,
          category: options.category || 'environments',
          tags: options.tags || ['imported', 'hdr', 'environment'],
          size: blob.size,
          thumbnail,
        },
        blob
      );

      // 3. 缓存 envMap（用于即时预览）
      this.envMapCache.set(assetId, envMap);

      console.log(`[AssetRegistry] HDR imported successfully: ${assetId}`);
      console.log(`[AssetRegistry] Metadata:`, metadata);

      return {
        id: assetId,
        metadata,
        envMap,
      };
    } catch (error) {
      console.error('[AssetRegistry] Failed to import HDR:', error);
      throw error;
    }
  }

  /**
   * 导入纹理资产
   * 
   * @param file 图片文件
   * @param options 导入选项
   * @returns 资产 ID 和元数据
   */
  async importTexture(file: File, options: ImportOptions = {}): Promise<{ id: string; metadata: TextureMetadata }> {
    this.ensureInitialized();

    console.log(`[AssetRegistry] Importing texture: ${file.name}`);

    try {
      // 1. 使用 TextureImporter 导入纹理
      const { blob, metadata, thumbnail } = await this.textureImporter.importTexture(file);

      // 2. 注册资产
      const assetId = await this.registerAsset(
        {
          name: file.name.replace(/\.(png|jpg|jpeg|webp)$/i, ''),
          type: 'texture' as any,
          category: options.category || 'textures',
          tags: options.tags || ['imported', 'texture', metadata.format],
          size: blob.size,
          thumbnail,
          textureMetadata: metadata,
        },
        blob
      );

      console.log(`[AssetRegistry] Texture imported successfully: ${assetId}`);
      return {
        id: assetId,
        metadata,
      };
    } catch (error) {
      console.error('[AssetRegistry] Failed to import texture:', error);
      throw error;
    }
  }

  /**
   * 获取 HDR envMap（从缓存）
   * 
   * @param id 资产 ID
   * @returns envMap 纹理
   */
  getHDREnvMap(id: string): THREE.Texture | null {
    return this.envMapCache.get(id) || null;
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
   * 同步获取资产元数据 (限已缓存条目)
   */
  public getMetadataSync(id: string): AssetMetadata | null {
    return this.metadataCache.get(id) || null;
  }

  /**
   * 更新资产元数据 (支持部分更新)
   * 🔥 用于保存默认物理配置等
   */
  async updateAssetMetadata(id: string, partial: Partial<AssetMetadata>): Promise<void> {
    this.ensureInitialized();
    const existing = await this.getMetadata(id);
    if (!existing) throw new Error(`Asset not found: ${id}`);

    const updated = { ...existing, ...partial };

    console.log(`[AssetRegistry] Updating metadata for ${id}:`, {
      existing,
      partial,
      updated
    });

    // 1. Save to DB
    await this.storage.saveMetadata(updated);

    // 2. Update Cache
    this.metadataCache.set(id, updated);

    console.log(`[AssetRegistry] Asset metadata updated: ${id}`, partial);
    eventBus.emit('ASSET_REGISTRY_CHANGED');
  }

  /**
   * 删除资产
   * 确保同时删除 metadata 库和 files 库中的条目
   * 清理该资产在内存中的所有 cache 引用
   * 
   * @param id 资产 ID
   */
  async deleteAsset(id: string): Promise<void> {
    this.ensureInitialized();

    try {
      // 1. 检查资产是否存在
      const metadata = await this.storage.getMetadata(id);
      if (!metadata) {
        throw new Error(`Asset not found: ${id}`);
      }

      // 2. 获取文件数据以计算哈希（用于删除指纹）
      const fileData = await this.storage.getFile(id);

      if (fileData) {
        try {
          // 确保 Blob 转换为 ArrayBuffer
          // 兼容 fake-indexeddb：检查是否有 arrayBuffer 方法
          let arrayBuffer: ArrayBuffer;
          if (typeof (fileData as any).arrayBuffer === 'function') {
            arrayBuffer = await fileData.arrayBuffer();
          } else {
            // fallback: 使用 FileReader (同步版本不可用，跳过指纹删除)
            console.warn(`[AssetRegistry] Blob.arrayBuffer() not available, skipping fingerprint deletion for asset ${id}`);
            throw new Error('arrayBuffer() not available');
          }

          const hash = await this.calculateHash(arrayBuffer);
          await this.storage.deleteFingerprint(hash);
          console.log(`[AssetRegistry] Deleted fingerprint for asset: ${id}`);
        } catch (error) {
          console.warn(`[AssetRegistry] Failed to delete fingerprint for asset ${id}:`, error);
          // 指纹删除失败不应阻止资产删除
        }
      }

      // 3. 从 IndexedDB 删除（metadata + files）
      await this.storage.deleteAsset(id);

      // 4. 从 Blob 缓存删除
      this.cache.delete(id);

      // 5. 从元数据缓存删除
      this.metadataCache.delete(id);

      // 6. 如果是 HDR 资产，清理 envMap 纹理
      const envMap = this.envMapCache.get(id);
      if (envMap) {
        envMap.dispose();
        this.envMapCache.delete(id);
        console.log(`[AssetRegistry] Disposed envMap for asset: ${id}`);
      }

      console.log(`[AssetRegistry] Deleted asset: ${id}`);
      eventBus.emit('ASSET_REGISTRY_CHANGED');
    } catch (error) {
      console.error(`[AssetRegistry] Failed to delete asset ${id}:`, error);
      throw error;
    }
  }

  /**
   * 查询资产（高级过滤）
   * 支持按 type、category 和 tags 进行交集过滤
   * 
   * @param filter 查询过滤器
   * @returns 匹配的资产元数据列表
   */
  async queryAssets(filter: AssetFilter = {}): Promise<AssetMetadata[]> {
    this.ensureInitialized();

    let results: AssetMetadata[] = [];

    try {
      // 1. 基础查询：优先使用索引
      if (filter.type) {
        // 按类型查询（使用 IndexedDB 索引）
        results = await this.storage.getMetadataByType(filter.type);
      }
      else if (filter.category) {
        // 按分类查询（使用 IndexedDB 索引）
        results = await this.storage.getMetadataByCategory(filter.category);
      }
      else {
        // 获取所有资产（从内存缓存）
        results = Array.from(this.metadataCache.values());
      }

      // 2. 应用额外的交集过滤条件

      // 如果指定了 type，且之前未按 type 查询，则过滤
      if (filter.type && !filter.type) {
        results = results.filter(metadata => metadata.type === filter.type);
      }

      // 如果指定了 category，且之前未按 category 查询，则过滤
      if (filter.category && results.length > 0 && results[0].category !== filter.category) {
        results = results.filter(metadata => metadata.category === filter.category);
      }

      // 如果指定了 tags，过滤包含所有指定标签的资产（交集）
      if (filter.tags && filter.tags.length > 0) {
        results = results.filter(metadata =>
          filter.tags!.every(tag => metadata.tags.includes(tag))
        );
      }

      // 如果指定了 namePattern，进行模糊匹配
      if (filter.namePattern) {
        const pattern = filter.namePattern.toLowerCase();
        results = results.filter(metadata =>
          metadata.name.toLowerCase().includes(pattern)
        );
      }

      console.log(`[AssetRegistry] Query returned ${results.length} assets`, filter);
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
    // 清理 envMap 纹理
    for (const envMap of this.envMapCache.values()) {
      envMap.dispose();
    }
    this.envMapCache.clear();
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
   * 获取注册表中的总资产数 (含持久化但未加载到内存的)
   */
  getTotalAssetCount(): number {
    return this.metadataCache.size;
  }

  /**
   * 清空所有数据（用于测试）
   */
  async clearAll(): Promise<void> {
    this.ensureInitialized();

    await this.storage.clear();
    this.cache.clear();
    this.metadataCache.clear();
    // 清理 envMap 纹理
    for (const envMap of this.envMapCache.values()) {
      envMap.dispose();
    }
    this.envMapCache.clear();

    console.log('[AssetRegistry] All data cleared');
  }

  /**
   * 关闭注册表
   */
  close(): void {
    this.storage.close();
    this.modelImporter.dispose();
    this.audioImporter.dispose();
    this.hdrImporter.dispose();
    this.textureImporter.dispose();
    this.cache.clear();
    this.metadataCache.clear();
    // 清理 envMap 纹理
    for (const envMap of this.envMapCache.values()) {
      envMap.dispose();
    }
    this.envMapCache.clear();
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
