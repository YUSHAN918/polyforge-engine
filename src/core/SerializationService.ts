/**
 * PolyForge v1.3.0 SerializationService Implementation
 * SerializationService 序列化服务实现
 */

import { EntityManager } from './EntityManager';
import { SerializedEntity } from './types';

/**
 * 序列化的世界数据
 */
export interface SerializedWorld {
  /** 版本号 */
  version: string;

  /** 时间戳 */
  timestamp: number;

  /** 所有实体数据 */
  entities: SerializedEntity[];

  /** 使用的资产 ID 列表（预留） */
  assetReferences: string[];

  /** 全局环境状态（Phase 11 新增） */
  worldState?: any;

  /** 元数据 */
  metadata?: {
    name?: string;
    description?: string;
    author?: string;
    [key: string]: any;
  };
}

/**
 * SerializationService 序列化服务
 * 负责将整个游戏世界序列化为 JSON 并反序列化
 */
export class SerializationService {
  private entityManager: EntityManager;
  private version: string = '1.3.0';

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  // ============================================================================
  // 序列化
  // ============================================================================

  /**
   * 序列化整个世界
   */
  serialize(metadata?: Record<string, any>): SerializedWorld {
    const entities = this.entityManager.serializeAll();
    const assetReferences = this.collectAssetReferences(entities);

    const world: SerializedWorld = {
      version: this.version,
      timestamp: Date.now(),
      entities,
      assetReferences,
    };

    if (metadata) {
      world.metadata = metadata;
    }

    return world;
  }

  /**
   * 序列化为 JSON 字符串
   */
  serializeToJSON(metadata?: Record<string, any>, pretty: boolean = false): string {
    const world = this.serialize(metadata);
    return JSON.stringify(world, null, pretty ? 2 : 0);
  }

  /**
   * 收集所有资产引用（预留功能）
   */
  private collectAssetReferences(entities: SerializedEntity[]): string[] {
    const references = new Set<string>();

    for (const entity of entities) {
      for (const component of entity.components) {
        // 检查组件中的资产引用
        // 例如：VisualComponent 可能引用模型资产
        // AudioSourceComponent 可能引用音频资产
        if (component.assetId) {
          references.add(component.assetId);
        }
      }
    }

    return Array.from(references);
  }

  // ============================================================================
  // 反序列化
  // ============================================================================

  /**
   * 从序列化数据反序列化世界
   * @param data 序列化的世界数据
   * @param clearExisting 是否清空现有实体（默认 true）
   */
  deserialize(data: SerializedWorld, clearExisting: boolean = true): void {
    // 验证版本
    if (!this.isVersionCompatible(data.version)) {
      console.warn(`Version mismatch: current=${this.version}, data=${data.version}`);
      console.warn('Attempting to load anyway, but there may be compatibility issues');
    }

    // 清空现有实体
    if (clearExisting) {
      this.entityManager.clear();
    }

    // 反序列化所有实体
    this.entityManager.deserializeAll(data.entities);

    console.log(`✓ World deserialized: ${data.entities.length} entities loaded`);
    if (data.metadata?.name) {
      console.log(`  World name: ${data.metadata.name}`);
    }
    console.log(`  Timestamp: ${new Date(data.timestamp).toLocaleString()}`);
    console.log(`  Asset references: ${data.assetReferences.length}`);
  }

  /**
   * 从 JSON 字符串反序列化
   */
  deserializeFromJSON(json: string, clearExisting: boolean = true): void {
    try {
      const data = JSON.parse(json) as SerializedWorld;
      this.deserialize(data, clearExisting);
    } catch (error) {
      console.error('Failed to deserialize from JSON:', error);
      throw new Error('Invalid JSON data');
    }
  }

  /**
   * 从序列化列表恢复实体（不清空现有实体）
   */
  deserializeEntities(entities: SerializedEntity[]): any[] {
    this.entityManager.deserializeAll(entities);
    return entities; // 返回数据以符合 CommandManager 预期
  }

  /**
   * 检查版本兼容性
   */
  private isVersionCompatible(dataVersion: string): boolean {
    // 简单的版本检查：主版本号必须匹配
    const currentMajor = this.version.split('.')[0];
    const dataMajor = dataVersion.split('.')[0];
    return currentMajor === dataMajor;
  }

  // ============================================================================
  // 导出/导入（预留功能）
  // ============================================================================

