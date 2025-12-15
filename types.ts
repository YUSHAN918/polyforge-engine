
import * as THREE from 'three';
import React from 'react';

export enum AppMode {
  CHARACTER_EDITOR = 'CHARACTER_EDITOR',
  MAP_EDITOR = 'MAP_EDITOR',
  GAMEPLAY = 'GAMEPLAY',
  MODEL_WORKSHOP = 'MODEL_WORKSHOP',
  ASSET_LIBRARY = 'ASSET_LIBRARY',
  ACTION_STUDIO = 'ACTION_STUDIO',
  VFX_STUDIO = 'VFX_STUDIO', // NEW
  ARCHITECTURE_VALIDATOR = 'ARCHITECTURE_VALIDATOR'
}

export enum CameraMode {
  ISOMETRIC = 'ISOMETRIC', // Hades style
  TPS = 'TPS', // Third Person Shoulder
  SIDE_SCROLL = 'SIDE_SCROLL' // Side view
}

export interface CameraSettings {
  fov: number;
  height: number;
  distance: number;
}

export interface ShadowSettings {
  opacity: number;
  blur: number;
  color: string;
  offsetY: number;
  offsetX: number; // New
  offsetZ: number; // New
}

export enum CameraView {
  ISOMETRIC = 'ISOMETRIC',
  TOP_DOWN = 'TOP_DOWN'
}

export enum CharacterAction {
  IDLE = 'IDLE',
  WALK = 'WALK',
  RUN = 'RUN',
  ATTACK = 'ATTACK'
}

export type ClassName = '战士' | '法师' | '盗贼' | '游侠' | 'none';

// Visual Styles
export type HeadShape = 'box' | string; // Updated to support custom head IDs
export type EyeStyle = 'dot' | 'line' | 'big' | string;
export type MouthStyle = 'smile' | 'sausage' | 'x_shape' | 'none' | string;

// Gear Styles
export type WeaponStyle = 
  | 'none'
  | 'sword_basic' | 'hammer_war'          // Warrior (1H)
  | 'staff_wand' | 'book_spell'           // Mage (1H - New)
  | 'staff_orb' | 'staff_crystal'         // Mage (2H)
  | 'daggers_basic' | 'daggers_kris'      // Rogue (Dual/2H)
  | 'bow_long' | 'bow_recurve'            // Archer (2H)
  | string;                               // CUSTOM WEAPON ID

export type ShieldStyle = 'shield_round' | 'shield_square' | 'shield_kite' | 'none' | string;

export type HelmStyle = 
  | 'helm_plate' | 'helm_dome'            // Warrior
  | 'hat_wizard' | 'hat_hood'             // Mage
  | 'hat_bandana'                         // Rogue
  | 'hat_feather' | 'hat_cowl'            // Archer
  | 'none'
  | string;                               // CUSTOM HELM ID

export type MaskStyle = 
  | 'hat_mask'                            // Moved here
  | 'none'
  | string;                               // CUSTOM MASK ID

export interface CharacterDimensions {
  // Global / Body scaling
  bodyScale: number; // Overall Uniform
  bodyWidth: number; // X/Z Multiplier
  bodyHeight: number; // Y Multiplier

  // Head local scaling
  headScale: number; // Overall Uniform
  headWidth: number; // X/Z Multiplier
  headHeight: number; // Y Multiplier
}

// --- NEW RPG STATS & SKILLS ---
export interface CharacterStats {
  strength: number;  // Melee DMG, HP
  agility: number;   // Attack Speed, Move Speed
  intelligence: number; // Magic DMG, Mana
  vitality: number;  // Max HP, Defense
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string; // FontAwesome class or URL
  cooldown: number;
  damageMultiplier: number;
  vfxId?: string; // Link to a particle effect
}

// --- NEW ACTION SET CONFIG ---
export interface ActionSet {
  idleId?: string;
  walkId?: string;
  runId?: string;
  attackId?: string;
}

