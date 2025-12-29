/**
 * PolyForge v1.3.0 - ArchitectureStorageManager
 * 持久化存储管理器 - 实现“心跳存档”机制
 * 
 * 功能：
 * - 将 EntityManager 和 WorldStateManager 的状态序列化并存入 LocalStorage
 * - 支持自动存档与手动加载
 * - 确保页面刷新后场景不丢失
 */

import { EntityManager } from './EntityManager';
import { WorldStateManager } from './WorldStateManager';

export interface SceneSnapshot {
    timestamp: number;
    worldState: any;
    entities: any[];
}

export class ArchitectureStorageManager {
    private STORAGE_KEY = 'POLYFORGE_VALIDATION_SCENE';
    private entityManager: EntityManager;
    private worldStateManager: WorldStateManager;

    constructor(entityManager: EntityManager, worldStateManager: WorldStateManager) {
        this.entityManager = entityManager;
        this.worldStateManager = worldStateManager;
    }

    /**
     * 保存当前场景快照到 LocalStorage
     */
    save(): boolean {
        try {
            const serializedEntities = this.entityManager.serializeAll();
            const worldState = this.worldStateManager.getState();

            const snapshot: SceneSnapshot = {
                timestamp: Date.now(),
                worldState,
                entities: serializedEntities,
            };

            const json = JSON.stringify(snapshot);
            localStorage.setItem(this.STORAGE_KEY, json);
            console.log(`💾 [Storage] Architecture state saved: ${json.length} bytes, ${snapshot.entities.length} entities, HDR: ${worldState.hdrAssetId || 'auto'}`);
            return true;
        } catch (error: any) {
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.error('❌ [Storage] LocalStorage Quota Exceeded! The scene is too large.');
            } else {
                console.error('❌ [Storage] Failed to save architecture state:', error);
            }
            return false;
        }
    }

    /**
     * 从 LocalStorage 加载场景快照
     */
    load(): SceneSnapshot | null {
        try {
            const json = localStorage.getItem(this.STORAGE_KEY);
            if (!json) return null;

            const snapshot = JSON.parse(json) as SceneSnapshot;
            console.log(`📂 Architecture state loaded from ${new Date(snapshot.timestamp).toLocaleString()}`);
            return snapshot;
        } catch (error) {
            console.error('❌ Failed to load architecture state:', error);
            return null;
        }
    }

    /**
     * 清除存档数据
     */
    clear(): void {
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('🧹 Architecture storage cleared');
    }

    /**
     * 检查是否存在现有存档
     */
    hasSave(): boolean {
        return localStorage.getItem(this.STORAGE_KEY) !== null;
    }
}
