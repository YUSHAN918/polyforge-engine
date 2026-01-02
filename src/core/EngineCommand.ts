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
    SET_HDR = 'SET_HDR',

    // Camera & Render
    SET_CAMERA_MODE = 'SET_CAMERA_MODE',
    SET_CAMERA_FOV = 'SET_CAMERA_FOV',
    SET_SMAA_ENABLED = 'SET_SMAA_ENABLED',
    SET_TONE_MAPPING_EXPOSURE = 'SET_TONE_MAPPING_EXPOSURE',
    SET_MOVE_SPEED = 'SET_MOVE_SPEED',
    SET_FORCE_MULTIPLIER = 'SET_FORCE_MULTIPLIER',
    SET_CAMERA_PITCH = 'SET_CAMERA_PITCH',
    SET_CAMERA_YAW = 'SET_CAMERA_YAW',
    SET_CAMERA_DISTANCE = 'SET_CAMERA_DISTANCE',
    APPLY_CAMERA_PRESET = 'APPLY_CAMERA_PRESET',

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
    SET_TERRAIN_SIZE = 'SET_TERRAIN_SIZE',

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
    IMPORT_BUNDLE = 'IMPORT_BUNDLE',

    // Placement System (WYSIWYG)
    ENTER_PLACEMENT_MODE = 'ENTER_PLACEMENT_MODE',
    ENTER_IMAGE_PLACEMENT_MODE = 'ENTER_IMAGE_PLACEMENT_MODE',
    TOGGLE_PLACEMENT_MODE = 'TOGGLE_PLACEMENT_MODE',
    CANCEL_PLACEMENT = 'CANCEL_PLACEMENT',
    COMMIT_PLACEMENT = 'COMMIT_PLACEMENT',

    // Audio Extra
    SET_PLAYBACK_RATE = 'SET_PLAYBACK_RATE',

    // Selection & Context (Isolation)
    SELECT_ENTITY = 'SELECT_ENTITY',
    APPLY_ASSET_TO_SELECTION = 'APPLY_ASSET_TO_SELECTION',
    SET_CONTEXT = 'SET_CONTEXT',

    // Editing Operations
    DELETE_ENTITY = 'DELETE_ENTITY',
    ROTATE_PLACEMENT = 'ROTATE_PLACEMENT',
    SCALE_PLACEMENT = 'SCALE_PLACEMENT',
    SET_COLLIDER_SCALE = 'SET_COLLIDER_SCALE',
    TOGGLE_COLLIDER_EDITING = 'TOGGLE_COLLIDER_EDITING',
    SET_COLLIDER_OFFSET_Y = 'SET_COLLIDER_OFFSET_Y',
    SET_COLLIDER_ROTATION_Y = 'SET_COLLIDER_ROTATION_Y',
    SAVE_ASSET_PHYSICS_CONFIG = 'SAVE_ASSET_PHYSICS_CONFIG',
    AUTO_FIT_COLLIDER = 'AUTO_FIT_COLLIDER',
    SET_IMAGE_MODE = 'SET_IMAGE_MODE'
}

// --- Payloads ---

export interface SetTimePayload { type: EngineCommandType.SET_TIME_OF_DAY; hour: number; }
export interface SetLightPayload { type: EngineCommandType.SET_LIGHT_INTENSITY; intensity: number; }
// ... (keep existing) ...
export interface SetColliderRotationYPayload { type: EngineCommandType.SET_COLLIDER_ROTATION_Y; rotation: number; }
export interface SaveAssetPhysicsConfigPayload { type: EngineCommandType.SAVE_ASSET_PHYSICS_CONFIG; }
export interface AutoFitColliderPayload { type: EngineCommandType.AUTO_FIT_COLLIDER; entityId: string | null; }

// --- Union Type ---


export interface SetLightPayload { type: EngineCommandType.SET_LIGHT_INTENSITY; intensity: number; }
export interface SetBloomStrengthPayload { type: EngineCommandType.SET_BLOOM_STRENGTH; strength: number; }
export interface SetBloomThresholdPayload { type: EngineCommandType.SET_BLOOM_THRESHOLD; threshold: number; }
export interface SetGravityPayload { type: EngineCommandType.SET_GRAVITY; value: number; }
export interface SetHdrPayload { type: EngineCommandType.SET_HDR; assetId: string | undefined; }