export interface CharacterConfig {
  id?: string; // Unique ID for saved characters
  name: string;
  className: ClassName;
  
  // Colors
  skinColor: string;
  bodyColor: string;
  limbColor: string;
  hairColor: string;
  
  // Visuals (Body)
  headStyle: HeadShape; 
  hairStyle: string; 
  eyeStyle: EyeStyle;
  mouthStyle: MouthStyle;

  // Visuals (Detailed Body Parts)
  chestStyle?: string;
  hipsStyle?: string;
  upperArmStyle?: string; // Symmetric L/R
  forearmStyle?: string;
  handStyle?: string;
  thighStyle?: string;
  calfStyle?: string;
  footStyle?: string;
  
  // Dimensions
  dimensions: CharacterDimensions;

  // Gear
  gear: {
    weapon: WeaponStyle;
    shield: ShieldStyle;
    helm: HelmStyle;
    mask: MaskStyle;
  };
  
  // RPG Data (New)
  stats: CharacterStats;
  skills: string[]; // List of Skill IDs
  
  // Animation Set (New)
  actionSet: ActionSet;

  textureUrl?: string;
  backstory?: string;
}

// Wrapper for a fully saved character asset (Visuals + Stats)
export interface SavedCharacter extends CharacterConfig {
  createdAt: number;
}

// --- ANIMATION CONFIG ---
export interface AnimationConfig {
  idle: {
    speed: number;
    amplitude: number;
    sway?: number; // New: Hips sway L/R
    headBob?: number; // New: Head nod
    linkedActionId?: string; // New: Link to Keyframe Action
  };
  walk: {
    speed: number;
    legAmplitude: number;
    armAmplitude: number;
    bounciness: number;
    kneeBend?: number;      
    armSpan?: number;       
    spineRotation?: number; 
    stepWidth?: number; // New: Feet width apart
    armRotation?: number; // New: Base arm rotation (forward/back)
    linkedActionId?: string; // New: Link to Keyframe Action
  };
  run: {
    speed: number;
    legAmplitude: number;
    armAmplitude: number;
    bodyLean: number;
    kneeBend?: number;      
    armSpan?: number;       
    spineRotation?: number; 
    stepWidth?: number; // New
    armRotation?: number; // New
    linkedActionId?: string; // New: Link to Keyframe Action
    bounciness?: number; // Added to fix type error
  };
  attack: {
    speedMult: number; // Overall speed multiplier
    windupRatio: number; // 0.1 - 0.5 (Time spent preparing)
    intensity: number; // Exaggeration of movement
    decay?: number; // New: Recovery speed (0.1 = slow, 1.0 = instant)
    recoil?: number; // New: Body kickback
    legSpread?: number; // New: How wide legs are spread (0.0 to 1.0)
    kneeBend?: number; // New: Crouch amount (0.0 to 0.5)
    animType?: 'melee' | 'ranged' | 'magic' | 'unarmed'; // New: Animation Type
    linkedActionId?: string; // NEW: Link to a Keyframe Action ID
    allowMovement?: boolean; // NEW: Explicitly allow/disallow movement during attack
  };
}

// --- COMBAT TYPES ---
export enum CombatStyle {
    MELEE_1H = 'MELEE_1H',
    MELEE_2H = 'MELEE_2H', // Includes Dual Wield
    RANGED = 'RANGED',
    MAGIC = 'MAGIC',
    UNARMED = 'UNARMED'
}

// --- TUNER TYPES ---
export interface GearTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number | [number, number, number]; 
  color?: string; 
}
export type GearTransformMap = Record<string, GearTransform>;

export interface AssetTransform {
  scale: number;
  rotation: [number, number, number];
  position: [number, number, number];
}
export type AssetTransformMap = Record<string, AssetTransform>;

export type MapItemType = 
  | 'wall' | 'tree' | 'crate' | 'barrel'
  | 'rabbit' | 'duck' | 'toad'
  | 'boar' | 'deer' | 'goblin'
  | 'golem' | 'troll' | 'dragon'
  | string; // Allow custom IDs

