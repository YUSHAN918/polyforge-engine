/**
 * PolyForge Engine Command Protocol
 * 引擎指令协议 - 定义 UI 与 Core 之间的所有合法交互
 *
 * "The God's Law" - 任何未在此定义的行为均为非法。
 */

import { CameraMode } from './components/CameraComponent';

// --- Command Types ---

export enum EngineCommandType {
    // Environment (WorldState)
    SET_TIME_OF_DAY = 'SET_TIME_OF_DAY',
    SET_LIGHT_INTENSITY = 'SET_LIGHT_INTENSITY',
    SET_BLOOM_STRENGTH = 'SET_BLOOM_STRENGTH',
    SET_BLOOM_THRESHOLD = 'SET_BLOOM_THRESHOLD',
    SET_GRAVITY = 'SET_GRAVITY',

    // Camera & Render
    SET_CAMERA_MODE = 'SET_CAMERA_MODE',
    SET_CAMERA_FOV = 'SET_CAMERA_FOV',
    SET_SMAA_ENABLED = 'SET_SMAA_ENABLED',
    SET_TONE_MAPPING_EXPOSURE = 'SET_TONE_MAPPING_EXPOSURE',
    SET_MOVE_SPEED = 'SET_MOVE_SPEED',
    SET_FORCE_MULTIPLIER = 'SET_FORCE_MULTIPLIER',

    // Vegetation
    SPAWN_VEGETATION = 'SPAWN_VEGETATION', // Unified command
    CLEAR_VEGETATION = 'CLEAR_VEGETATION',
    SET_GRASS_SCALE = 'SET_GRASS_SCALE',
    SET_WIND_STRENGTH = 'SET_WIND_STRENGTH',
    SET_GRASS_COLOR = 'SET_GRASS_COLOR',
    SET_FLOWER_COLOR = 'SET_FLOWER_COLOR', // Restored functionality

    // Terrain
    CREATE_MOUNTAIN = 'CREATE_MOUNTAIN',
    CREATE_VALLEY = 'CREATE_VALLEY',
    FLATTEN_TERRAIN = 'FLATTEN_TERRAIN',

    // Physics & Gameplay
    SPAWN_PHYSICS_BOX = 'SPAWN_PHYSICS_BOX',
    SPAWN_CHARACTER = 'SPAWN_CHARACTER',
    DESPAWN_CHARACTER = 'DESPAWN_CHARACTER',
    TOGGLE_FLIGHT_MODE = 'TOGGLE_FLIGHT_MODE',
    APPLY_PHYSICS_EXPLOSION = 'APPLY_PHYSICS_EXPLOSION',
    TOGGLE_PHYSICS_DEBUG = 'TOGGLE_PHYSICS_DEBUG',
    TOGGLE_AUDIO_DEBUG = 'TOGGLE_AUDIO_DEBUG',

    // System
    UNDO = 'UNDO',
    REDO = 'REDO',
    SAVE_SCENE = 'SAVE_SCENE',
    RESET_SCENE = 'RESET_SCENE', // Clear & Reload

    // Bundling
    EXPORT_BUNDLE = 'EXPORT_BUNDLE',
    IMPORT_BUNDLE = 'IMPORT_BUNDLE'
}

// --- Payloads ---

export interface SetTimePayload { type: EngineCommandType.SET_TIME_OF_DAY; hour: number; }
export interface SetLightPayload { type: EngineCommandType.SET_LIGHT_INTENSITY; intensity: number; }
export interface SetBloomStrengthPayload { type: EngineCommandType.SET_BLOOM_STRENGTH; strength: number; }
export interface SetBloomThresholdPayload { type: EngineCommandType.SET_BLOOM_THRESHOLD; threshold: number; }
export interface SetGravityPayload { type: EngineCommandType.SET_GRAVITY; value: number; }

