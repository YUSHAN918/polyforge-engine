/**
 * PolyForge Asset System - IndexedDB Storage Layer
 * 
 * 封装原生 IndexedDB，提供资产持久化存储
 * 
 * 数据库结构：
 * - Database: PolyForgeAssets
 *   - ObjectStore: metadata (用于快速查询)
 *     - keyPath: id
 *     - indexes: type, category, tags
 *   - ObjectStore: files (用于存储大体积 Blob)
 *     - keyPath: id
 */

import type { AssetMetadata, ContentFingerprint } from './types';

const DB_NAME = 'PolyForgeAssets';
const DB_VERSION = 2; // 升级版本以添加指纹表
const METADATA_STORE = 'metadata';
const FILES_STORE = 'files';
const FINGERPRINTS_STORE = 'fingerprints'; // 新增：内容指纹表

/**
 * IndexedDB 存储层
 * 使用原生 Promise 封装，零外部依赖
 */
export class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化数据库
   * 创建 ObjectStore 和索引
   */
  async initialize(): Promise<void> {
    // 如果已经初始化，直接返回
    if (this.db) {
      return;
    }

    // 如果正在初始化，等待完成
    if (this.initPromise) {
      return this.initPromise;
    }

    // 开始初始化
    this.initPromise = new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDBStorage] Database initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        // 创建 metadata ObjectStore
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metadataStore = db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
          
          // 创建索引用于快速查询
          metadataStore.createIndex('type', 'type', { unique: false });
          metadataStore.createIndex('category', 'category', { unique: false });
          metadataStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          metadataStore.createIndex('createdAt', 'createdAt', { unique: false });
          
          console.log('[IndexedDBStorage] Created metadata store with indexes');
        }

        // 创建 files ObjectStore
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          db.createObjectStore(FILES_STORE, { keyPath: 'id' });
          console.log('[IndexedDBStorage] Created files store');
        }

        // 创建 fingerprints ObjectStore（v2 新增）
        if (oldVersion < 2 && !db.objectStoreNames.contains(FINGERPRINTS_STORE)) {
          const fingerprintsStore = db.createObjectStore(FINGERPRINTS_STORE, { keyPath: 'hash' });
          fingerprintsStore.createIndex('assetId', 'assetId', { unique: false });
          console.log('[IndexedDBStorage] Created fingerprints store for deduplication');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * 确保数据库已初始化
   */
  private async ensureInitialized(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * 保存资产元数据
   */
  async saveMetadata(metadata: AssetMetadata): Promise<void> {
    const db = await this.ensureInitialized();

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.put(metadata);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save metadata: ${request.error?.message}`));
    });
  }

  /**
   * 获取资产元数据
   */
  async getMetadata(id: string): Promise<AssetMetadata | null> {
    const db = await this.ensureInitialized();

    return new Promise<AssetMetadata | null>((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Failed to get metadata: ${request.error?.message}`));
    });
  }

  /**
   * 保存资产文件数据
   */
  async saveFile(id: string, data: Blob): Promise<void> {
    const db = await this.ensureInitialized();

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([FILES_STORE], 'readwrite');
      const store = transaction.objectStore(FILES_STORE);
      const request = store.put({ id, data });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save file: ${request.error?.message}`));
    });
  }

  /**
   * 获取资产文件数据
   */
  async getFile(id: string): Promise<Blob | null> {
    const db = await this.ensureInitialized();

    return new Promise<Blob | null>((resolve, reject) => {
      const transaction = db.transaction([FILES_STORE], 'readonly');
      const store = transaction.objectStore(FILES_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(new Error(`Failed to get file: ${request.error?.message}`));
    });
  }

  /**
   * 删除资产（元数据和文件）
   */
  async deleteAsset(id: string): Promise<void> {
    const db = await this.ensureInitialized();

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE, FILES_STORE], 'readwrite');
      
      const metadataStore = transaction.objectStore(METADATA_STORE);
      const filesStore = transaction.objectStore(FILES_STORE);
      
      metadataStore.delete(id);
      filesStore.delete(id);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error(`Failed to delete asset: ${transaction.error?.message}`));
    });
  }

  /**
   * 查询所有资产元数据
   */
  async getAllMetadata(): Promise<AssetMetadata[]> {
    const db = await this.ensureInitialized();

    return new Promise<AssetMetadata[]>((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(`Failed to get all metadata: ${request.error?.message}`));
    });
  }

  /**
   * 按类型查询资产元数据
   */
  async getMetadataByType(type: string): Promise<AssetMetadata[]> {
    const db = await this.ensureInitialized();

    return new Promise<AssetMetadata[]>((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const index = store.index('type');
      const request = index.getAll(type);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(`Failed to get metadata by type: ${request.error?.message}`));
    });
  }

  /**
   * 按分类查询资产元数据
   */
  async getMetadataByCategory(category: string): Promise<AssetMetadata[]> {
    const db = await this.ensureInitialized();

    return new Promise<AssetMetadata[]>((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const index = store.index('category');
      const request = index.getAll(category);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(`Failed to get metadata by category: ${request.error?.message}`));
    });
  }

  /**
   * 清空所有数据（用于测试）
   */
  async clear(): Promise<void> {
    const db = await this.ensureInitialized();

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE, FILES_STORE, FINGERPRINTS_STORE], 'readwrite');
      
      transaction.objectStore(METADATA_STORE).clear();
      transaction.objectStore(FILES_STORE).clear();
      transaction.objectStore(FINGERPRINTS_STORE).clear();

      transaction.oncomplete = () => {
        console.log('[IndexedDBStorage] All data cleared');
        resolve();
      };
      transaction.onerror = () => reject(new Error(`Failed to clear data: ${transaction.error?.message}`));
    });
  }

  /**
   * 保存内容指纹
   */
  async saveFingerprint(fingerprint: ContentFingerprint): Promise<void> {
    const db = await this.ensureInitialized();

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([FINGERPRINTS_STORE], 'readwrite');
      const store = transaction.objectStore(FINGERPRINTS_STORE);
      const request = store.put(fingerprint);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save fingerprint: ${request.error?.message}`));
    });
  }

  /**
   * 根据哈希值查找指纹
   */
  async getFingerprintByHash(hash: string): Promise<ContentFingerprint | null> {
    const db = await this.ensureInitialized();

    return new Promise<ContentFingerprint | null>((resolve, reject) => {
      const transaction = db.transaction([FINGERPRINTS_STORE], 'readonly');
      const store = transaction.objectStore(FINGERPRINTS_STORE);
      const request = store.get(hash);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Failed to get fingerprint: ${request.error?.message}`));
    });
  }

  /**
   * 删除指纹
   */
  async deleteFingerprint(hash: string): Promise<void> {
    const db = await this.ensureInitialized();

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([FINGERPRINTS_STORE], 'readwrite');
      const store = transaction.objectStore(FINGERPRINTS_STORE);
      const request = store.delete(hash);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete fingerprint: ${request.error?.message}`));
    });
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
      console.log('[IndexedDBStorage] Database connection closed');
    }
  }
}