export interface MapElement {
  id: string;
  type: MapItemType;
  position: [number, number, number];
  // If type corresponds to a SavedCharacter ID, we can look up stats
  isCharacter?: boolean; 
}

export interface MapConfig {
  groundColor: string;
  elements: MapElement[];
}

export interface Enemy {
  id: string;
  type: MapItemType;
  position: [number, number, number];
  hp: number;
  maxHp: number;
}

// --- CUSTOM MODEL TYPES ---
export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'capsule' | 'tetrahedron' | 'plane' | 'ring';

export interface ModelPrimitive {
  id: string;
  type: PrimitiveType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  groupId?: string; // For grouping primitives
}

export type AssetCategory = 'weapon' | 'shield' | 'helm' | 'mask' | 'map_object' | 'mob' | 'character_part';
export type AssetSubCategory = 
  | 'one_handed' | 'two_handed' 
  | 'shield' 
  | 'helm' | 'mask'
  | 'structure' | 'prop' | 'nature' // For map_object
  | 'small' | 'medium' | 'large'    // For mob
  | 'head' | 'eye' | 'mouth' | 'hair' 
  | 'chest' | 'hips' | 'upper_arm' | 'forearm' | 'hand' | 'thigh' | 'calf' | 'foot' // Detailed body parts
  | 'body' // Generic body
  | 'none';

// Vfx Binding Map (Slot based)
export interface VfxBindingMap {
    equip?: string;      // Continuous (e.g. flaming sword)
    projectile?: string; // Continuous (e.g. fireball trail)
    impact?: string;     // Burst (e.g. explosion on hit)
}

export interface CustomModel {
  id: string;
  name: string;
  category: AssetCategory;
  subCategory?: AssetSubCategory; 
  parts: ModelPrimitive[];
  vfxBindings?: VfxBindingMap; // NEW: Persisted bindings on the asset
}

// --- VFX TYPES (NEW) ---
export type VfxShape = 'box' | 'sphere' | 'plane' | 'tetrahedron';
export type VfxType = 'continuous' | 'burst';
export type VfxBlending = 'normal' | 'additive'; // NEW

export interface VfxEmitterConfig {
  id: string;
  name: string;
  enabled: boolean;
  shape: VfxShape;
  colorStart: string;
  colorEnd: string;
  opacity: number; 
  opacityEnd?: number; // NEW: Fade out support
  blending: VfxBlending; 
  rate: number; // particles per second (for continuous)
  burstCount?: number; // particles per shot (for burst)
  lifetime: number; // seconds
  sizeStart: number;
  sizeEnd: number;
  speed: number;
  spread: number; // Random direction variation
  gravity: number; // Downward force
  offset: [number, number, number]; // Local position offset
  followParent: boolean; // If true, particles move with emitter. If false, they trail.
  // NEW PROPERTIES
  rotationSpeed?: number; // Angular velocity
  turbulence?: number; // Noise strength
  delay?: number; // Start delay
  groupId?: string; // For grouping emitters
}

export interface VfxAsset {
  id: string;
  name: string;
  type: VfxType; // NEW: Effect category
  emitters: VfxEmitterConfig[];
}

// COMMUNICATION INTERFACE FOR VFX SCENE
export interface VfxTestParams {
    isPlaying: boolean;
    isProjectileTesting: boolean;
    referenceModelId?: string;
    projectileModelId?: string;
}

// --- ACTION STUDIO TYPES ---
export type BoneName = 
  | 'hips' | 'chest' | 'head'
  | 'arm_left' | 'forearm_left' | 'hand_left'
  | 'arm_right' | 'forearm_right' | 'hand_right'
  | 'thigh_left' | 'calf_left' | 'foot_left'
  | 'thigh_right' | 'calf_right' | 'foot_right';