  /**
   * 导出为 Standalone Bundle（预留）
   * 将来会包含所有资产和运行时
   */
  async exportBundle(
    metadata?: Record<string, any>,
    includeAssets: boolean = true
  ): Promise<Blob> {
    const world = this.serialize(metadata);

    // 创建 Bundle 数据结构
    const bundle = {
      world,
      assets: includeAssets ? await this.packAssets(world.assetReferences) : {},
      runtime: {
        version: this.version,
        timestamp: Date.now(),
      },
    };

    // 转换为 Blob
    const json = JSON.stringify(bundle, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  /**
   * 从 Standalone Bundle 导入（预留）
   */
  async importBundle(blob: Blob): Promise<void> {
    const text = await blob.text();
    const bundle = JSON.parse(text);

    // 导入资产（如果有）
    if (bundle.assets) {
      await this.unpackAssets(bundle.assets);
    }

    // 导入世界数据
    this.deserialize(bundle.world);
  }

  /**
   * 打包资产（预留）
   */
  private async packAssets(assetIds: string[]): Promise<Record<string, any>> {
    // 将来会从 AssetRegistry 获取资产数据
    console.log(`Packing ${assetIds.length} assets (not implemented yet)`);
    return {};
  }

  /**
   * 解包资产（预留）
   */
  private async unpackAssets(assets: Record<string, any>): Promise<void> {
    // 将来会将资产数据导入 AssetRegistry
    console.log(`Unpacking assets (not implemented yet)`);
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  /**
   * 获取序列化数据的统计信息
   */
  getStats(data: SerializedWorld): {
    version: string;
    entityCount: number;
    totalComponents: number;
    assetCount: number;
    jsonSize: number;
    timestamp: Date;
  } {
    const json = JSON.stringify(data);
    let totalComponents = 0;

    for (const entity of data.entities) {
      totalComponents += entity.components.length;
    }

    return {
      version: data.version,
      entityCount: data.entities.length,
      totalComponents,
      assetCount: data.assetReferences.length,
      jsonSize: json.length,
      timestamp: new Date(data.timestamp),
    };
  }

  /**
   * 验证序列化数据的完整性
   */
  validate(data: SerializedWorld): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查必需字段
    if (!data.version) errors.push('Missing version');
    if (!data.timestamp) errors.push('Missing timestamp');
    if (!data.entities) errors.push('Missing entities');
    if (!data.assetReferences) errors.push('Missing assetReferences');

    // 检查实体数据
    if (data.entities) {
      const entityIds = new Set<string>();
      for (let i = 0; i < data.entities.length; i++) {
        const entity = data.entities[i];

        if (!entity.id) {
          errors.push(`Entity at index ${i} missing id`);
        } else if (entityIds.has(entity.id)) {
          errors.push(`Duplicate entity id: ${entity.id}`);
        } else {
          entityIds.add(entity.id);
        }

        if (!entity.name) {
          warnings.push(`Entity ${entity.id} missing name`);
        }

        if (!entity.components || entity.components.length === 0) {
          warnings.push(`Entity ${entity.id} has no components`);
        }
      }

      // 检查父子关系
      for (const entity of data.entities) {
        if (entity.parentId && !entityIds.has(entity.parentId)) {
          errors.push(`Entity ${entity.id} references non-existent parent ${entity.parentId}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 比较两个序列化数据
   */
  compare(data1: SerializedWorld, data2: SerializedWorld): {
    identical: boolean;
    differences: string[];
  } {
    const differences: string[] = [];

    if (data1.version !== data2.version) {
      differences.push(`Version: ${data1.version} vs ${data2.version}`);
    }

    if (data1.entities.length !== data2.entities.length) {
      differences.push(`Entity count: ${data1.entities.length} vs ${data2.entities.length}`);
    }

    // 简单的 JSON 比较
    const json1 = JSON.stringify(data1.entities.sort((a, b) => a.id.localeCompare(b.id)));
    const json2 = JSON.stringify(data2.entities.sort((a, b) => a.id.localeCompare(b.id)));

    if (json1 !== json2) {
      differences.push('Entity data differs');
    }

    return {
      identical: differences.length === 0,
      differences,
    };
  }

  /**
   * 创建世界快照（用于撤销/重做）
   */
  createSnapshot(label?: string): {
    label: string;
    timestamp: number;
    data: SerializedWorld;
  } {
    return {
      label: label || `Snapshot ${Date.now()}`,
      timestamp: Date.now(),
      data: this.serialize(),
    };
  }

  /**
   * 从快照恢复
   */
  restoreSnapshot(snapshot: { data: SerializedWorld }): void {
    this.deserialize(snapshot.data);
  }
}
