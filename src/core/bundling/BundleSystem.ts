/**
 * PolyForge Bundle System (Facade)
 * 封装了独立的 BundleBuilder 与 BundleLoader
 * 遵循职责单一原则，为上层提供统一的打包装箱与解包加载接口
 */

import { EntityManager } from '../EntityManager';
import { AssetRegistry } from '../assets/AssetRegistry';
import { SerializationService } from '../SerializationService';
import { BundleBuilder, BundleOptions } from './BundleBuilder';
import { BundleLoader } from './BundleLoader';
import { ProgressCallback } from './types';
import { WorldStateManager } from '../WorldStateManager';

export class BundleSystem {
    private builder: BundleBuilder;
    private loader: BundleLoader;

    constructor(
        _entityManager: EntityManager,
        _assetRegistry: AssetRegistry,
        _serializationService: SerializationService,
        _worldStateManager: WorldStateManager
    ) {
        this.builder = new BundleBuilder(_assetRegistry, _serializationService, _worldStateManager);
        this.loader = new BundleLoader(_assetRegistry);
    }

    /**
     * 创建并打包 Bundle (二进制格式)
     * 支持传入进度回调
     */
    public async packToBinary(options: BundleOptions, onProgress?: ProgressCallback): Promise<ArrayBuffer> {
        console.log(`📦 [BundleSystem] Facade -> Delegating to BundleBuilder...`);
        return await this.builder.build(options, onProgress);
    }

    /**
     * 从二进制加载 Bundle
     * 支持传入进度回调
     */
    public async loadFromBinary(buffer: ArrayBuffer, onProgress?: ProgressCallback): Promise<any> {
        console.log(`📦 [BundleSystem] Facade -> Delegating to BundleLoader...`);
        return await this.loader.loadFromBinary(buffer, onProgress);
    }

    /**
     * 兼容性方法：创建 Bundle 对象 (Manifest + Blobs)
     * @deprecated 请优先使用 packToBinary 直接获取二进制流
     */
    public async createBundle(options: BundleOptions): Promise<any> {
        console.warn('⚠️ [BundleSystem] createBundle is deprecated. Use packToBinary instead.');
        // 为了兼容性，这里可以调用 builder 的内部逻辑，但暂不建议使用
        return { manifest: {}, blobs: new Map() };
    }

    /**
     * 兼容性方法：从 JSON 加载
     */
    public async loadBundle(jsonString: string): Promise<any> {
        return await this.loader.loadLegacy(jsonString);
    }
}