export interface SetCameraModePayload { type: EngineCommandType.SET_CAMERA_MODE; mode: CameraMode; }
export interface SetFovPayload { type: EngineCommandType.SET_CAMERA_FOV; fov: number; }
export interface SetSmaaPayload { type: EngineCommandType.SET_SMAA_ENABLED; enabled: boolean; }
export interface SetExposurePayload { type: EngineCommandType.SET_TONE_MAPPING_EXPOSURE; exposure: number; }
export interface SetMoveSpeedPayload { type: EngineCommandType.SET_MOVE_SPEED; speed: number; }
export interface SetForceMultiplierPayload { type: EngineCommandType.SET_FORCE_MULTIPLIER; multiplier: number; }
export interface SetCameraPitchPayload { type: EngineCommandType.SET_CAMERA_PITCH; pitch: number; }
export interface SetCameraYawPayload { type: EngineCommandType.SET_CAMERA_YAW; yaw: number; }
export interface SetCameraDistancePayload { type: EngineCommandType.SET_CAMERA_DISTANCE; distance: number; }
export interface ApplyCameraPresetPayload { type: EngineCommandType.APPLY_CAMERA_PRESET; presetId: string; }

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
export interface SetTerrainSizePayload { type: EngineCommandType.SET_TERRAIN_SIZE; width: number; depth: number; }

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

export interface EnterPlacementPayload { type: EngineCommandType.ENTER_PLACEMENT_MODE; assetId: string; assetName: string; }
export interface EnterImagePlacementPayload { type: EngineCommandType.ENTER_IMAGE_PLACEMENT_MODE; assetId: string; assetName: string; }
export interface TogglePlacementModePayload { type: EngineCommandType.TOGGLE_PLACEMENT_MODE; }
export interface CancelPlacementPayload { type: EngineCommandType.CANCEL_PLACEMENT; }
export interface CommitPlacementPayload { type: EngineCommandType.COMMIT_PLACEMENT; }

export interface SetPlaybackRatePayload { type: EngineCommandType.SET_PLAYBACK_RATE; rate: number; }

export interface SelectEntityPayload { type: EngineCommandType.SELECT_ENTITY; entityId: string | null; }
export interface ApplyAssetPayload { type: EngineCommandType.APPLY_ASSET_TO_SELECTION; assetId: string; assetType: 'model' | 'image'; }
// Duplicate removed.
export interface SetContextPayload { type: EngineCommandType.SET_CONTEXT; context: 'CREATION' | 'EXPERIENCE'; }

export interface DeleteEntityPayload { type: EngineCommandType.DELETE_ENTITY; }
export interface RotatePlacementPayload { type: EngineCommandType.ROTATE_PLACEMENT; axis?: 'x' | 'y'; }
export interface ScalePlacementPayload { type: EngineCommandType.SCALE_PLACEMENT; delta: number; }
export interface SetColliderScalePayload { type: EngineCommandType.SET_COLLIDER_SCALE; scale: number; }
export interface ToggleColliderEditingPayload { type: EngineCommandType.TOGGLE_COLLIDER_EDITING; enabled: boolean; }
export interface SetColliderOffsetYPayload { type: EngineCommandType.SET_COLLIDER_OFFSET_Y; offset: number; }
export interface SetColliderRotationYPayload { type: EngineCommandType.SET_COLLIDER_ROTATION_Y; rotation: number; }
export interface SaveAssetPhysicsConfigPayload { type: EngineCommandType.SAVE_ASSET_PHYSICS_CONFIG; }
export interface SetImageModePayload { type: EngineCommandType.SET_IMAGE_MODE; entityId: string; mode: 'billboard' | 'standee' | 'sticker'; }

// --- Union Type ---

export type EngineCommand =
    | SetTimePayload
    | SetLightPayload
    | SetBloomStrengthPayload
    | SetBloomThresholdPayload
    | SetGravityPayload
    | SetHdrPayload
    | SetCameraModePayload
    | SetFovPayload
    | SetSmaaPayload
    | SetExposurePayload
    | SetMoveSpeedPayload
    | SetForceMultiplierPayload
    | SetCameraPitchPayload
    | SetCameraYawPayload
    | SetCameraDistancePayload
    | ApplyCameraPresetPayload
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
    | ImportBundlePayload
    | EnterPlacementPayload
    | EnterImagePlacementPayload
    | TogglePlacementModePayload
    | CancelPlacementPayload
    | CommitPlacementPayload
    | SetPlaybackRatePayload
    | SelectEntityPayload
    | ApplyAssetPayload
    | SetContextPayload
    | SetTerrainSizePayload
    | DeleteEntityPayload
    | RotatePlacementPayload
    | ScalePlacementPayload
    | SetColliderScalePayload
    | ToggleColliderEditingPayload
    | SetColliderOffsetYPayload
    | SetColliderRotationYPayload
    | SaveAssetPhysicsConfigPayload
    | AutoFitColliderPayload
    | SetImageModePayload;