export interface SetCameraModePayload { type: EngineCommandType.SET_CAMERA_MODE; mode: CameraMode; }
export interface SetFovPayload { type: EngineCommandType.SET_CAMERA_FOV; fov: number; }
export interface SetSmaaPayload { type: EngineCommandType.SET_SMAA_ENABLED; enabled: boolean; }
export interface SetExposurePayload { type: EngineCommandType.SET_TONE_MAPPING_EXPOSURE; exposure: number; }
export interface SetMoveSpeedPayload { type: EngineCommandType.SET_MOVE_SPEED; speed: number; }
export interface SetForceMultiplierPayload { type: EngineCommandType.SET_FORCE_MULTIPLIER; multiplier: number; }

export interface SpawnVegetationPayload {
    type: EngineCommandType.SPAWN_VEGETATION;
    count: number;
    vegType: 'grass' | 'flower';
    color?: string;
}
export interface ClearVegetationPayload { type: EngineCommandType.CLEAR_VEGETATION; }
export interface SetGrassScalePayload { type: EngineCommandType.SET_GRASS_SCALE; scale: number; }
export interface SetWindStrengthPayload { type: EngineCommandType.SET_WIND_STRENGTH; strength: number; }
export interface SetGrassColorPayload { type: EngineCommandType.SET_GRASS_COLOR; color: string; }
export interface SetFlowerColorPayload { type: EngineCommandType.SET_FLOWER_COLOR; color: string; }

export interface CreateMountainPayload { type: EngineCommandType.CREATE_MOUNTAIN; }
export interface CreateValleyPayload { type: EngineCommandType.CREATE_VALLEY; }
export interface FlattenTerrainPayload { type: EngineCommandType.FLATTEN_TERRAIN; }

export interface SpawnPhysicsBoxPayload { type: EngineCommandType.SPAWN_PHYSICS_BOX; }
export interface SpawnCharacterPayload { type: EngineCommandType.SPAWN_CHARACTER; }
export interface DespawnCharacterPayload { type: EngineCommandType.DESPAWN_CHARACTER; }
export interface ToggleFlightModePayload { type: EngineCommandType.TOGGLE_FLIGHT_MODE; enabled: boolean; }
export interface ApplyExplosionPayload {
    type: EngineCommandType.APPLY_PHYSICS_EXPLOSION;
    position: [number, number, number];
    force: number;
    radius: number;
}
export interface TogglePhysicsDebugPayload { type: EngineCommandType.TOGGLE_PHYSICS_DEBUG; enabled: boolean; }
export interface ToggleAudioDebugPayload { type: EngineCommandType.TOGGLE_AUDIO_DEBUG; enabled: boolean; }

export interface UndoPayload { type: EngineCommandType.UNDO; }
export interface RedoPayload { type: EngineCommandType.REDO; }
export interface SaveScenePayload { type: EngineCommandType.SAVE_SCENE; }
export interface ResetScenePayload { type: EngineCommandType.RESET_SCENE; }

export interface ExportBundlePayload { type: EngineCommandType.EXPORT_BUNDLE; name: string; }
export interface ImportBundlePayload { type: EngineCommandType.IMPORT_BUNDLE; file: File; }

// --- Union Type ---

export type EngineCommand =
    | SetTimePayload
    | SetLightPayload
    | SetBloomStrengthPayload
    | SetBloomThresholdPayload
    | SetGravityPayload
    | SetCameraModePayload
    | SetFovPayload
    | SetSmaaPayload
    | SetExposurePayload
    | SetMoveSpeedPayload
    | SetForceMultiplierPayload
    | SpawnVegetationPayload
    | ClearVegetationPayload
    | SetGrassScalePayload
    | SetWindStrengthPayload
    | SetGrassColorPayload
    | SetFlowerColorPayload
    | CreateMountainPayload
    | CreateValleyPayload
    | FlattenTerrainPayload
    | SpawnPhysicsBoxPayload
    | SpawnCharacterPayload
    | DespawnCharacterPayload
    | ToggleFlightModePayload
    | ApplyExplosionPayload
    | TogglePhysicsDebugPayload
    | ToggleAudioDebugPayload
    | UndoPayload
    | RedoPayload
    | SaveScenePayload
    | ResetScenePayload
    | ExportBundlePayload
    | ImportBundlePayload;
