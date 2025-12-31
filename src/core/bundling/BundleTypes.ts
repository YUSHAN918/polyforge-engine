/**
 * PolyForge Bundle System - Types
 * 定义 Bundle 包的数据结构
 */

import { AssetMetadata } from '../assets/types';

/**
 * Bundle 清单文件 (manifest.json)
 * 描述包的元数据和内容结构
 */
export interface BundleManifest {
    version: string;       // 包版本 (e.g., "1.0.0")
    timestamp: number;     // 打包时间戳
    author: string;        // 作者
    description: string;   // 描述

    // 场景数据 (序列化后的 ECS 世界)
    sceneData: any;

    // 资产映射表 (AssetID -> 相对路径/Hash)
    // 用于在解包时重构 Blob
    assets: {
        [assetId: string]: {
            path: string;      // 在包内的相对路径 (e.g., "assets/models/my_model.glb")
            metadata: AssetMetadata; // 原始元数据 (用于恢复 Registry)
            offset?: number;    // 🔥 [Phase 13 二进制支持] 在二进制流中的偏移量
            size?: number;      // 🔥 [Phase 13 二进制支持] 在二进制流中的字节长度
        }
    };
}

/**
 * 运行时 Bundle 对象
 * 包含解析后的清单和二进制数据
 */
export interface PolyForgeBundle {
    manifest: BundleManifest;

    // 二进制数据缓存 (AssetID -> Blob)
    // 在加载阶段，这些 Blob 会被写入 IndexedDB
    blobs: Map<string, Blob>;
}

/**
 * 打包选项
 */
export interface BundleOptions {
    name: string;
    author?: string;
    description?: string;
    includeUnusedAssets?: boolean; // 是否包含场景未引用的资产 (默认 false)
}