export type InterpolationType = 'linear' | 'ease';
export type ActionInterpolationMode = 'step' | 'linear' | 'easeInOut';
export type ActionCategory = 'idle' | 'walk' | 'run' | 'attack' | 'special';

export interface Keyframe {
  time: number; // 0.0 to 1.0 (normalized duration)
  boneRotations: Record<string, [number, number, number]>; // BoneName -> Euler [x,y,z]
  bonePositions?: Record<string, [number, number, number]>; // NEW: Bone Translation [x,y,z] (Mainly for hips)
  interpolation?: InterpolationType;
}

export interface CustomAction {
  id: string;
  name: string;
  category: ActionCategory; // NEW: Categorized Action
  duration: number; // in seconds
  loop: boolean;
  interpolation: ActionInterpolationMode; // NEW: Control smoothing
  keyframes: Keyframe[];
}

export interface SavedProceduralAction {
  id: string;
  name: string;
  category: ActionCategory; // NEW: Using unified type
  config: AnimationConfig;
  compatibleStyles?: CombatStyle[]; // NEW: Compatible with which combat styles?
}

export interface Character3DProps {
  config: CharacterConfig;
  action?: CharacterAction; 
  lastAttackTime?: number;
  isMoving?: boolean;
  moveLocal?: THREE.Vector2; // NEW: Local movement direction {x: strafe, z: forward}
  gearTransforms?: GearTransformMap;
  onPartSelect?: (id: string, isDoubleClick?: boolean) => void;
  onPartRightClick?: (id: string) => void;
  animConfig?: AnimationConfig;
  focusedParentId?: string;
  customModels?: CustomModel[]; 
  hiddenSlots?: string[]; 
  
  // Action Studio Props
  onBoneRegister?: (bones: Record<string, THREE.Object3D>) => void;
  overridePose?: Record<string, [number, number, number]>;
  overridePosition?: Record<string, [number, number, number]>; // NEW: Position overrides
  activeCustomAction?: CustomAction | null;
  animTime?: number;
  isProceduralPaused?: boolean; // NEW: Pause support for procedural animations
  customActions?: CustomAction[]; // NEW: Full list for looking up linked actions
  
  // Workshop Props
  forceTPose?: boolean;
  freezeAnim?: boolean; // New prop to freeze animation at t=0
  referenceOpacity?: number; // 0 to 1
  
  // VFX Bindings
  vfxBindings?: Record<string, VfxBindingMap>; // ModelID -> VfxSlots (Deprecated in favor of CustomModel.vfxBindings but kept for compat)
  vfxAssets?: VfxAsset[]; // Available VFX Assets
}

export type WorkshopRefType = 
  | 'none' | 'ground'
  | 'head' 
  | 'chest' | 'hips' | 'back'
  | 'hand_r' | 'hand_l' 
  | 'arm_l' | 'forearm_l' 
  | 'arm_r' | 'forearm_r' 
  | 'thigh_l' | 'calf_l' | 'foot_l'
  | 'thigh_r' | 'calf_r' | 'foot_r';

// Global JSX augmentation to fix IntrinsicElements errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // HTML
      div: any;
      span: any;
      button: any;
      input: any;
      label: any;
      select: any;
      option: any;
      optgroup: any;
      form: any;
      textarea: any;
      h1: any;
      h2: any;
      h3: any;
      h4: any;
      p: any;
      b: any;
      i: any;
      br: any;
      section: any;
      
      // R3F
      group: any;
      mesh: any;
      boxGeometry: any;
      sphereGeometry: any;
      cylinderGeometry: any;
      coneGeometry: any;
      torusGeometry: any;
      capsuleGeometry: any;
      planeGeometry: any;
      tetrahedronGeometry: any;
      octahedronGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      gridHelper: any;
      axesHelper: any;
      hemisphereLight: any;
      directionalLight: any;
      ambientLight: any;
      pointLight: any;
      spotLight: any;
      primitive: any;
      instancedMesh: any; // Added for VFX
      instancedBufferAttribute: any; // Added for VFX
    }
  }
}
