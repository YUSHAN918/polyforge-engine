/**
 * PolyForge Bundle System
 * 负责打包装箱逻辑：Dependency Gathering -> Manifest Generation -> Blob Packaging
 */

import { EntityManager } from '../EntityManager';
import { AssetRegistry } from '../assets/AssetRegistry';
import { SerializationService } from '../SerializationService';
import { VisualComponent } from '../components/VisualComponent';
import { AudioSourceComponent } from '../components/AudioSourceComponent';
import { BundleManifest, PolyForgeBundle, BundleOptions } from './BundleTypes';
import { AssetType } from '../assets/types';


export class BundleSystem {
    private entityManager: EntityManager;
    private assetRegistry: AssetRegistry;
    private serializationService: SerializationService;

    constructor(
        entityManager: EntityManager,
        assetRegistry: AssetRegistry,
        serializationService: SerializationService
    ) {
        this.entityManager = entityManager;
        this.assetRegistry = assetRegistry;
        this.serializationService = serializationService;
    }

    /**
     * 收集场景依赖 (智能按需策略)
     * 
     * 策略：
     * 1. 扫描当前所有 Entity 的组件 (Visual, AudioSource) 提取 AssetID
     * 2. 扫描 WorldState 获取 HDR 环境贴图 ID
     */
    public async collectDependencies(options?: BundleOptions): Promise<Set<string>> {
        const dependencies = new Set<string>();

        if (options?.includeUnusedAssets) {
            console.log(`📦 [BundleSystem] Mode: Full Library (Heavy)`);
            const allAssets = await this.assetRegistry.getAllMetadata();
            for (const metadata of allAssets) {
                dependencies.add(metadata.id);
            }
        } else {
            console.log(`📦 [BundleSystem] Mode: Smart Gathering (Used only)`);

            // 1. 从实体组件收集
            const entities = this.entityManager.serializeAll();
            for (const entity of entities) {
                for (const comp of entity.components) {
                    // 检查通用 assetId 字段 (VisualComponent, AudioSourceComponent)
                    if ((comp as any).assetId) {
                        dependencies.add((comp as any).assetId);
                    }
                }
            }

            // 2. 从 WorldState 收集 (HDR)
            // 注意：这里由于层级隔离，如果无法直接访问 WorldStateManager，
            // 我们可以从序列化服务的预留 assetReferences 中获取，或者手动检查
            // 现在的 SerializationService.serialize 已经包含 collectAssetReferences
            const worldData = this.serializationService.serialize();
            if (worldData.assetReferences) {
                worldData.assetReferences.forEach(id => dependencies.add(id));
            }

            // 特殊检查：WorldState HDR (如果 serializationService 没盖全)
            const hdrId = (worldData as any).worldState?.hdrAssetId;
            if (hdrId) dependencies.add(hdrId);
        }

        console.log(`📦 [BundleSystem] Found ${dependencies.size} unique assets used.`);
        return dependencies;
    }

    /**
     * 创建 Bundle 包
     */
    public async createBundle(options: BundleOptions): Promise<PolyForgeBundle> {
        console.log(`📦 [BundleSystem] Creating bundle "${options.name}"...`);

        // 1. 收集依赖
        const assetIds = await this.collectDependencies(options);

        // 2. 准备 Asset 数据
        const assetMap: BundleManifest['assets'] = {};
        const blobs = new Map<string, Blob>();

        for (const id of assetIds) {
            const metadata = await this.assetRegistry.getMetadata(id);
            const blob = await this.assetRegistry.getAsset(id);

            if (!metadata || !blob) {
                console.warn(`⚠️ [BundleSystem] Asset referenced but missing in registry: ${id}`);
                continue;
            }

            const ext = this.getExtensionForType(metadata.type);
            const path = `assets/${metadata.category || 'misc'}/${metadata.name}.${ext}`;

            assetMap[id] = {
                path,
                metadata,
                size: blob.size
            };

            blobs.set(id, blob);
        }

        // 3. 序列化场景数据 (Scene Graph + WorldState)
        const sceneData = this.serializationService.serialize();

        // 4. 生成 Manifest
        const manifest: BundleManifest = {
            version: '1.3.5',
            timestamp: Date.now(),
            author: options.author || 'PolyForge Creator',
            description: options.description || 'Standalone Scene Bundle',
            sceneData,
            assets: assetMap
        };

        return { manifest, blobs };
    }

