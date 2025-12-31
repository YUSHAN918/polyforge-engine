import { EntityManager } from '../EntityManager';
import { CameraSystem } from './CameraSystem';
import { CameraComponent, CameraMode, CameraSnapshot } from '../components/CameraComponent';
import { ArchitectureValidationManager, ValidationContext } from '../ArchitectureValidationManager';
import { eventBus } from '../EventBus';
import { Entity } from '../Entity';

/**
 * 相机预设接口
 */
export interface CameraPreset {
    id: string;
    displayName: string;
    mode: CameraMode;
    snapshot: Partial<CameraSnapshot>;
    bindTarget: boolean;
    dualMode?: boolean;
    description?: string;
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
    success: boolean;
    reason?: string;
    errorCode?: 'PRESET_NOT_FOUND' | 'NO_TARGET_ENTITY' | 'STRATEGY_UNAVAILABLE' | 'INVALID_SNAPSHOT' | 'WRONG_MODE';
}

/**
 * 相机预设管理器
 * 负责预设的注册、应用、健康检查和自动回退
 */
export class CameraPresetManager {
    private presets: Map<string, CameraPreset> = new Map();
    private readonly DEFAULT_SAFE_PRESET = 'iso';

    constructor(
        private cameraSystem: CameraSystem,
        private entityManager: EntityManager,
        private manager: ArchitectureValidationManager
    ) {
        this.registerStandardPresets();
    }

    /**
     * 注册标准预设
     * 🔴 只注册体验模式预设：iso/fps/tps/sidescroll
     * 🔴 不注册 orbit - 它是创造模式的固定相机
     */
    private registerStandardPresets(): void {
        // 1. ISO - 上帝视角
        this.registerPreset({
            id: 'iso',
            displayName: '上帝视角',
            mode: 'isometric',
            bindTarget: false,
            dualMode: true,
            snapshot: {
                pitch: 45,
                yaw: 45,
                distance: 50,
                fov: 60
            },
            description: '类暗黑视角，支持观察与跟随双模态'
        });

        // 2. FPS - 第一人称
        this.registerPreset({
            id: 'fps',
            displayName: '第一人称',
            mode: 'firstPerson',
            bindTarget: true,
            snapshot: {
                pitch: 0,
                yaw: 0,
                distance: 0,
                fov: 90
            }
        });

        // 3. TPS - 第三人称
        this.registerPreset({
            id: 'tps',
            displayName: '第三人称',
            mode: 'thirdPerson',
            bindTarget: true,
            snapshot: {
                pitch: 20, // 正值保证相机在上方
                yaw: 0,
                distance: 6, // 稍微拉近一点更紧凑
                fov: 75,
                enableCollision: true
            }
        });

        // 4. Sidescroll - 横板卷轴
        this.registerPreset({
            id: 'sidescroll',
            displayName: '横板卷轴',
            mode: 'sidescroll',
            bindTarget: true,
            snapshot: {
                pitch: 0,
                yaw: 0,
                distance: 25, // 拉远距离，模拟全景
                fov: 30,      // 降低 FOV，减少透视畸变 (类 2D 效果)
                smoothSpeed: 20 // 🔥 High speed tracking for sidescroll action
            }
        });
    }

    /**
     * 注册自定义预设
     */
    public registerPreset(preset: CameraPreset): void {
        if (preset.id === 'orbit') {
            throw new Error('[CameraPresetManager] Cannot register orbit as a preset.');
        }
        this.presets.set(preset.id, preset);
    }

    /**
     * 应用预设
     * 🔴 严禁在创造模式下工作
     */
    public applyPreset(camera: CameraComponent, presetId: string): boolean {
        // 1. 模式保护
        if (this.manager.getContext() !== ValidationContext.EXPERIENCE) {
            console.warn('[CameraPresetManager] Rejection: Presets only available in EXPERIENCE mode.');
            eventBus.emit('camera:preset:error', { errorCode: 'WRONG_MODE', reason: '预设仅在体验模式可用' });
            return false;
        }

        // 2. 预设检查
        const preset = this.presets.get(presetId);
        if (!preset) {
            eventBus.emit('camera:preset:error', { errorCode: 'PRESET_NOT_FOUND', presetId });
            return false;
        }

        // 3. 健康检查
        const health = this.healthCheck(preset, camera);
        if (!health.success) {
            eventBus.emit('camera:preset:error', { errorCode: health.errorCode, reason: health.reason });
            return false;
        }

        // 4. 执行切换
        // 清理旧 Strategy
        const oldStrategy = this.cameraSystem.getStrategy(camera.mode);
        if (oldStrategy) {
            oldStrategy.exit(camera);
        }

        // 更新组件状态
        camera.mode = preset.mode;
        camera.activePreset = preset.id;

        // 更新历史
        if (!camera.presetHistory.includes(preset.id)) {
            camera.presetHistory.unshift(preset.id);
            if (camera.presetHistory.length > 5) camera.presetHistory.pop();
        }

        // 应用快照参数
        Object.assign(camera, preset.snapshot);

        // 绑定目标
        if (preset.bindTarget) {
            const player = this.findPlayerEntity();
            if (player) {
                camera.targetEntityId = player.id;
            }
        } else if (preset.dualMode) {
            const player = this.findPlayerEntity();
            camera.targetEntityId = player ? player.id : null;
        } else {
            camera.targetEntityId = null;
        }

        // 进入新 Strategy
        const newStrategy = this.cameraSystem.getStrategy(preset.mode);
        if (newStrategy) {
            newStrategy.enter(camera);
        }

        eventBus.emit('camera:preset:changed', { presetId: preset.id, mode: preset.mode });
        return true;
    }

    /**
     * 自动回退
     * 🔴 创造模式保护
     */
    public fallbackToSafePreset(camera: CameraComponent): void {
        if (this.manager.getContext() === ValidationContext.CREATION || camera.mode === 'orbit') {
            camera.targetEntityId = null; // 仅清理引用
            return;
        }

        camera.targetEntityId = null;
        this.applyPreset(camera, this.DEFAULT_SAFE_PRESET);
        eventBus.emit('camera:preset:fallback', { toPreset: this.DEFAULT_SAFE_PRESET });
    }

    private healthCheck(preset: CameraPreset, camera: CameraComponent): HealthCheckResult {
        const strategy = this.cameraSystem.getStrategy(preset.mode);
        if (!strategy) {
            return { success: false, errorCode: 'STRATEGY_UNAVAILABLE' };
        }

        if (preset.bindTarget) {
            const player = this.findPlayerEntity();
            if (!player) {
                return { success: false, errorCode: 'NO_TARGET_ENTITY', reason: '此视角需要控制角色' };
            }
        }

        return { success: true };
    }

    private findPlayerEntity(): Entity | null {
        // 通过 entityManager 查找名为 "Player" 的实体
        const allEntities = this.entityManager.getAllEntities();
        for (const entity of allEntities) {
            if (entity.name === 'Player') {
                return entity;
            }
        }
        return null;
    }

    public getAllPresets(): CameraPreset[] {
        return Array.from(this.presets.values());
    }

    public getActivePresetId(camera: CameraComponent): string | null {
        return camera.activePreset;
    }
}
