import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CameraPresetManager } from '../CameraPresetManager';

// 彻底打桩 ArchitectureValidationManager 以防止加载 PhysicsSystem (Rapier3D)
vi.mock('../../ArchitectureValidationManager', () => {
    return {
        ValidationContext: {
            CREATION: 'CREATION',
            EXPERIENCE: 'EXPERIENCE'
        },
        ArchitectureValidationManager: vi.fn()
    };
});

// 重新获取由于打桩受影响的枚举（如果有必要，或者直接在测试中使用硬编码/局部定义）
const ValidationContext = {
    CREATION: 'CREATION',
    EXPERIENCE: 'EXPERIENCE'
};

describe('CameraPresetManager', () => {
    let mockCameraSystem: any;
    let mockEntityManager: any;
    let mockManager: any;
    let presetManager: CameraPresetManager;

    beforeEach(() => {
        mockCameraSystem = {
            getStrategy: vi.fn().mockReturnValue({
                enter: vi.fn(),
                exit: vi.fn(),
                updateTarget: vi.fn(),
            }),
        };
        mockEntityManager = {
            getEntity: vi.fn(),
            getAllEntities: vi.fn().mockReturnValue([]),
        };
        mockManager = {
            getContext: vi.fn().mockReturnValue(ValidationContext.EXPERIENCE),
            getPlayerEntity: vi.fn(),
        };
        presetManager = new CameraPresetManager(mockCameraSystem, mockEntityManager, mockManager);
    });

    it('should register standard presets on initialization', () => {
        const presets = presetManager.getAllPresets();
        expect(presets.length).toBe(4);
        expect(presets.map(p => p.id)).toContain('iso');
        expect(presets.map(p => p.id)).toContain('fps');
        expect(presets.map(p => p.id)).toContain('tps');
        expect(presets.map(p => p.id)).toContain('sidescroll');
    });

    it('should reject orbit as a preset registration', () => {
        expect(() => {
            presetManager.registerPreset({
                id: 'orbit',
                displayName: 'Fake Orbit',
                mode: 'orbit' as any,
                snapshot: {},
                bindTarget: false,
            });
        }).toThrow('[CameraPresetManager] Cannot register orbit as a preset.');
    });

    it('should reject applying presets in CREATION mode', () => {
        mockManager.getContext.mockReturnValue(ValidationContext.CREATION);
        const mockCamera: any = { mode: 'orbit' };

        const result = presetManager.applyPreset(mockCamera, 'iso');
        expect(result).toBe(false);
    });

    it('should allow applying iso preset in EXPERIENCE mode', () => {
        const mockCamera: any = { mode: 'orbit', presetHistory: [] };
        const result = presetManager.applyPreset(mockCamera, 'iso');
        expect(result).toBe(true);
        expect(mockCamera.mode).toBe('isometric');
        expect(mockCamera.activePreset).toBe('iso');
    });

    it('should reject fps preset if no player character exists', () => {
        // mockManager.getPlayerEntity is NOT used by CameraPresetManager, it uses entityManager directly
        mockEntityManager.getAllEntities.mockReturnValue([]);
        const mockCamera: any = { mode: 'isometric', presetHistory: [] };

        const result = presetManager.applyPreset(mockCamera, 'fps');
        expect(result).toBe(false);
    });

    it('should fallback to iso when target is lost in EXPERIENCE mode', () => {
        const mockCamera: any = { mode: 'firstPerson', activePreset: 'fps', presetHistory: ['fps'], targetEntityId: 'player_1' };

        presetManager.fallbackToSafePreset(mockCamera);

        expect(mockCamera.mode).toBe('isometric');
        expect(mockCamera.activePreset).toBe('iso');
        expect(mockCamera.targetEntityId).toBeNull();
    });

    it('should NOT fallback in CREATION mode when target is lost', () => {
        mockManager.getContext.mockReturnValue(ValidationContext.CREATION);
        const mockCamera: any = { mode: 'orbit', targetEntityId: 'temp_entity_1' };

        presetManager.fallbackToSafePreset(mockCamera);

        expect(mockCamera.mode).toBe('orbit');
        expect(mockCamera.targetEntityId).toBeNull();
    });
});