    /**
     * 将 Bundle 打包为二进制 (.pfb) 格式 [🔥 Phase 13 核心修复]
     * 格式：[PFB! (4b)] [JSONLen (4b)] [JSONData] [BinaryBlobs]
     */
    public async packToBinary(bundle: PolyForgeBundle): Promise<ArrayBuffer> {
        console.log(`📦 [BundleSystem] Packaging to Binary PFB format...`);

        // 1. 准备 Manifest JSON 以及计算二进制偏移
        const manifest = { ...bundle.manifest };
        let currentOffset = 0;

        const blobList: Blob[] = [];
        for (const [id, blob] of bundle.blobs) {
            if (manifest.assets[id]) {
                manifest.assets[id].offset = currentOffset;
                manifest.assets[id].size = blob.size;
                currentOffset += blob.size;
                blobList.push(blob);
            }
        }

        const jsonStr = JSON.stringify(manifest);
        const jsonBuffer = new TextEncoder().encode(jsonStr);

        // 2. 计算总长度
        // Magic(4) + Version(4) + JSONLen(4) + JSONData + Blobs
        const totalHeaderSize = 12;
        const totalSize = totalHeaderSize + jsonBuffer.byteLength + currentOffset;

        const mainBuffer = new Uint8Array(totalSize);
        const view = new DataView(mainBuffer.buffer);

        // Header: PFB!
        mainBuffer.set([80, 70, 66, 33], 0);
        // Version: 135 (v1.3.5)
        view.setUint32(4, 135, true);
        // JSON Length
        view.setUint32(8, jsonBuffer.byteLength, true);
        // JSON Data
        mainBuffer.set(jsonBuffer, 12);

        // 3. 填充二进制资产 (使用 Blob 和 Response 优化内存)
        // 注意：在大文件场景下，直接拼接 ArrayBuffer 容易 OOM
        // 我们返回一个整合后的 Blob 会更安全。但为了符合接口，先拼接。
        let writeOffset = 12 + jsonBuffer.byteLength;
        for (const blob of blobList) {
            const arr = new Uint8Array(await blob.arrayBuffer());
            mainBuffer.set(arr, writeOffset);
            writeOffset += arr.length;
        }

        return mainBuffer.buffer;
    }

    /**
     * 从二进制加载 Bundle
     */
    public async loadFromBinary(buffer: ArrayBuffer): Promise<BundleManifest> {
        const view = new DataView(buffer);
        const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));

        if (magic !== 'PFB!') throw new Error('Invalid PFB file format');

        const jsonLen = view.getUint32(8, true);
        const jsonData = new Uint8Array(buffer, 12, jsonLen);
        const manifest = JSON.parse(new TextDecoder().decode(jsonData)) as BundleManifest;

        console.log(`📦 [BundleSystem] Loading PFB v${manifest.version} | Assets: ${Object.keys(manifest.assets).length}`);

        const binaryStart = 12 + jsonLen;
        let skipCount = 0;
        let restoreCount = 0;

        for (const [id, info] of Object.entries(manifest.assets)) {
            // 检查本地是否已存在
            const existing = await this.assetRegistry.getMetadata(id);
            if (existing) {
                skipCount++;
                continue;
            }

            // 提取二进制片段并恢复
            if (info.offset !== undefined && info.size !== undefined) {
                const blobPart = new Blob([buffer.slice(binaryStart + info.offset, binaryStart + info.offset + info.size)], {
                    type: this.getMimeType(info.metadata.type)
                });
                await this.assetRegistry.forceRegisterAsset(info.metadata, blobPart);
                restoreCount++;
            }
        }

        console.log(`✅ [BundleSystem] Restore complete. (Restored: ${restoreCount}, Skipped: ${skipCount})`);
        return manifest;
    }

    /**
     * 保持向下兼容的 JSON 加载 (带日志降噪)
     */
    public async loadBundle(jsonString: string): Promise<BundleManifest> {
        console.log(`📦 [BundleSystem] Loading bundle (JSON Fallback)...`);
        const data = JSON.parse(jsonString);
        const manifest = data.manifest as BundleManifest;
        const assetsBase64 = data.assets as { [id: string]: string };

        let skipCount = 0;
        let restoreCount = 0;

        for (const [id, base64] of Object.entries(assetsBase64)) {
            const assetInfo = manifest.assets[id];
            if (!assetInfo) continue;

            const existing = await this.assetRegistry.getMetadata(id);
            if (existing) {
                skipCount++;
                continue;
            }

            const blob = await this.base64ToBlob(base64, this.getMimeType(assetInfo.metadata.type));
            await this.assetRegistry.forceRegisterAsset(assetInfo.metadata, blob);
            restoreCount++;
        }

        if (skipCount > 0) console.log(`ℹ️ [BundleSystem] Skipped ${skipCount} existing assets.`);
        console.log(`✅ [BundleSystem] Restored ${restoreCount} new assets.`);

        return manifest;
    }

    private getExtensionForType(type: AssetType): string {
        switch (type) {
            case AssetType.MODEL: return 'glb';
            case AssetType.TEXTURE: return 'png';
            case AssetType.AUDIO: return 'mp3';
            case AssetType.HDR: return 'hdr';
            default: return 'dat';
        }
    }

    private getMimeType(type: AssetType): string {
        switch (type) {
            case AssetType.MODEL: return 'model/gltf-binary';
            case AssetType.TEXTURE: return 'image/png';
            case AssetType.AUDIO: return 'audio/mpeg';
            case AssetType.HDR: return 'application/octet-stream';
            default: return 'application/octet-stream';
        }
    }

    private blobToBase64(blob: Blob, mimeType: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    private base64ToBlob(base64: string, mimeType: string): Promise<Blob> {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        return Promise.resolve(new Blob([new Uint8Array(byteNumbers)], { type: mimeType }));
    }
}

