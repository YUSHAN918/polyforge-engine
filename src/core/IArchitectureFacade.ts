/**
 * PolyForge Architecture Facade Interface
 * 架构外观接口 - 定义 UI (宿主) 与 Engine (内核) 的交互契约
 * 
 * 核心原则:
 * 1. 单向数据流: UI -> dispatch(Command) -> Engine
 * 2. 状态只读: UI 只能读取各种 Manager 暴露的 Readonly 状态或 Stats，不能修改
 */

import { EngineCommand } from './EngineCommand';
import { CommandManager } from './CommandManager';
import { ArchitectureStorageManager } from './ArchitectureStorageManager';
import { AssetRegistry } from './assets/AssetRegistry';
import { WorldState } from './WorldStateManager';

import { InputSystem } from './systems/InputSystem';

import { CameraSystem } from './systems/CameraSystem';
import { TerrainSystem } from './systems/TerrainSystem';
import { VegetationSystem } from './systems/VegetationSystem';

export interface ValidationStats {
    entityCount: number;
    systemCount: number;
    vegetationCount: number;
    terrainVertices: number;
    physicsInitialized: boolean;
    physicsBodies: number;
}

export interface IArchitectureFacade {
    /**
     * 核心交互入口：分发指令
     */
    dispatch(command: EngineCommand): void;

    /**
     * 获取环境状态快照 (只读)
     */
    getEnvironmentState(): WorldState;

    /**
     * 获取统计信息
     */
    getStats(): ValidationStats;

    /**
     * 获取上下文状态 (Creative/Experience)
     */
    getContext(): string;

    // --- 必要的辅助 Getter (仅供 UI 读取数据，严禁调用修改方法) ---

    /**
     * 获取资产注册表 (UI 需要读取资产列表)
     * 实际上 AssetRegistry 内部修改也应该管控，但目前先允许读取元数据
     */
    getAssetRegistry(): AssetRegistry;

    /**
     * 获取指令管理器 (UI 需要读取 Undo/Redo 栈大小)
     */
    getCommandManager(): CommandManager;

    /**
     * 获取存储管理器 (UI 需要读取存档状态)
     */
    getStorageManager(): ArchitectureStorageManager;

    /**
   * 销毁/清理
   */
    dispose(): void;

    // --- 桥接层专用接口 (For EngineBridge Only) ---
    // 这些接口允许 React 视图层 (EngineBridge) 绑定事件和同步相机
    // UI 层严禁调用！

    getInputSystem(): InputSystem;
    getCameraSystem(): CameraSystem;
    getTerrainSystem(): TerrainSystem;
    getVegetationSystem(): VegetationSystem;
}
