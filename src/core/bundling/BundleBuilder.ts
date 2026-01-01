import { AssetRegistry } from '../assets/AssetRegistry';
import { SerializationService } from '../SerializationService';
import { WorldStateManager } from '../WorldStateManager';
import { ProgressCallback } from './types';

export interface BundleOptions {
    name: string;
    author?: string;
    description?: string;
    includeUnusedAssets?: boolean;
}

export class BundleBuilder {
    constructor(
        private assetRegistry: AssetRegistry,
        private serializationService: SerializationService,
        private worldStateManager: WorldStateManager
    ) { }

    /**
     * 创建并打包 Bundle
     */
    async build(options: BundleOptions, onProgress?: ProgressCallback): Promise<ArrayBuffer> {
        const { name, author = 'Unknown', description = '' } = options;

        if (onProgress) onProgress({ step: '正在分析场景依赖...', assetName: 'Scene', progress: 0.1 });

        // 1. 收集依赖资产
        const usedAssetIds = this.collectDependencies();
        const assetsToPack: { id: string; blob: Blob; metadata: any }[] = [];

        let current = 0;
        for (const id of usedAssetIds) {
            const metadata = await this.assetRegistry.getMetadata(id);
            const blob = await this.assetRegistry.getAsset(id);

            if (metadata && blob) {
                assetsToPack.push({ id, blob, metadata });
            }

            current++;
            if (onProgress) {
                onProgress({
                    step: '正在提取资产数据...',
                    assetName: metadata?.name || id,
                    progress: 0.1 + (current / usedAssetIds.length) * 0.4
                });
            }
        }

        // 2. 生成 Manifest
        const worldData = this.serializationService.serialize();
        const sceneData = {
            worldState: this.worldStateManager.getState(),
            entities: worldData.entities
        };

        const manifest = {
            version: '2.0',
            name,
            author,
            description,
            createdAt: Date.now(),
            sceneData,
            assets: assetsToPack.map(a => ({
                id: a.id,
                name: a.metadata.name,
                type: a.metadata.type,
                size: a.blob.size,
                metadata: a.metadata
            }))
        };

        if (onProgress) onProgress({ step: '正在执行二进制封装...', assetName: name, progress: 0.7 });

        // 3. 执行最终打包
        return this.packToBinary(manifest, assetsToPack, onProgress);
    }

    /**
     * 收集场景中实际使用的资产 ID
     */
    private collectDependencies(): string[] {
        const worldData = this.serializationService.serialize();
        const entities = worldData.entities;
        const usedIds = new Set<string>();

        // 从实体组件中提取
        entities.forEach((entity: any) => {
            entity.components.forEach((comp: any) => {
                // Defensive check: ensure comp.data exists
                if (!comp || !comp.data) return;

                // Visual 模型
                if (comp.type === 'Visual' && comp.data.modelId) {
                    usedIds.add(comp.data.modelId);
                }
                // Audio
                if (comp.type === 'AudioSource' && comp.data.assetId) {
                    usedIds.add(comp.data.assetId);
                }
            });
        });

        // 从全局状态提取 (如 HDR)
        const worldState = this.worldStateManager.getState();
        if (worldState.hdrAssetId) {
            usedIds.add(worldState.hdrAssetId);
        }

        return Array.from(usedIds);
    }

    /**
     * PFB v2 协议封装
     * Header (4B) | Manifest Size (4B) | Manifest (JSON) | Assets Data (Binary)
     */
    private async packToBinary(manifest: any, assets: { blob: Blob }[], onProgress?: ProgressCallback): Promise<ArrayBuffer> {
        const manifestJson = JSON.stringify(manifest);
        const manifestBuffer = new TextEncoder().encode(manifestJson);

        // 计算总资产大小
        const assetsSize = assets.reduce((sum, a) => sum + a.blob.size, 0);

        // 创建总 Buffer: Magic(4) + ManifestSize(4) + Manifest + Assets
        const totalSize = 8 + manifestBuffer.byteLength + assetsSize;
        const finalBuffer = new ArrayBuffer(totalSize);
        const view = new DataView(finalBuffer);
        const uint8View = new Uint8Array(finalBuffer);

        // 1. Magic Number: PFB! (0x21424650)
        view.setUint32(0, 0x21424650, true);

        // 2. Manifest Size
        view.setUint32(4, manifestBuffer.byteLength, true);

        // 3. Write Manifest
        uint8View.set(manifestBuffer, 8);

        // 4. Write Assets Data
        let offset = 8 + manifestBuffer.byteLength;
        for (let i = 0; i < assets.length; i++) {
            const assetBlob = assets[i].blob;
            const assetData = await assetBlob.arrayBuffer();
            uint8View.set(new Uint8Array(assetData), offset);
            offset += assetBlob.size;

            if (onProgress) {
                onProgress({
                    step: '正在压缩二进制流...',
                    assetName: `Asset Data Block ${i + 1}/${assets.length}`,
                    progress: 0.7 + ((i + 1) / assets.length) * 0.3
                });
            }
        }

        return finalBuffer;
    }
}
