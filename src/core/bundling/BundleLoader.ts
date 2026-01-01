import { AssetRegistry } from '../assets/AssetRegistry';
import { ProgressCallback } from './types';

export class BundleLoader {
    constructor(private assetRegistry: AssetRegistry) { }

    /**
     * 从二进制 ArrayBuffer 加载 Bundle
     */
    async loadFromBinary(buffer: ArrayBuffer, onProgress?: ProgressCallback): Promise<any> {
        const view = new DataView(buffer);

        if (onProgress) onProgress({ step: '正在校验物理包合法性...', assetName: 'Header', progress: 0.1 });

        // 1. 校验 Magic Number
        const magic = view.getUint32(0, true);
        if (magic !== 0x21424650) {
            throw new Error('无效的 PFB 二进制格式: Magic Number 不匹配');
        }

        // 2. 提取 Manifest
        const manifestSize = view.getUint32(4, true);
        const manifestBuffer = buffer.slice(8, 8 + manifestSize);
        const manifestJson = new TextDecoder().decode(manifestBuffer);
        const manifest = JSON.parse(manifestJson);

        if (onProgress) onProgress({ step: '正在解析清单...', assetName: manifest.name, progress: 0.3 });

        // 3. 提取并还原资产
        let offset = 8 + manifestSize;
        const assets = manifest.assets || [];

        for (let i = 0; i < assets.length; i++) {
            const assetInfo = assets[i];
            const assetData = buffer.slice(offset, offset + assetInfo.size);
            const blob = new Blob([assetData], { type: 'application/octet-stream' });

            if (onProgress) {
                onProgress({
                    step: '正在向内核同步资产...',
                    assetName: assetInfo.name,
                    progress: 0.3 + ((i + 1) / assets.length) * 0.7
                });
            }

            // 强力对齐：使用包含 ID 的原始元数据注册
            await this.assetRegistry.forceRegisterAsset(assetInfo.metadata, blob);
            offset += assetInfo.size;
        }

        return manifest;
    }

    /**
     * 兼容旧版 JSON 加载 (降级逻辑)
     */
    async loadLegacy(jsonText: string): Promise<any> {
        console.warn('⚠️ [BundleLoader] 正在使用旧版 JSON 降级加载逻辑');
        return JSON.parse(jsonText);
    }
}
