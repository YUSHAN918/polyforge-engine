
import { GearTransformMap, AssetTransformMap, AnimationConfig, CustomModel, CustomAction, Skill, ModelPrimitive, AssetCategory, AssetSubCategory, SavedProceduralAction, CombatStyle, CharacterConfig } from './types';

// ------------------------------------------------------------------
// DATA SANITIZER (Prevents Black Screen Crashes)
// ------------------------------------------------------------------
export const sanitizeModel = (model: any): CustomModel => {
    // 1. Basic Object Check
    if (!model || typeof model !== 'object') {
        console.warn("Invalid model object detected, using fallback.");
        return { id: `fixed_${Math.random().toString(36).substr(2, 5)}`, name: 'Invalid Model', category: 'map_object', subCategory: 'none', parts: [] };
    }
    
    // 2. ID & Metadata Check
    const safeModel: CustomModel = {
        id: model.id || `custom_${Math.random().toString(36).substr(2, 9)}`,
        name: model.name || 'Unnamed Model',
        category: model.category || 'map_object',
        subCategory: model.subCategory || 'none',
        parts: []
    };

    // 3. Parts Array Check
    if (Array.isArray(model.parts)) {
        safeModel.parts = model.parts.map((p: any, idx: number) => {
            if (!p || typeof p !== 'object') return null;

            // Safe Vector extraction with NaN protection
            const safeNum = (v: any, def: number) => {
                const n = Number(v);
                return isNaN(n) ? def : n;
            };

            const pos: [number, number, number] = Array.isArray(p.position) && p.position.length >= 3 
                ? [safeNum(p.position[0], 0), safeNum(p.position[1], 0), safeNum(p.position[2], 0)] 
                : [0, 0, 0];
                
            const rot: [number, number, number] = Array.isArray(p.rotation) && p.rotation.length >= 3 
                ? [safeNum(p.rotation[0], 0), safeNum(p.rotation[1], 0), safeNum(p.rotation[2], 0)] 
                : [0, 0, 0];
            
            let scl: [number, number, number] = [1, 1, 1];
            if (Array.isArray(p.scale) && p.scale.length >= 3) {
                scl = [safeNum(p.scale[0], 1), safeNum(p.scale[1], 1), safeNum(p.scale[2], 1)];
            } else if (typeof p.scale === 'number') {
                const s = safeNum(p.scale, 1);
                scl = [s, s, s];
            }

            return {
                id: p.id || `part_${idx}_${Math.random().toString(36).substr(2, 5)}`,
                type: p.type || 'box',
                position: pos,
                rotation: rot,
                scale: scl,
                color: p.color || '#cccccc',
                groupId: p.groupId
            } as ModelPrimitive;
        }).filter(Boolean) as ModelPrimitive[]; // Remove nulls
    }

    return safeModel;
};

// ------------------------------------------------------------------
// DEFAULT SKILLS LIBRARY
// ------------------------------------------------------------------
export const INITIAL_SKILLS: Skill[] = [
    { id: 'skill_fireball', name: '爆裂火球', description: '发射一枚造成巨大伤害的火球', icon: 'fa-fire', cooldown: 5, damageMultiplier: 2.5 },
    { id: 'skill_slash', name: '强力斩击', description: '挥舞武器对前方造成范围伤害', icon: 'fa-gavel', cooldown: 3, damageMultiplier: 1.5 },
    { id: 'skill_heal', name: '圣光治愈', description: '恢复自身生命值', icon: 'fa-plus-circle', cooldown: 10, damageMultiplier: 0 },
    { id: 'skill_dash', name: '暗影冲刺', description: '快速向前突进并闪避攻击', icon: 'fa-running', cooldown: 4, damageMultiplier: 0.5 },
    { id: 'skill_snipe', name: '致命狙击', description: '瞄准弱点造成的远程伤害', icon: 'fa-crosshairs', cooldown: 8, damageMultiplier: 3.0 },
];

// ------------------------------------------------------------------
// DEFAULT ANIMATION SETTINGS
// ------------------------------------------------------------------
export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  idle: { 
      speed: 2.0, 
      amplitude: 0.05, 
      sway: 0.02, 
      headBob: 0.05 
  },
  walk: { 
      speed: 10.0, 
      legAmplitude: 0.6, 
      armAmplitude: 0.6, 
      bounciness: 0.1,
      kneeBend: 1.5, 
      armSpan: 0.1,  
      spineRotation: 0.1,
      stepWidth: 0.2, 
      armRotation: 0.0
  },
  run: { 
      speed: 18.0, 
      legAmplitude: 1.0, 
      armAmplitude: 1.2, 
      bodyLean: 0.3,
      kneeBend: 1.8,
      armSpan: 0.2,
      spineRotation: 0.2,
      stepWidth: 0.3,
      armRotation: 0.0
  },
  attack: { 
      speedMult: 1.0, 
      windupRatio: 0.25, 
      intensity: 1.0, 
      decay: 0.5,
      recoil: 0.2,
      legSpread: 0.4, // Standard lunge
      kneeBend: 0.15,  // Slight crouch
      animType: 'melee',
      allowMovement: true
  }
};

export const INITIAL_PROCEDURAL_ACTIONS: SavedProceduralAction[] = [
    {
      "id": "proc_standard_run",
      "name": "标准跑步",
      "category": "run",
      "config": {
        "idle": {
          "speed": 2,
          "amplitude": 0.05,
          "sway": 0.02,
          "headBob": 0.05
        },
        "walk": {
          "speed": 10,
          "legAmplitude": 0.6,
          "armAmplitude": 0.6,
          "bounciness": 0.1,
          "kneeBend": 1.5,
          "armSpan": 0.1,
          "spineRotation": 0.1,
          "stepWidth": 0.2,
          "armRotation": 0
        },
        "run": {
          "speed": 18,
          "legAmplitude": 1,
          "armAmplitude": 1.2,
          "bodyLean": 0.3,
          "kneeBend": 1.8,
          "armSpan": 0.2,
          "spineRotation": 0.2,
          "stepWidth": 0.3,
          "armRotation": 0
        },
        "attack": {
          "speedMult": 1,
          "windupRatio": 0.25,
          "intensity": 1,
          "decay": 0.5,
          "recoil": 0.2,
          "legSpread": 0.4,
          "kneeBend": 0.15,
          "animType": "melee",
          "allowMovement": true
        }
      }
    },
    {
      "id": "proc_zombie_walk",
      "name": "僵尸行走",
      "category": "walk",
      "config": {
        "idle": {
          "speed": 2,
          "amplitude": 0.05,
          "sway": 0.02,
          "headBob": 0.05
        },
        "walk": {
          "speed": 4,
          "legAmplitude": 0.3,
          "armAmplitude": 0.8,
          "bounciness": 0.05,
          "kneeBend": 0.5,
          "armSpan": 0.8,
          "spineRotation": 0.05,
          "stepWidth": 0.4,
          "armRotation": -1
        },
        "run": {
          "speed": 18,
          "legAmplitude": 1,
          "armAmplitude": 1.2,
          "bodyLean": 0.3,
          "kneeBend": 1.8,
          "armSpan": 0.2,
          "spineRotation": 0.2,
          "stepWidth": 0.3,
          "armRotation": 0
        },
        "attack": {
          "speedMult": 1,
          "windupRatio": 0.25,
          "intensity": 1,
          "decay": 0.5,
          "recoil": 0.2,
          "legSpread": 0.4,
          "kneeBend": 0.15,
          "animType": "melee",
          "allowMovement": true
        }
      }
    },
    {
      "id": "proc_ninja_run",
      "name": "忍者冲刺",
      "category": "run",
      "config": {
        "idle": {
          "speed": 2,
          "amplitude": 0.05,
          "sway": 0.02,
          "headBob": 0.05
        },
        "walk": {
          "speed": 10,
          "legAmplitude": 0.6,
          "armAmplitude": 0.6,
          "bounciness": 0.1,
          "kneeBend": 1.5,
          "armSpan": 0.1,
          "spineRotation": 0.1,
          "stepWidth": 0.2,
          "armRotation": 0
        },
        "run": {
          "speed": 22,
          "legAmplitude": 1.2,
          "armAmplitude": 0.2,
          "bodyLean": 0.7,
          "kneeBend": 2.2,
          "armSpan": 0.4,
          "spineRotation": 0.1,
          "stepWidth": 0.1,
          "armRotation": 1.5
        },
        "attack": {
          "speedMult": 1,
          "windupRatio": 0.25,
          "intensity": 1,
          "decay": 0.5,
          "recoil": 0.2,
          "legSpread": 0.4,
          "kneeBend": 0.15,
          "animType": "melee",
          "allowMovement": true
        }
      }
    },
    {
      "id": "proc_custom_s63mepr1w",
      "name": "战斗待机 (Custom)",
      "category": "idle",
      "config": {
        "idle": {
          "speed": 2,
          "amplitude": 0.05,
          "sway": 0.02,
          "headBob": 0.05,
          "linkedActionId": "ai_action_ly7qx6jjq"
        },
        "walk": {
          "speed": 10,
          "legAmplitude": 0.6,
          "armAmplitude": 0.6,
          "bounciness": 0.1,
          "kneeBend": 1.5,
          "armSpan": 0.1,
          "spineRotation": 0.1,
          "stepWidth": 0.2,
          "armRotation": 0
        },
        "run": {
          "speed": 18,
          "legAmplitude": 1,
          "armAmplitude": 1.2,
          "bodyLean": 0.3,
          "kneeBend": 1.8,
          "armSpan": 0.2,
          "spineRotation": 0.2,
          "stepWidth": 0.3,
          "armRotation": 0
        },
        "attack": {
          "speedMult": 1,
          "windupRatio": 0.25,
          "intensity": 1,
          "decay": 0.5,
          "recoil": 0.2,
          "legSpread": 0.4,
          "kneeBend": 0.15,
          "animType": "melee",
          "allowMovement": true
        }
      }
    },
    {
      "id": "proc_custom_ptcvzjker",
      "name": "锤击地面 (Custom)",
      "category": "attack",
      "config": {
        "idle": {
          "speed": 2,
          "amplitude": 0.05,
          "sway": 0.02,
          "headBob": 0.05
        },
        "walk": {
          "speed": 10,
          "legAmplitude": 0.6,
          "armAmplitude": 0.6,
          "bounciness": 0.1,
          "kneeBend": 1.5,
          "armSpan": 0.1,
          "spineRotation": 0.1,
          "stepWidth": 0.2,
          "armRotation": 0
        },
        "run": {
          "speed": 18,
          "legAmplitude": 1,
          "armAmplitude": 1.2,
          "bodyLean": 0.3,
          "kneeBend": 1.8,
          "armSpan": 0.2,
          "spineRotation": 0.2,
          "stepWidth": 0.3,
          "armRotation": 0
        },
        "attack": {
          "speedMult": 0.6,
          "windupRatio": 0.35,
          "intensity": 1.5,
          "decay": 0.5,
          "recoil": 0.4,
          "legSpread": 0.7,
          "kneeBend": 0.25,
          "animType": "melee",
          "allowMovement": false,
          "linkedActionId": "action_attack_2sfnlrfjk"
        }
      },
      "compatibleStyles": [
        CombatStyle.MELEE_1H
      ]
    },
    {
      "id": "proc_custom_dj5r385ti",
      "name": "基本待机 (Custom)",
      "category": "idle",
      "config": {
        "idle": {
          "speed": 2,
          "amplitude": 0.05,
          "sway": 0.02,
          "headBob": 0.05,
          "linkedActionId": "action_idle_base"
        },
        "walk": {
          "speed": 10,
          "legAmplitude": 0.6,
          "armAmplitude": 0.6,
          "bounciness": 0.1,
          "kneeBend": 1.5,
          "armSpan": 0.1,
          "spineRotation": 0.1,
          "stepWidth": 0.2,
          "armRotation": 0
        },
        "run": {
          "speed": 18,
          "legAmplitude": 1,
          "armAmplitude": 1.2,
          "bodyLean": 0.3,
          "kneeBend": 1.8,
          "armSpan": 0.2,
          "spineRotation": 0.2,
          "stepWidth": 0.3,
          "armRotation": 0
        },
        "attack": {
          "speedMult": 1,
          "windupRatio": 0.25,
          "intensity": 1,
          "decay": 0.5,
          "recoil": 0.2,
          "legSpread": 0.4,
          "kneeBend": 0.15,
          "animType": "melee",
          "allowMovement": true
        }
      }
    },
    {
      "id": "proc_custom_9ibnmohn6",
      "name": "横斩 (Custom)",
      "category": "attack",
      "config": {
        "idle": {
          "speed": 2,
          "amplitude": 0.05,
          "sway": 0.02,
          "headBob": 0.05
        },
        "walk": {
          "speed": 10,
          "legAmplitude": 0.6,
          "armAmplitude": 0.6,
          "bounciness": 0.1,
          "kneeBend": 1.5,
          "armSpan": 0.1,
          "spineRotation": 0.1,
          "stepWidth": 0.2,
          "armRotation": 0
        },
        "run": {
          "speed": 18,
          "legAmplitude": 1,
          "armAmplitude": 1.2,
          "bodyLean": 0.3,
          "kneeBend": 1.8,
          "armSpan": 0.2,
          "spineRotation": 0.2,
          "stepWidth": 0.3,
          "armRotation": 0
        },
        "attack": {
          "speedMult": 0.75,
          "windupRatio": 0.35,
          "intensity": 1.5,
          "decay": 0.5,
          "recoil": 0.4,
          "legSpread": 0.7,
          "kneeBend": 0.25,
          "animType": "melee",
          "allowMovement": true,
          "linkedActionId": "action_attack_iqd2919j0"
        }
      },
      "compatibleStyles": [
        CombatStyle.MELEE_1H
      ]
    },
    {
      "id": "proc_walk_y0wt9jso9",
      "name": "步行 (Custom)",
      "category": "walk",
      "config": {
        "idle": {
          "speed": 2,
          "amplitude": 0.05,
          "sway": 0.02,
          "headBob": 0.05
        },
        "walk": {
          "speed": 11.5,
          "legAmplitude": 0.9,
          "armAmplitude": 0.6,
          "bounciness": 0.04,
          "kneeBend": 1,
          "armSpan": 0.2,
          "spineRotation": 0.1,
          "stepWidth": 0.3,
          "armRotation": 0.5,
          "linkedActionId": "ai_action_ytdaimdjr"
        },
        "run": {
          "speed": 18,
          "legAmplitude": 1,
          "armAmplitude": 1.2,
          "bodyLean": 0.3,
          "kneeBend": 1.8,
          "armSpan": 0.2,
          "spineRotation": 0.2,
          "stepWidth": 0.3,
          "armRotation": 0
        },
        "attack": {
          "speedMult": 0.6,
          "windupRatio": 0.35,
          "intensity": 1.5,
          "decay": 0.5,
          "recoil": 0.4,
          "legSpread": 0.7,
          "kneeBend": 0.25,
          "animType": "melee",
          "allowMovement": false,
          "linkedActionId": "action_attack_2sfnlrfjk"
        }
      }
    }
];

// ------------------------------------------------------------------
// DATA EXPORTS
// ------------------------------------------------------------------

export const DEFAULT_CONFIG: CharacterConfig = {
  name: 'New Hero',
  className: 'none',
  skinColor: '#fca5a5',
  bodyColor: '#374151',
  limbColor: '#9ca3af',
  hairColor: '#1f2937',
  hairStyle: 'bald',
  headStyle: 'box',
  eyeStyle: 'dot',
  mouthStyle: 'smile',
  
  // Initialize with EXPLICIT Standard IDs to match NATIVE_TEMPLATES
  chestStyle: 'chest_default',
  hipsStyle: 'hips_default',
  upperArmStyle: 'arm_default',
  forearmStyle: 'forearm_default',
  handStyle: 'hand_default',
  thighStyle: 'thigh_default',
  calfStyle: 'calf_default',
  footStyle: 'foot_default',

  dimensions: {
      bodyScale: 1.0,
      bodyWidth: 1.0,
      bodyHeight: 1.0,
      headScale: 1.0,
      headWidth: 1.0,
      headHeight: 1.0
  },
  gear: {
      weapon: 'none', 
      shield: 'none',
      helm: 'none',
      mask: 'none'
  },
  stats: {
      strength: 10,
      agility: 10,
      intelligence: 10,
      vitality: 10
  },
  skills: [],
  actionSet: {}, // Empty defaults, will fallback to procedural logic
  backstory: ''
};

export const NATIVE_TEMPLATES: Record<string, ModelPrimitive[]> = {
    'chest_default': [{ id: 'c1', type: 'box', position: [0,0,0], rotation: [0,0,0], scale: [1,1,1], color: '#374151' }],
    'hips_default': [{ id: 'h1', type: 'box', position: [0,0,0], rotation: [0,0,0], scale: [1,1,1], color: '#374151' }],
    'arm_default': [{ id: 'a1', type: 'box', position: [0,-0.175,0], rotation: [0,0,0], scale: [0.18, 0.35, 0.18], color: '#9ca3af' }],
    'forearm_default': [{ id: 'fa1', type: 'box', position: [0,-0.175,0], rotation: [0,0,0], scale: [0.16, 0.35, 0.16], color: '#9ca3af' }],
    'hand_default': [{ id: 'hd1', type: 'box', position: [0,0,0], rotation: [0,0,0], scale: [0.15, 0.15, 0.15], color: '#fca5a5' }],
    'thigh_default': [{ id: 't1', type: 'box', position: [0,-0.225,0], rotation: [0,0,0], scale: [0.2, 0.45, 0.2], color: '#9ca3af' }],
    'calf_default': [{ id: 'cf1', type: 'box', position: [0,-0.225,0], rotation: [0,0,0], scale: [0.18, 0.45, 0.18], color: '#9ca3af' }],
    'foot_default': [{ id: 'ft1', type: 'box', position: [0,-0.1,0.05], rotation: [0,0,0], scale: [0.22, 0.15, 0.3], color: '#1f2937' }],
};

export const INITIAL_GEAR_TRANSFORMS: GearTransformMap = {};
export const INITIAL_ASSET_TRANSFORMS: AssetTransformMap = {};

export const INITIAL_CUSTOM_MODELS: CustomModel[] = [
  {
    "id": "sword_basic",
    "name": "新手长剑",
    "category": "weapon",
    "subCategory": "one_handed",
    "parts": [
      {
        "id": "b1",
        "type": "box",
        "position": [
          -0.08423265412176452,
          0.1505659503695511,
          0.7808515139251003
        ],
        "rotation": [
          -1.5596000000000099,
          1.4039000000000015,
          2.9339980616618173
        ],
        "scale": [
          0.12000000000000001,
          1.0999999999999999,
          0.05000000000000002
        ],
        "color": "#cbd5e1",
        "groupId": "r26p35hc2"
      },
      {
        "id": "g1",
        "type": "box",
        "position": [
          -0.0653360092111517,
          0.044861670891445556,
          0.24143010898167694
        ],
        "rotation": [
          -1.5595999999999968,
          1.4038999999999988,
          2.933998061661809
        ],
        "scale": [
          0.3999999999999998,
          0.04999999999999998,
          0.10000000000000002
        ],
        "color": "#94a3b8",
        "groupId": "r26p35hc2"
      },
      {
        "id": "h1",
        "type": "cylinder",
        "position": [
          -0.06020013731265508,
          0.015948830349149283,
          0.09428504290191346
        ],
        "rotation": [
          -1.5596000000000032,
          1.4039000000000001,
          2.9339980616618124
        ],
        "scale": [
          0.056299999999999996,
          0.5636999999999995,
          0.05630000000000001
        ],
        "color": "#4a2512",
        "groupId": "r26p35hc2"
      },
      {
        "id": "p1",
        "type": "sphere",
        "position": [
          -0.05067897888923721,
          -0.03788636399211702,
          -0.1809655872381722
        ],
        "rotation": [
          -1.5596000000000105,
          1.4039000000000028,
          2.933998061661816
        ],
        "scale": [
          0.11240000000000004,
          0.11240000000000001,
          0.11240000000000006
        ],
        "color": "#94a3b8",
        "groupId": "r26p35hc2"
      }
    ]
  },
  {
    "id": "hammer_war",
    "name": "重型战锤",
    "category": "weapon",
    "subCategory": "one_handed",
    "parts": [
      {
        "id": "h1",
        "type": "box",
        "position": [
          -0.13841124556836637,
          0.17505006833005504,
          1.0524656559401122
        ],
        "rotation": [
          -1.253399999999993,
          1.4022999999999968,
          2.690899999999994
        ],
        "scale": [
          0.3999999999999999,
          0.32119999999999976,
          0.2999999999999998
        ],
        "color": "#64748b",
        "groupId": "vvgcap8lz"
      },
      {
        "id": "s1",
        "type": "cylinder",
        "position": [
          -0.0948112455683664,
          0.09915006833005514,
          0.4613656559401126
        ],
        "rotation": [
          -1.2533999999999947,
          1.4022999999999979,
          2.690899999999995
        ],
        "scale": [
          0.08849999999999998,
          1.6304999999999987,
          0.08849999999999995
        ],
        "color": "#4a2512",
        "groupId": "vvgcap8lz"
      },
      {
        "id": "syi3fj1w6",
        "type": "cylinder",
        "position": [
          -0.15051124556836634,
          0.19245006833005507,
          1.2284656559401124
        ],
        "rotation": [
          -1.253399999999989,
          1.4022999999999968,
          2.690899999999991
        ],
        "scale": [
          0.15449999999999994,
          0.04019999999999998,
          0.1544999999999999
        ],
        "color": "#353841",
        "groupId": "vvgcap8lz"
      }
    ]
  },
  {
    "id": "staff_wand",
    "name": "新手法杖",
    "category": "weapon",
    "subCategory": "one_handed",
    "parts": [
      {
        "id": "s1",
        "type": "cylinder",
        "position": [
          -0.0595,
          0.0425,
          0.192
        ],
        "rotation": [
          1.4359,
          0,
          0
        ],
        "scale": [
          0.0557,
          0.9756,
          0.0557
        ],
        "color": "#52311e",
        "groupId": "g061me2ca"
      },
      {
        "id": "g1",
        "type": "sphere",
        "position": [
          -0.0595,
          0.126,
          0.8071
        ],
        "rotation": [
          1.4359,
          0,
          0
        ],
        "scale": [
          0.2832,
          0.2832,
          0.2832
        ],
        "color": "#1c8eab",
        "groupId": "g061me2ca"
      },
      {
        "id": "wu9iq77m4",
        "type": "cylinder",
        "position": [
          -0.0546,
          0.1074,
          0.6699
        ],
        "rotation": [
          1.4359,
          0,
          0
        ],
        "scale": [
          0.1261,
          0.0336,
          0.1261
        ],
        "color": "#72601d",
        "groupId": "g061me2ca"
      }
    ]
  },
  {
    "id": "book_spell",
    "name": "魔法书",
    "category": "weapon",
    "subCategory": "one_handed",
    "parts": [
      {
        "id": "b1",
        "type": "box",
        "position": [
          -0.06969552107303995,
          -0.11642378578665886,
          0.08838942428646437
        ],
        "rotation": [
          1.7840744484628956,
          -1.3847257058592686,
          -2.6938405476940375
        ],
        "scale": [
          0.29989999999999994,
          0.3998999999999998,
          0.09990000000000002
        ],
        "color": "#3b4081",
        "groupId": "913e1f0mi"
      },
      {
        "id": "p1",
        "type": "box",
        "position": [
          -0.07297552652463624,
          -0.09725542323325327,
          0.08369097334400513
        ],
        "rotation": [
          1.784040744372185,
          -1.384711807650252,
          -2.693688989946637
        ],
        "scale": [
          0.27990000000000004,
          0.37989999999999996,
          0.08000000000000003
        ],
        "color": "#cac5af",
        "groupId": "913e1f0mi"
      },
      {
        "id": "xx49pm9pf",
        "type": "box",
        "position": [
          -0.08705016246847354,
          -0.11960585225068258,
          0.08774842892420501
        ],
        "rotation": [
          1.7840407443721817,
          -1.3847118076502545,
          -1.9522889899466458
        ],
        "scale": [
          0.12149999999999991,
          0.1211999999999999,
          0.0782
        ],
        "color": "#915f30",
        "groupId": "913e1f0mi"
      }
    ]
  },
  {
    "id": "daggers_basic",
    "name": "双匕首",
    "category": "weapon",
    "subCategory": "two_handed",
    "parts": [
      {
        "id": "b1",
        "type": "box",
        "position": [
          -0.08964021301355275,
          0.11502132436495519,
          0.6042075871668716
        ],
        "rotation": [
          -1.7184000000000053,
          1.5024000000000033,
          -3.1414999999999984
        ],
        "scale": [
          0.09680000000000002,
          0.7427,
          0.024199999999999992
        ],
        "color": "#989ea4",
        "groupId": "6v3kbjvnj"
      },
      {
        "id": "h1",
        "type": "cylinder",
        "position": [
          -0.08964021301355275,
          0.040921324364955186,
          0.10560758716687167
        ],
        "rotation": [
          -1.7184000000000026,
          1.5024000000000017,
          3.1415000000000033
        ],
        "scale": [
          0.0446,
          0.4769999999999999,
          0.04459999999999999
        ],
        "color": "#1e293b",
        "groupId": "6v3kbjvnj"
      },
      {
        "id": "ju5hhuzh1",
        "type": "box",
        "position": [
          -0.09004021301355276,
          0.06202132436495518,
          0.20980758716687165
        ],
        "rotation": [
          -1.718400000000006,
          1.5024000000000048,
          -3.1414999999999975
        ],
        "scale": [
          0.19099999999999998,
          0.07389999999999997,
          0.05729999999999999
        ],
        "color": "#595959",
        "groupId": "6v3kbjvnj"
      }
    ]
  },
  {
    "id": "bow_long",
    "name": "长弓",
    "category": "weapon",
    "subCategory": "two_handed",
    "parts": [
      {
        "id": "wm61j1hxb",
        "type": "box",
        "position": [
          -0.07710728607639353,
          0.3442253316490718,
          0.6162782180574288
        ],
        "rotation": [
          -1.0311975847041643,
          0,
          0
        ],
        "scale": [
          0.06989915136269718,
          0.0698991513626972,
          0.5471057920570425
        ],
        "color": "#462c14",
        "groupId": "x5jqfyn6c"
      },
      {
        "id": "2caayxye3",
        "type": "box",
        "position": [
          -0.07710728607639353,
          0.09365024738340987,
          -0.8179305812621419
        ],
        "rotation": [
          -0.2512055834683284,
          0,
          0
        ],
        "scale": [
          0.06989915136269718,
          0.06989915136269717,
          0.1761474785299028
        ],
        "color": "#462c14",
        "groupId": "x5jqfyn6c"
      },
      {
        "id": "udtsyth7r",
        "type": "box",
        "position": [
          -0.07710728607639353,
          0.02567936361378446,
          -0.4910395692099025
        ],
        "rotation": [
          0.3415469761438626,
          0,
          0
        ],
        "scale": [
          0.06989915136269718,
          0.0698991513626972,
          0.5471057920570427
        ],
        "color": "#462c14",
        "groupId": "x5jqfyn6c"
      },
      {
        "id": "6bl6hl8i5",
        "type": "box",
        "position": [
          -0.07710728607639353,
          0.03070663862312158,
          0.11965497765042345
        ],
        "rotation": [
          -0.25120558346832844,
          0,
          0
        ],
        "scale": [
          0.06989915136269718,
          0.06989915136269717,
          0.7761314878878228
        ],
        "color": "#462c14",
        "groupId": "x5jqfyn6c"
      },
      {
        "id": "21x5hbici",
        "type": "box",
        "position": [
          -0.07710728607639353,
          0.5821401951460583,
          0.8253241600803334
        ],
        "rotation": [
          -0.2512055834683284,
          0,
          0
        ],
        "scale": [
          0.06989915136269718,
          0.06989915136269717,
          0.1761474785299028
        ],
        "color": "#462c14",
        "groupId": "x5jqfyn6c"
      }
    ]
  },
  {
    "id": "custom_bow_user_01",
    "name": "小短弓",
    "category": "weapon",
    "subCategory": "two_handed",
    "parts": [
      {
        "id": "4od7cvpeq",
        "type": "box",
        "position": [
          -0.07139291819980571,
          0.23945643132717886,
          0.4497726585707148
        ],
        "rotation": [
          0.4892479747174307,
          0,
          0
        ],
        "scale": [
          0.06351396790008403,
          0.2858128555503781,
          0.06351396790008405
        ],
        "color": "#742525",
        "groupId": "3ls5b0z4c"
      },
      {
        "id": "vnifg5oan",
        "type": "cylinder",
        "position": [
          -0.07139291819980571,
          0.052080097972394136,
          0.0612635826925321
        ],
        "rotation": [
          1.3592479747174306,
          0,
          0
        ],
        "scale": [
          0.10162234864013445,
          0.6923022501109162,
          0.10162234864013445
        ],
        "color": "#742525",
        "groupId": "3ls5b0z4c"
      },
      {
        "id": "o9r1t2v0j",
        "type": "box",
        "position": [
          -0.06694694044679979,
          0.058083010017200114,
          -0.3947608120412933
        ],
        "rotation": [
          -1.1007520252825693,
          0,
          0
        ],
        "scale": [
          0.07621676148010083,
          0.3302726330804371,
          0.07621676148010083
        ],
        "color": "#742525",
        "groupId": "3ls5b0z4c"
      },
      {
        "id": "928dj2pdm",
        "type": "sphere",
        "position": [
          -0.07139291819980571,
          0.13697713188635136,
          -0.5416285883244536
        ],
        "rotation": [
          1.3592479747174306,
          0,
          0
        ],
        "scale": [
          0.15878491975021006,
          0.15878491975021009,
          0.15878491975021009
        ],
        "color": "#8c6e28",
        "groupId": "3ls5b0z4c"
      },
      {
        "id": "3pz5ffiwr",
        "type": "sphere",
        "position": [
          -0.05869012461978891,
          0.36502753662169213,
          0.5202480548715269
        ],
        "rotation": [
          1.3592479747174306,
          0,
          0
        ],
        "scale": [
          0.15878491975021006,
          0.15878491975021009,
          0.15878491975021009
        ],
        "color": "#8c6e28",
        "groupId": "3ls5b0z4c"
      }
    ]
  },
  {
    "id": "shield_round",
    "name": "木制圆盾",
    "category": "shield",
    "subCategory": "shield",
    "parts": [
      {
        "id": "b1",
        "type": "cylinder",
        "position": [
          0.2386,
          0.1075,
          0.0215
        ],
        "rotation": [
          1.579,
          -0.088,
          -1.4686
        ],
        "scale": [
          0.9261,
          0.0707,
          0.9261
        ],
        "color": "#623617",
        "groupId": "iq6hdgsgz"
      },
      {
        "id": "r1",
        "type": "torus",
        "position": [
          0.2394,
          0.1075,
          0.0216
        ],
        "rotation": [
          0.7218,
          1.4355,
          -0.7181
        ],
        "scale": [
          0.7259,
          0.7259,
          0.1604
        ],
        "color": "#737373",
        "groupId": "iq6hdgsgz"
      },
      {
        "id": "boss",
        "type": "sphere",
        "position": [
          0.2733,
          0.1044,
          0.025
        ],
        "rotation": [
          0.7218,
          1.4355,
          -0.7181
        ],
        "scale": [
          0.2238,
          0.2238,
          0.1065
        ],
        "color": "#525252",
        "groupId": "iq6hdgsgz"
      }
    ]
  },
  {
    "id": "shield_square",
    "name": "守卫方盾",
    "category": "shield",
    "subCategory": "shield",
    "parts": [
      {
        "id": "b1",
        "type": "box",
        "position": [
          0.2273,
          0.2027,
          -0.0096
        ],
        "rotation": [
          -2.7015,
          -1.4851,
          -2.7029
        ],
        "scale": [
          0.6244,
          0.8742,
          0.0624
        ],
        "color": "#6c3e23",
        "groupId": "9q0qrrisj"
      },
      {
        "id": "rim",
        "type": "box",
        "position": [
          0.2025,
          0.2036,
          -0.0115
        ],
        "rotation": [
          -2.7015,
          -1.4851,
          -2.7029
        ],
        "scale": [
          0.6868,
          0.9366,
          0.0249
        ],
        "color": "#422a1f",
        "groupId": "9q0qrrisj"
      },
      {
        "id": "9smbgulqw",
        "type": "box",
        "position": [
          0.2309,
          0.5681,
          0.2356
        ],
        "rotation": [
          -2.7015,
          -1.4851,
          -2.7029
        ],
        "scale": [
          0.1564,
          0.1511,
          0.048
        ],
        "color": "#46423f",
        "groupId": "9q0qrrisj"
      },
      {
        "id": "die67fz66",
        "type": "box",
        "position": [
          0.2684,
          0.5681,
          -0.2476
        ],
        "rotation": [
          0.457,
          1.4881,
          -0.4556
        ],
        "scale": [
          0.1564,
          0.1511,
          0.048
        ],
        "color": "#46423f",
        "groupId": "9q0qrrisj"
      },
      {
        "id": "be6ls7arz",
        "type": "box",
        "position": [
          0.2093,
          -0.1642,
          0.2291
        ],
        "rotation": [
          0.3864,
          1.4739,
          -0.3852
        ],
        "scale": [
          0.1564,
          0.1511,
          0.048
        ],
        "color": "#46423f",
        "groupId": "9q0qrrisj"
      },
      {
        "id": "6k8vvrm89",
        "type": "box",
        "position": [
          0.2411,
          -0.164,
          -0.2505
        ],
        "rotation": [
          -2.7667,
          -1.4711,
          -2.7678
        ],
        "scale": [
          0.1564,
          0.1511,
          0.048
        ],
        "color": "#46423f",
        "groupId": "9q0qrrisj"
      }
    ]
  },
  {
    "id": "shield_kite",
    "name": "骑士鸢盾",
    "category": "shield",
    "subCategory": "shield",
    "parts": [
      {
        "id": "b1",
        "type": "box",
        "position": [
          0.2599,
          0.3947,
          -0.0009
        ],
        "rotation": [
          1.6223,
          1.4972,
          -1.6225
        ],
        "scale": [
          0.7951,
          0.6361,
          0.0795
        ],
        "color": "#1e3a8a",
        "groupId": "m4qhb67md"
      },
      {
        "id": "b2",
        "type": "box",
        "position": [
          0.2132,
          -0.2396,
          -0.0008
        ],
        "rotation": [
          1.6223,
          1.4972,
          -0.8375
        ],
        "scale": [
          0.5566,
          0.5566,
          0.0795
        ],
        "color": "#1e3a8a",
        "groupId": "m4qhb67md"
      },
      {
        "id": "c1",
        "type": "box",
        "position": [
          0.2524,
          0.0763,
          -0.0009
        ],
        "rotation": [
          1.6223,
          1.4972,
          -1.6225
        ],
        "scale": [
          0.7951,
          0.0795,
          0.0795
        ],
        "color": "#fcd34d",
        "groupId": "m4qhb67md"
      },
      {
        "id": "c2",
        "type": "box",
        "position": [
          0.2524,
          0.0763,
          -0.0009
        ],
        "rotation": [
          1.6223,
          1.4972,
          -0.0525
        ],
        "scale": [
          0.9542,
          0.0795,
          0.0795
        ],
        "color": "#fcd34d",
        "groupId": "m4qhb67md"
      }
    ]
  },
  {
    "id": "box",
    "name": "标准方头",
    "category": "character_part",
    "subCategory": "head",
    "parts": [
      {
        "id": "h1",
        "type": "box",
        "position": [
          0,
          0.028800122355935986,
          0
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.5,
          0.5,
          0.5
        ],
        "color": "#fca5a5"
      }
    ]
  },
  {
    "id": "chest_default",
    "name": "标准胸腔",
    "category": "character_part",
    "subCategory": "chest",
    "parts": [
      {
        "id": "c1",
        "type": "box",
        "position": [
          0,
          0.031045221647557377,
          -0.003699324423807893
        ],
        "rotation": [
          -0.1186,
          0,
          0
        ],
        "scale": [
          0.6313,
          0.5,
          0.3
        ],
        "color": "#374151"
      }
    ]
  },
  {
    "id": "hips_default",
    "name": "标准髋部",
    "category": "character_part",
    "subCategory": "hips",
    "parts": [
      {
        "id": "h1",
        "type": "box",
        "position": [
          0,
          0.05901533891994279,
          0.011172444234534779
        ],
        "rotation": [
          0.1871,
          0,
          0
        ],
        "scale": [
          0.45,
          0.3,
          0.28
        ],
        "color": "#374151"
      }
    ]
  },
  {
    "id": "arm_default",
    "name": "标准大臂",
    "category": "character_part",
    "subCategory": "upper_arm",
    "parts": [
      {
        "id": "ua1",
        "type": "box",
        "position": [
          0.079,
          -0.0906,
          -0.04377966784432197
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.18,
          0.35,
          0.18
        ],
        "color": "#9ca3af"
      }
    ]
  },
  {
    "id": "forearm_default",
    "name": "标准小臂",
    "category": "character_part",
    "subCategory": "forearm",
    "parts": [
      {
        "id": "fa1",
        "type": "box",
        "position": [
          0.0829,
          -0.0799,
          0
        ],
        "rotation": [
          -0.2380528643663767,
          0,
          0
        ],
        "scale": [
          0.16,
          0.35,
          0.16
        ],
        "color": "#9ca3af"
      }
    ]
  },
  {
    "id": "hand_default",
    "name": "标准手掌",
    "category": "character_part",
    "subCategory": "hand",
    "parts": [
      {
        "id": "hd1",
        "type": "box",
        "position": [
          0.0867,
          0.05896833018530742,
          0.05008957653508059
        ],
        "rotation": [
          -0.26639208933073033,
          0,
          0
        ],
        "scale": [
          0.1772,
          0.1772,
          0.1772
        ],
        "color": "#fca5a5"
      }
    ]
  },
  {
    "id": "thigh_default",
    "name": "标准大腿",
    "category": "character_part",
    "subCategory": "thigh",
    "parts": [
      {
        "id": "t1",
        "type": "box",
        "position": [
          0,
          -0.17666351163763205,
          -0.010802075958381572
        ],
        "rotation": [
          0.1181,
          0,
          0
        ],
        "scale": [
          0.2,
          0.45,
          0.2
        ],
        "color": "#9ca3af"
      }
    ]
  },
  {
    "id": "calf_default",
    "name": "标准小腿",
    "category": "character_part",
    "subCategory": "calf",
    "parts": [
      {
        "id": "cf1",
        "type": "box",
        "position": [
          0,
          -0.16733998917920043,
          -0.0524
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.18,
          0.45,
          0.18
        ],
        "color": "#9ca3af"
      }
    ]
  },
  {
    "id": "foot_default",
    "name": "标准脚掌",
    "category": "character_part",
    "subCategory": "foot",
    "parts": [
      {
        "id": "ft1",
        "type": "box",
        "position": [
          0,
          0.0724,
          -0.0121
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.22,
          0.15,
          0.3
        ],
        "color": "#1f2937"
      }
    ]
  },
  {
    "id": "dot",
    "name": "豆豆眼",
    "category": "character_part",
    "subCategory": "eye",
    "parts": [
      {
        "id": "e1",
        "type": "sphere",
        "position": [
          -0.109,
          0.078,
          0.253
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.05,
          0.05,
          0.05
        ],
        "color": "#000000"
      },
      {
        "id": "5g2j9jkrw",
        "type": "sphere",
        "position": [
          0.109,
          0.078,
          0.253
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.05,
          0.05,
          0.05
        ],
        "color": "#000000"
      }
    ]
  },
  {
    "id": "line",
    "name": "眯眯眼",
    "category": "character_part",
    "subCategory": "eye",
    "parts": [
      {
        "id": "l1",
        "type": "box",
        "position": [
          -0.1127,
          0.0608,
          0.2573
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.1,
          0.02,
          0.02
        ],
        "color": "#000000"
      },
      {
        "id": "zr8vjrfxh",
        "type": "box",
        "position": [
          0.1127,
          0.0608,
          0.2573
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.1,
          0.02,
          0.02
        ],
        "color": "#000000"
      }
    ]
  },
  {
    "id": "big",
    "name": "大眼睛",
    "category": "character_part",
    "subCategory": "eye",
    "parts": [
      {
        "id": "b1",
        "type": "cylinder",
        "position": [
          -0.1332,
          0.0494,
          0.2562
        ],
        "rotation": [
          1.57,
          0,
          0
        ],
        "scale": [
          0.0906,
          0.0302,
          0.0906
        ],
        "color": "#ffffff"
      },
      {
        "id": "b2",
        "type": "cylinder",
        "position": [
          -0.1332,
          0.0494,
          0.2712
        ],
        "rotation": [
          1.57,
          0,
          0
        ],
        "scale": [
          0.0579,
          0.0193,
          0.0579
        ],
        "color": "#000000"
      },
      {
        "id": "gkwpnx1gs",
        "type": "cylinder",
        "position": [
          0.1332,
          0.0494,
          0.2562
        ],
        "rotation": [
          1.57,
          0,
          0
        ],
        "scale": [
          0.0906,
          0.0302,
          0.0906
        ],
        "color": "#ffffff"
      },
      {
        "id": "i9opct4ma",
        "type": "cylinder",
        "position": [
          0.1332,
          0.0494,
          0.2712
        ],
        "rotation": [
          1.57,
          0,
          0
        ],
        "scale": [
          0.0579,
          0.0193,
          0.0579
        ],
        "color": "#000000"
      }
    ]
  },
  {
    "id": "custom_eyes_toon_01",
    "name": "卡通大眼",
    "category": "character_part",
    "subCategory": "eye",
    "parts": [
      {
        "id": "o9ob8cvuf",
        "type": "sphere",
        "position": [
          -0.12,
          0.0484,
          0.26
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.15,
          0.15,
          0.15
        ],
        "color": "#cccccc"
      },
      {
        "id": "ex56z71bw",
        "type": "sphere",
        "position": [
          -0.15,
          0.0784,
          0.3
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.05,
          0.05,
          0.05
        ],
        "color": "#1e0a0a"
      },
      {
        "id": "37l7vyv50",
        "type": "sphere",
        "position": [
          0.1115,
          0.0484,
          0.26
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.15,
          0.15,
          0.15
        ],
        "color": "#cccccc"
      },
      {
        "id": "farg5snwv",
        "type": "sphere",
        "position": [
          0.1215,
          0.0284,
          0.33
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.05,
          0.05,
          0.05
        ],
        "color": "#1e0a0a"
      }
    ]
  },
  {
    "id": "smile",
    "name": "微笑",
    "category": "character_part",
    "subCategory": "mouth",
    "parts": [
      {
        "id": "m1",
        "type": "torus",
        "position": [
          -0.0001,
          -0.1036,
          0.2489
        ],
        "rotation": [
          0,
          0,
          3.14
        ],
        "scale": [
          0.1,
          0.1,
          0.1
        ],
        "color": "#af4b4b"
      }
    ]
  },
  {
    "id": "sausage",
    "name": "香肠嘴",
    "category": "character_part",
    "subCategory": "mouth",
    "parts": [
      {
        "id": "s1",
        "type": "capsule",
        "position": [
          -0.00009,
          -0.1242,
          0.2487
        ],
        "rotation": [
          0,
          0,
          1.57
        ],
        "scale": [
          0.1216,
          0.1011,
          0.1216
        ],
        "color": "#ef4444"
      },
      {
        "id": "hh87ef5l8",
        "type": "capsule",
        "position": [
          0.00005,
          -0.0742,
          0.2487
        ],
        "rotation": [
          0,
          0,
          -1.57
        ],
        "scale": [
          0.1216,
          0.1216,
          0.1216
        ],
        "color": "#ef4444"
      }
    ]
  },
  {
    "id": "x_shape",
    "name": "X嘴型",
    "category": "character_part",
    "subCategory": "mouth",
    "parts": [
      {
        "id": "x1",
        "type": "box",
        "position": [
          0.0041,
          -0.1221,
          0.2717
        ],
        "rotation": [
          0,
          0,
          0.78
        ],
        "scale": [
          0.1,
          0.02,
          0.02
        ],
        "color": "#000000"
      },
      {
        "id": "x2",
        "type": "box",
        "position": [
          0.0041,
          -0.1221,
          0.2717
        ],
        "rotation": [
          0,
          0,
          -0.78
        ],
        "scale": [
          0.1,
          0.02,
          0.02
        ],
        "color": "#000000"
      }
    ]
  },
  {
    "id": "flat",
    "name": "平头",
    "category": "character_part",
    "subCategory": "hair",
    "parts": [
      {
        "id": "h1",
        "type": "box",
        "position": [
          0,
          0.2455,
          -0.0588
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.55,
          0.15,
          0.55
        ],
        "color": "#333333"
      }
    ]
  },
  {
    "id": "long",
    "name": "长发",
    "category": "character_part",
    "subCategory": "hair",
    "parts": [
      {
        "id": "h1",
        "type": "box",
        "position": [
          0,
          0.24724326141572875,
          0
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.55,
          0.15,
          0.55
        ],
        "color": "#333333",
        "groupId": "zpktdr2dv"
      },
      {
        "id": "h2",
        "type": "box",
        "position": [
          0,
          -0.05655673858427124,
          -0.2772
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.5550683786150415,
          0.6787,
          0.1131
        ],
        "color": "#333333",
        "groupId": "zpktdr2dv"
      }
    ]
  },
  {
    "id": "parted",
    "name": "中分",
    "category": "character_part",
    "subCategory": "hair",
    "parts": [
      {
        "id": "h1",
        "type": "box",
        "position": [
          0.15,
          0.24630737199984248,
          0.03767706777573909
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.25,
          0.15,
          0.55
        ],
        "color": "#333333"
      },
      {
        "id": "h2",
        "type": "box",
        "position": [
          -0.15,
          0.24630737199984248,
          0.03767706777573909
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.25,
          0.15,
          0.55
        ],
        "color": "#333333"
      }
    ]
  },
  {
    "id": "hat_wizard",
    "name": "法师帽",
    "category": "helm",
    "subCategory": "helm",
    "parts": [
      {
        "id": "c1",
        "type": "cone",
        "position": [
          0.0107,
          0.6191,
          -0.1428
        ],
        "rotation": [
          -0.2595,
          0,
          0
        ],
        "scale": [
          0.8992,
          0.9096,
          0.8493
        ],
        "color": "#4c1d95"
      },
      {
        "id": "r1",
        "type": "cylinder",
        "position": [
          0.0107,
          0.1815,
          -0.0266
        ],
        "rotation": [
          -0.2595,
          0,
          0
        ],
        "scale": [
          1.1851,
          0.0252,
          1.1851
        ],
        "color": "#4c1d95",
        "groupId": "oi2egwy9h"
      }
    ]
  },
  {
    "id": "hat_hood",
    "name": "游侠兜帽",
    "category": "helm",
    "subCategory": "helm",
    "parts": [
      {
        "id": "nfkae2i0a",
        "type": "cylinder",
        "position": [
          0,
          0.29522090894164504,
          0
        ],
        "rotation": [
          0,
          0.41320000000000007,
          0
        ],
        "scale": [
          1.0062,
          0.026399999999999996,
          0.8943999999999996
        ],
        "color": "#1b4630",
        "groupId": "3hle3yef9"
      },
      {
        "id": "2a5xunnb0",
        "type": "cylinder",
        "position": [
          0,
          0.43582090894164505,
          0
        ],
        "rotation": [
          0,
          0.41319999999999996,
          0
        ],
        "scale": [
          0.5434,
          0.27469999999999994,
          0.5500999999999999
        ],
        "color": "#1b4630",
        "groupId": "3hle3yef9"
      },
      {
        "id": "yef3l8w8u",
        "type": "plane",
        "position": [
          0.3061,
          0.564320908941645,
          -0.1649
        ],
        "rotation": [
          -0.021399999999999888,
          1.0255,
          -0.42360000000000014
        ],
        "scale": [
          0.060299999999999986,
          0.5457,
          0.5685
        ],
        "color": "#cccccc",
        "groupId": "3hle3yef9"
      },
      {
        "id": "j9vmzwtzh",
        "type": "plane",
        "position": [
          0.2955,
          0.455520908941645,
          -0.22309999999999997
        ],
        "rotation": [
          0.8862,
          1.2766000000000004,
          -1.4456999999999995
        ],
        "scale": [
          0.06159999999999997,
          0.37279999999999996,
          0.5550999999999999
        ],
        "color": "#cccccc",
        "groupId": "3hle3yef9"
      }
    ]
  },
  {
    "id": "helm_plate",
    "name": "板甲头盔",
    "category": "helm",
    "subCategory": "helm",
    "parts": [
      {
        "id": "b1",
        "type": "box",
        "position": [
          0,
          0.03280432654854337,
          0
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.5499999999999999,
          0.5499999999999999,
          0.5499999999999999
        ],
        "color": "#676c74",
        "groupId": "3nzv8io89"
      },
      {
        "id": "v1",
        "type": "box",
        "position": [
          0,
          0.03280432654854337,
          0.27999999999999997
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.6018999999999999,
          0.19999999999999998,
          0.049999999999999996
        ],
        "color": "#2b3340",
        "groupId": "3nzv8io89"
      }
    ]
  },
  {
    "id": "hat_mask",
    "name": "刺客面罩",
    "category": "mask",
    "subCategory": "mask",
    "parts": [
      {
        "id": "m1",
        "type": "cylinder",
        "position": [
          -0.2578,
          -0.1185,
          0.2559
        ],
        "rotation": [
          0,
          0,
          1.57
        ],
        "scale": [
          0.1728,
          0.0808,
          0.1728
        ],
        "color": "#323c5a",
        "groupId": "d7vjrkxwz"
      },
      {
        "id": "975h4giza",
        "type": "box",
        "position": [
          0,
          -0.1184,
          0.275
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": [
          0.5334,
          0.2157,
          0.0832
        ],
        "color": "#332f46",
        "groupId": "d7vjrkxwz"
      },
      {
        "id": "erxu2x3eg",
        "type": "cylinder",
        "position": [
          0.2578,
          -0.1185,
          0.2559
        ],
        "rotation": [
          0,
          0,
          -1.57
        ],
        "scale": [
          0.1728,
          0.0808,
          0.1728
        ],
        "color": "#323c5c",
        "groupId": "d7vjrkxwz"
      }
    ]
  }
];

export const INITIAL_CUSTOM_ACTIONS: CustomAction[] = [
    {
      "id": "action_idle_base",
      "name": "基本待机",
      "category": "idle",
      "duration": 2,
      "loop": true,
      "interpolation": "easeInOut",
      "keyframes": [
        {
          "time": 0,
          "boneRotations": {
            "arm_left": [
              0,
              0,
              0.1
            ],
            "arm_right": [
              0,
              0,
              -0.1
            ]
          }
        },
        {
          "time": 0.5,
          "boneRotations": {
            "arm_left": [
              0,
              0,
              0.15
            ],
            "arm_right": [
              0,
              0,
              -0.15
            ]
          }
        },
        {
          "time": 1,
          "boneRotations": {
            "arm_left": [
              0,
              0,
              0.1
            ],
            "arm_right": [
              0,
              0,
              -0.1
            ]
          }
        }
      ]
    },
    {
      "id": "ai_action_ly7qx6jjq",
      "name": "战斗待机",
      "category": "idle",
      "duration": 1,
      "loop": true,
      "interpolation": "linear",
      "keyframes": [
        {
          "time": 0,
          "boneRotations": {
            "hips": [
              0.049609900156844536,
              0,
              0.08932896909341104
            ],
            "chest": [
              0.05,
              0,
              -0.08990292047704704
            ],
            "head": [
              0,
              0,
              0
            ],
            "arm_left": [
              -0.2,
              0.3,
              0.2
            ],
            "forearm_left": [
              -0.5,
              0,
              0
            ],
            "hand_left": [
              0,
              0,
              0.0448884612726528
            ],
            "arm_right": [
              -0.2,
              -0.3,
              -0.2
            ],
            "forearm_right": [
              -0.5,
              0,
              0
            ],
            "hand_right": [
              0,
              0,
              0
            ],
            "thigh_left": [
              -0.5049564350966856,
              0.14522180903271015,
              0.1441253350843266
            ],
            "calf_left": [
              0.48274118984869396,
              0,
              -0.08258411261518117
            ],
            "foot_left": [
              0,
              0.1,
              0
            ],
            "thigh_right": [
              -0.5994866335572071,
              -0.6299915421446975,
              -0.646564143590766
            ],
            "calf_right": [
              0.5619510818742858,
              0,
              0
            ],
            "foot_right": [
              -0.16735794830066394,
              -0.009780259900745053,
              0.12115921047092144
            ]
          },
          "bonePositions": {
            "hips": [
              0.001448507624731412,
              0.9838476214771785,
              -0.0008019759193790706
            ]
          }
        },
        {
          "time": 0.51,
          "boneRotations": {
            "chest": [
              0.16726562509374196,
              -0.010546415942319554,
              -0.08928383914620631
            ],
            "head": [
              -0.16398953692079327,
              0,
              0
            ],
            "thigh_right": [
              -0.7181635759344351,
              -0.5501962434530185,
              -0.7127067744451838
            ],
            "thigh_left": [
              -0.6058821326605948,
              0.12999175634206078,
              0.1579815507566261
            ],
            "hand_left": [
              0,
              0,
              0.0448884612726528
            ],
            "calf_left": [
              0.6636051850596496,
              -0.014887956200341676,
              -0.08123405809896016
            ],
            "calf_right": [
              0.8019600822616222,
              0,
              0
            ],
            "foot_right": [
              -0.2533881080503169,
              0.017571976605729116,
              0.11075264448768374
            ],
            "foot_left": [
              -0.08599731001076089,
              0.09963289620186791,
              0.00857493199696293
            ],
            "forearm_left": [
              -0.7980100497576084,
              0,
              0
            ]
          },
          "bonePositions": {
            "hips": [
              0.0035429073631520003,
              0.9604928687817343,
              -0.0019615543206861295
            ]
          }
        },
        {
          "time": 1,
          "boneRotations": {
            "hips": [
              0.049609900156844536,
              0,
              0.08932896909341104
            ],
            "chest": [
              0.05,
              0,
              -0.08990292047704704
            ],
            "head": [
              0,
              0,
              0
            ],
            "arm_left": [
              -0.2,
              0.3,
              0.2
            ],
            "forearm_left": [
              -0.5,
              0,
              0
            ],
            "hand_left": [
              0,
              0,
              0.0448884612726528
            ],
            "arm_right": [
              -0.2,
              -0.3,
              -0.2
            ],
            "forearm_right": [
              -0.5,
              0,
              0
            ],
            "hand_right": [
              0,
              0,
              0
            ],
            "thigh_left": [
              -0.5049564350966856,
              0.14522180903271015,
              0.1441253350843266
            ],
            "calf_left": [
              0.48274118984869396,
              0,
              -0.08258411261518117
            ],
            "foot_left": [
              0,
              0.1,
              0
            ],
            "thigh_right": [
              -0.5994866335572071,
              -0.6299915421446975,
              -0.646564143590766
            ],
            "calf_right": [
              0.5619510818742858,
              0,
              0
            ],
            "foot_right": [
              -0.16735794830066394,
              -0.009780259900745053,
              0.12115921047092144
            ]
          },
          "bonePositions": {
            "hips": [
              0.001448507624731412,
              0.9838476214771785,
              -0.0008019759193790706
            ]
          }
        },
        {
          "time": 1.125,
          "boneRotations": {
            "hips": [
              -0.1,
              0,
              0
            ],
            "chest": [
              0.05,
              0,
              0
            ],
            "head": [
              0,
              0,
              0
            ],
            "arm_left": [
              -0.2,
              0.3,
              0.2
            ],
            "forearm_left": [
              -0.5,
              0,
              0
            ],
            "hand_left": [
              0,
              0,
              0
            ],
            "arm_right": [
              -0.2,
              -0.3,
              -0.2
            ],
            "forearm_right": [
              -0.5,
              0,
              0
            ],
            "hand_right": [
              0,
              0,
              0
            ],
            "thigh_left": [
              -0.7,
              0.1,
              0
            ],
            "calf_left": [
              0.9,
              0,
              0
            ],
            "foot_left": [
              0,
              0.1,
              0
            ],
            "thigh_right": [
              -0.7,
              -0.1,
              0
            ],
            "calf_right": [
              0.9,
              0,
              0
            ],
            "foot_right": [
              0,
              -0.1,
              0
            ]
          }
        },
        {
          "time": 1.5,
          "boneRotations": {
            "hips": [
              0,
              0,
              0
            ],
            "chest": [
              0,
              0,
              0
            ],
            "head": [
              0,
              0,
              0
            ],
            "arm_left": [
              0,
              0,
              0
            ],
            "forearm_left": [
              0,
              0,
              0
            ],
            "hand_left": [
              0,
              0,
              0
            ],
            "arm_right": [
              0,
              0,
              0
            ],
            "forearm_right": [
              0,
              0,
              0
            ],
            "hand_right": [
              0,
              0,
              0
            ],
            "thigh_left": [
              0,
              0,
              0
            ],
            "calf_left": [
              0,
              0,
              0
            ],
            "foot_left": [
              0,
              0,
              0
            ],
            "thigh_right": [
              0,
              0,
              0
            ],
            "calf_right": [
              0,
              0,
              0
            ],
            "foot_right": [
              0,
              0,
              0
            ]
          }
        }
      ]
    },
    {
      "id": "action_attack_2sfnlrfjk",
      "name": "锤击地面",
      "category": "attack",
      "duration": 1,
      "loop": true,
      "interpolation": "linear",
      "keyframes": [
        {
          "time": 0,
          "boneRotations": {
            "arm_right": [
              0,
              0,
              -0.29302085989705556
            ],
            "forearm_right": [
              0,
              0,
              0.5
            ],
            "hips": [
              -0.12491839087985404,
              -0.005061217969417561,
              -0.0006355456774120695
            ],
            "thigh_left": [
              -0.7792675079560488,
              0.0413453820805829,
              0.01929666467093539
            ],
            "arm_left": [
              0.396133070782434,
              0.036351424049608685,
              0.0866778444026687
            ],
            "thigh_right": [
              -0.24659052552252173,
              0,
              0
            ],
            "calf_right": [
              1.4613354319404217,
              -0.015889719743030956,
              -0.024592400507281346
            ],
            "calf_left": [
              0.9401641095136509,
              0.02391619223297692,
              -0.07961474926007442
            ]
          },
          "bonePositions": {
            "hips": [
              -0.00008277146379805938,
              0.8707762917682185,
              0.016226488254907544
            ]
          }
        },
        {
          "time": 0.14,
          "boneRotations": {
            "arm_right": [
              -2.074424820172924,
              0.2583401542415982,
              -0.5633978446063094
            ],
            "chest": [
              -0.046076531636082,
              -0.4008240778699394,
              -1.8840540313581627e-18
            ],
            "thigh_right": [
              -0.006853587538670689,
              0,
              0
            ],
            "forearm_right": [
              0.050228615789499616,
              0.045511645495028216,
              0.7516825570136144
            ],
            "calf_right": [
              1.2680300412219605,
              0,
              0
            ],
            "hand_left": [
              0,
              0,
              0
            ],
            "calf_left": [
              0.767972206536011,
              0,
              0
            ],
            "thigh_left": [
              -0.6970958868807785,
              0,
              0
            ]
          }
        },
        {
          "time": 0.32,
          "boneRotations": {
            "hand_left": [
              0,
              0,
              0
            ],
            "chest": [
              -0.4127621477225602,
              -0.3767017946251311,
              -0.14034795207366235
            ],
            "arm_right": [
              3.0997759837348884,
              0.01114028003778303,
              -0.7969786793823289
            ],
            "forearm_right": [
              0.05022861578949965,
              0.045511645495028244,
              0.5017969393250451
            ],
            "thigh_right": [
              -0.8656290835226219,
              0,
              0
            ],
            "calf_right": [
              1.1282961866544807,
              0.005217591865769418,
              0.021272051753629298
            ],
            "calf_left": [
              0.905451875738474,
              0.015747286185969992,
              -0.01134368487316151
            ],
            "thigh_left": [
              -0.751546050940939,
              0,
              0
            ]
          }
        },
        {
          "time": 0.37,
          "boneRotations": {
            "hand_left": [
              0,
              0,
              0
            ],
            "chest": [
              -0.4127621477225602,
              -0.3767017946251311,
              -0.14034795207366235
            ],
            "arm_right": [
              3.0997759837348884,
              0.01114028003778303,
              -0.7969786793823289
            ],
            "forearm_right": [
              0.05022861578949965,
              0.045511645495028244,
              0.5017969393250451
            ],
            "thigh_right": [
              -0.9747230691354993,
              0,
              0
            ],
            "calf_right": [
              1.1282961866544807,
              0.005217591865769418,
              0.021272051753629298
            ],
            "calf_left": [
              0.7593861132301746,
              0.017230495389958994,
              -0.00893104106131304
            ],
            "thigh_left": [
              -0.6280922814948069,
              0,
              0
            ],
            "foot_left": [
              -0.13954353019813237,
              0,
              0
            ]
          },
          "bonePositions": {}
        },
        {
          "time": 0.47,
          "boneRotations": {
            "arm_left": [
              0,
              0,
              0.08867109278375009
            ],
            "chest": [
              -0.3507768834571439,
              -0.38416050536204044,
              -0.11732501702346979
            ],
            "head": [
              0.13357624666132564,
              0,
              0
            ],
            "arm_right": [
              3.009998097531086,
              0.1514664705500454,
              -0.02188733833340091
            ],
            "forearm_right": [
              -0.7803661823547511,
              -0.03051365301399425,
              0.0892856239750261
            ],
            "hand_left": [
              0,
              0,
              0
            ],
            "thigh_right": [
              0.10565512378114911,
              0,
              0
            ],
            "calf_right": [
              0.7001289363911252,
              0,
              0
            ],
            "thigh_left": [
              -1.3857702713646989,
              0,
              0
            ],
            "calf_left": [
              1.1322287860654114,
              0.023264566937494676,
              -0.026921657856201753
            ]
          }
        },
        {
          "time": 0.5,
          "boneRotations": {
            "chest": [
              0.008857371376596444,
              -0.04191058946236218,
              0.022877802138948654
            ],
            "forearm_right": [
              -0.08303968438826205,
              0.03410513199568726,
              0.08797938893189071
            ],
            "arm_right": [
              -2.3391550231962994,
              0.009027424180782818,
              -0.18114805254804142
            ],
            "hand_left": [
              0,
              0,
              0
            ],
            "thigh_left": [
              -1.2225803035721767,
              0,
              0
            ],
            "calf_left": [
              0.8929324583718405,
              0.021594355118144743,
              -0.027062684428247274
            ],
            "thigh_right": [
              0.4678212818317222,
              0,
              0
            ],
            "calf_right": [
              0.24793564053230863,
              0,
              0
            ],
            "forearm_left": [
              0,
              0,
              0
            ],
            "hips": [
              0.11588988282147265,
              -0.014004585476182793,
              0.0016302401174151662
            ]
          },
          "bonePositions": {
            "hips": [
              -0.0010263805509350243,
              0.8915992979107462,
              0.08314873643985782
            ]
          }
        },
        {
          "time": 0.56,
          "boneRotations": {
            "forearm_right": [
              0.10699049333212438,
              0.0501331406749626,
              0.0799534674095978
            ],
            "chest": [
              0.4739649099991052,
              0.05327033965144678,
              0.09794182984564502
            ],
            "arm_right": [
              -0.7720333680050513,
              -0.1347981696152689,
              -0.0726564199310934
            ],
            "hand_right": [
              0.7055240559474829,
              0,
              0
            ],
            "thigh_left": [
              -1.0884243759185812,
              0,
              0
            ],
            "calf_left": [
              0.7720383099348445,
              0,
              0
            ],
            "thigh_right": [
              0.9047998523715405,
              0,
              0
            ],
            "hand_left": [
              0,
              0,
              0
            ],
            "calf_right": [
              0.8878014873374309,
              0,
              0
            ],
            "hips": [
              0.2981176514777205,
              -0.004875970369005236,
              0.0014982566347648506
            ],
            "arm_left": [
              1.104495474531024,
              0.08399125087694424,
              0.04219980267317029
            ]
          }
        },
        {
          "time": 0.77,
          "boneRotations": {
            "forearm_right": [
              0.10699049333212438,
              0.0501331406749626,
              0.0799534674095978
            ],
            "chest": [
              0.4739649099991052,
              0.05327033965144678,
              0.09794182984564502
            ],
            "arm_right": [
              -0.7720333680050513,
              -0.1347981696152689,
              -0.0726564199310934
            ],
            "hand_right": [
              0.7055240559474829,
              0,
              0
            ],
            "thigh_left": [
              -1.0884243759185812,
              0,
              0
            ],
            "calf_left": [
              0.7720383099348445,
              0,
              0
            ],
            "thigh_right": [
              0.9047998523715405,
              0,
              0
            ],
            "hand_left": [
              0,
              0,
              0
            ],
            "calf_right": [
              0.8878014873374309,
              0,
              0
            ],
            "hips": [
              0.2981176514777205,
              -0.004875970369005236,
              0.0014982566347648506
            ],
            "arm_left": [
              1.104495474531024,
              0.08399125087694424,
              0.04219980267317029
            ]
          },
          "bonePositions": {
            "hips": [
              -0.0010263805509350243,
              0.8915992979107462,
              0.08314873643985782
            ]
          }
        },
        {
          "time": 0.87,
          "boneRotations": {
            "forearm_right": [
              -0.07574377205391239,
              0.03474738208978437,
              0.087728266463255
            ],
            "chest": [
              0.15193673400399704,
              0.019436014839374634,
              0.10974975694600847
            ],
            "arm_right": [
              -0.7720333680050513,
              -0.1347981696152689,
              -0.0726564199310934
            ],
            "hand_right": [
              0.7055240559474829,
              0,
              0
            ],
            "thigh_left": [
              -1.0884243759185812,
              0,
              0
            ],
            "calf_left": [
              0.7720383099348445,
              0,
              0
            ],
            "thigh_right": [
              -0.6625893041021592,
              0,
              0
            ],
            "hand_left": [
              0,
              0,
              0
            ],
            "calf_right": [
              1.3005081487951422,
              -0.011746052923200311,
              -0.026819429080304217
            ],
            "hips": [
              0.2981176514777205,
              -0.004875970369005236,
              0.0014982566347648506
            ],
            "arm_left": [
              0.7294756295560068,
              0.06273445361271408,
              0.07001418690890868
            ],
            "foot_left": [
              -0.009496920603778753,
              0,
              0
            ]
          },
          "bonePositions": {
            "hips": [
              -0.0010263805509350243,
              0.8915992979107462,
              0.08314873643985782
            ]
          }
        },
        {
          "time": 1,
          "boneRotations": {
            "arm_right": [
              0,
              0,
              -0.29302085989705556
            ],
            "forearm_right": [
              0,
              0,
              0.5
            ],
            "hips": [
              -0.12491839087985404,
              -0.005061217969417561,
              -0.0006355456774120695
            ],
            "thigh_left": [
              -0.7792675079560488,
              0.0413453820805829,
              0.01929666467093539
            ],
            "arm_left": [
              0.396133070782434,
              0.036351424049608685,
              0.0866778444026687
            ],
            "thigh_right": [
              -0.24659052552252173,
              0,
              0
            ],
            "calf_right": [
              1.4613354319404217,
              -0.015889719743030956,
              -0.024592400507281346
            ],
            "calf_left": [
              0.9401641095136509,
              0.02391619223297692,
              -0.07961474926007442
            ]
          },
          "bonePositions": {
            "hips": [
              -0.00008277146379805938,
              0.8707762917682185,
              0.016226488254907544
            ]
          }
        }
      ]
    },
    {
      "id": "action_attack_iqd2919j0",
      "name": "横斩",
      "category": "attack",
      "duration": 0.8,
      "loop": true,
      "interpolation": "linear",
      "keyframes": [
        {
          "time": 0,
          "boneRotations": {
            "arm_right": [
              0.09163738797544303,
              0.018547703751375072,
              -0.6688397048953182
            ],
            "forearm_right": [
              0,
              0,
              0.5
            ],
            "thigh_left": [
              -0.8274533394624984,
              0.2025250330275002,
              0.4070069336429727
            ],
            "thigh_right": [
              -1.1679570477821164,
              -0.6552293740257323,
              -1.2956838246040685
            ],
            "calf_right": [
              0.9232799859432821,
              0.2615197327006369,
              0
            ],
            "hand_left": [
              0,
              0,
              0
            ],
            "calf_left": [
              0.8308522897267209,
              0.014069116521025897,
              -0.0030687445497029025
            ],
            "hand_right": [
              0,
              0,
              0
            ],
            "foot_right": [
              0,
              0,
              0
            ],
            "chest": [
              0.05595956689172207,
              0.2620837860687597,
              -0.047421962643817615
            ],
            "head": [
              -0.0049842381842469495,
              0.23092562725799998,
              -0.0007966326540760996
            ]
          },
          "bonePositions": {
            "hips": [
              0,
              0.8576224286836741,
              0
            ]
          }
        },
        {
          "time": 0.05,
          "boneRotations": {
            "chest": [
              0,
              0.3057398481603285,
              0
            ],
            "forearm_right": [
              -0.738794136859838,
              -0.3525125217035361,
              0.36230469166784113
            ],
            "arm_right": [
              0.09163738797544305,
              0.01854770375137506,
              -0.9991990073477677
            ],
            "head": [
              0,
              0.07543996959789104,
              0
            ]
          }
        },
        {
          "time": 0.13,
          "boneRotations": {
            "chest": [
              0,
              0.3057398481603285,
              0
            ],
            "arm_right": [
              -0.021786403520043737,
              0.6832208319096951,
              -1.3881750552616687
            ],
            "forearm_right": [
              -0.8096778736017196,
              -0.1663075617272226,
              0.13723494060146257
            ],
            "head": [
              0,
              0.047585848130961846,
              0
            ]
          }
        },
        {
          "time": 0.19,
          "boneRotations": {
            "arm_right": [
              -2.516722925675162,
              1.0538665497346997,
              0.9563531050347848
            ],
            "forearm_right": [
              -0.2535511902587517,
              -0.13618799519227634,
              0.29857080884009396
            ],
            "hips": [
              0,
              0,
              0
            ],
            "chest": [
              0,
              0.8097904131373365,
              0
            ],
            "head": [
              0,
              -0.3470238718132171,
              0
            ],
            "arm_left": [
              0.15904189320237022,
              0,
              0.39312543069067857
            ],
            "forearm_left": [
              -0.4768315934165545,
              0,
              0
            ],
            "hand_right": [
              0.11863059726922508,
              0.24609834174481793,
              1.7886138199053726e-18
            ]
          }
        },
        {
          "time": 0.23,
          "boneRotations": {
            "chest": [
              0.11141821936033311,
              0.9756826116493047,
              -0.08176285297837543
            ],
            "hand_right": [
              0.14360545985221976,
              0.14038156916363356,
              1.751958050080956e-18
            ],
            "head": [
              0,
              -0.4518931972297114,
              0
            ],
            "forearm_right": [
              -0.6056029457610866,
              -0.07508754653302448,
              0.25768968997037967
            ],
            "hips": [
              0,
              0,
              0
            ],
            "hand_left": [
              0,
              0,
              0
            ]
          }
        },
        {
          "time": 0.27,
          "boneRotations": {
            "arm_right": [
              -2.019123472178562,
              1.3741186447111082,
              0.3710009201304377
            ],
            "thigh_right": [
              -1.1679570477821164,
              -0.6552293740257323,
              -1.2956838246040685
            ],
            "forearm_right": [
              -0.2627156128507858,
              0.018005989209446113,
              0.26758227711893773
            ],
            "arm_left": [
              0.21628782770417493,
              0.023723225777729368,
              0.3924461842479853
            ],
            "chest": [
              0.09294441138734376,
              0.8214178280717298,
              -0.06726522314166994
            ],
            "hand_right": [
              0.3190868086173881,
              0,
              -0.32181798967187836
            ],
            "hand_left": [
              0,
              0,
              0
            ],
            "head": [
              0,
              -0.34082463131086094,
              0
            ]
          }
        },
        {
          "time": 0.31,
          "boneRotations": {
            "chest": [
              0.062006763629143716,
              0.38065868726036783,
              -0.049335445123285616
            ],
            "head": [
              0,
              0.13621961164181534,
              0
            ],
            "forearm_right": [
              0.002822539681447685,
              0.08909855231718355,
              0.25327599938615925
            ],
            "arm_right": [
              -2.3980535282880844,
              1.44800463886025,
              0.6379704052877007
            ],
            "hand_right": [
              0.46936218886155273,
              -0.1020293525776997,
              -0.24265055120227128
            ]
          }
        },
        {
          "time": 0.37,
          "boneRotations": {
            "head": [
              0,
              0.3976778960710085,
              0
            ],
            "arm_right": [
              -0.19693061693333186,
              0.11343072983621538,
              -1.4716057337370798
            ],
            "hand_right": [
              0.8365012091929297,
              -0.18281137480604634,
              -0.18991492160425127
            ],
            "forearm_right": [
              0.0028225396814476884,
              0.08909855231718358,
              0.04973594175602663
            ],
            "chest": [
              0.04369400356644172,
              0.0005600128906994573,
              -0.049324400305142214
            ]
          }
        },
        {
          "time": 0.43,
          "boneRotations": {
            "head": [
              0,
              0.5748399837916558,
              0
            ],
            "arm_right": [
              -0.27894839363907475,
              -0.9066664722386287,
              -1.7625736755295571
            ],
            "forearm_right": [
              0.17152362058069814,
              0.13094515133837847,
              -0.031184850620464128
            ],
            "hand_right": [
              1.021012203678061,
              0,
              0
            ],
            "chest": [
              0.02538124350373974,
              -0.3795386614789688,
              -0.04931335548699902
            ],
            "arm_left": [
              0.46587063065572093,
              0.19114892180155774,
              0.5629485318982813
            ]
          }
        },
        {
          "time": 0.47,
          "boneRotations": {
            "head": [
              0,
              0.5748399837916558,
              0
            ],
            "arm_right": [
              -0.2789483936390748,
              -0.9066664722386287,
              -1.5818188942770859
            ],
            "forearm_right": [
              0.17152362058069814,
              0.13094515133837847,
              -0.031184850620464128
            ],
            "hand_right": [
              1.021012203678061,
              0,
              0
            ],
            "chest": [
              0.02211889220323991,
              -0.43939532356408895,
              -0.05061274708086784
            ],
            "hips": [
              0,
              0,
              0
            ]
          },
          "bonePositions": {
            "hips": [
              0,
              0.8576224286836741,
              0
            ]
          }
        },
        {
          "time": 0.64,
          "boneRotations": {
            "head": [
              0,
              0.5748399837916558,
              0
            ],
            "arm_right": [
              -0.2789483936390748,
              -0.9066664722386287,
              -1.5818188942770859
            ],
            "forearm_right": [
              0.17152362058069814,
              0.13094515133837847,
              -0.031184850620464128
            ],
            "hand_right": [
              1.021012203678061,
              0,
              0
            ],
            "chest": [
              0.02538124350373974,
              -0.3795386614789688,
              -0.04931335548699902
            ]
          },
          "bonePositions": {
            "hips": [
              0,
              0.8576224286836741,
              0
            ]
          }
        },
        {
          "time": 0.73,
          "boneRotations": {
            "arm_right": [
              -0.3701997936490917,
              -0.032461657508033565,
              -1.0234312390510638
            ],
            "chest": [
              0.03741437842374545,
              -0.13552324617637795,
              -0.04622560371691901
            ],
            "head": [
              0,
              0.5295080207424656,
              0
            ],
            "forearm_right": [
              -0.23169144598529565,
              0.13269854256879682,
              0.022530925125713485
            ],
            "arm_left": [
              0.46587063065572093,
              0.19114892180155774,
              0.264276564474852
            ]
          }
        },
        {
          "time": 1,
          "boneRotations": {
            "arm_right": [
              0.09163738797544303,
              0.018547703751375072,
              -0.6688397048953182
            ],
            "forearm_right": [
              0,
              0,
              0.5
            ],
            "thigh_left": [
              -0.8274533394624984,
              0.2025250330275002,
              0.4070069336429727
            ],
            "thigh_right": [
              -1.1679570477821164,
              -0.6552293740257323,
              -1.2956838246040685
            ],
            "calf_right": [
              0.9232799859432821,
              0.2615197327006369,
              0
            ],
            "hand_left": [
              0,
              0,
              0
            ],
            "calf_left": [
              0.8308522897267209,
              0.014069116521025897,
              -0.0030687445497029025
            ],
            "hand_right": [
              0,
              0,
              0
            ],
            "foot_right": [
              0,
              0,
              0
            ],
            "chest": [
              0.05595956689172207,
              0.2620837860687597,
              -0.047421962643817615
            ],
            "head": [
              -0.0049842381842469495,
              0.23092562725799998,
              -0.0007966326540760996
            ]
          },
          "bonePositions": {
            "hips": [
              0,
              0.8576224286836741,
              0
            ]
          }
        }
      ]
    },
    {
      "id": "ai_action_ytdaimdjr",
      "name": "步行",
      "category": "walk",
      "duration": 1,
      "loop": true,
      "interpolation": "linear",
      "keyframes": [
        {
          "time": 0,
          "boneRotations": {
            "hips": [
              -0.1,
              0.05,
              0
            ],
            "chest": [
              0.06994947187009723,
              0.10125478837856766,
              0.006049384033838719
            ],
            "head": [
              0,
              -0.1622410406390022,
              0
            ],
            "arm_left": [
              0.5,
              0,
              0
            ],
            "forearm_left": [
              -0.2,
              0,
              0
            ],
            "hand_left": [
              0,
              0,
              0
            ],
            "arm_right": [
              -0.5,
              0,
              0
            ],
            "forearm_right": [
              -0.2,
              0,
              0
            ],
            "hand_right": [
              0,
              0,
              0
            ],
            "thigh_left": [
              -0.8549121950586727,
              0,
              0
            ],
            "calf_left": [
              0.5948888456086923,
              0,
              0
            ],
            "foot_left": [
              -0.11847614343664373,
              0,
              0
            ],
            "thigh_right": [
              0.5,
              0,
              0
            ],
            "calf_right": [
              0.3040012479328921,
              0,
              0
            ],
            "foot_right": [
              0.14453522483668582,
              0,
              0
            ]
          },
          "bonePositions": {}
        },
        {
          "time": 0.14,
          "boneRotations": {
            "thigh_left": [
              -0.31853091042756176,
              0,
              0
            ],
            "hand_left": [
              0.010473943823842147,
              0,
              0
            ],
            "calf_left": [
              0.21383757442760498,
              0,
              0
            ],
            "thigh_right": [
              0.3679832055611675,
              0,
              0
            ],
            "calf_right": [
              0.9777351339093633,
              0,
              0
            ],
            "foot_left": [
              -0.11218752980100999,
              0,
              0
            ]
          }
        },
        {
          "time": 0.26,
          "boneRotations": {
            "hips": [
              -0.15,
              0,
              0
            ],
            "chest": [
              0.08884265611589233,
              0,
              0
            ],
            "head": [
              0,
              0,
              0
            ],
            "arm_left": [
              0.1591163839877787,
              0,
              0
            ],
            "forearm_left": [
              -0.2,
              0,
              0
            ],
            "hand_left": [
              0,
              0,
              0
            ],
            "arm_right": [
              0.08338658703994459,
              0,
              0
            ],
            "forearm_right": [
              -0.2,
              0,
              0
            ],
            "hand_right": [
              0,
              0,
              0
            ],
            "thigh_left": [
              0.15034386389308008,
              0,
              0
            ],
            "calf_left": [
              0.034324106625087863,
              0,
              0
            ],
            "foot_left": [
              -0.029734347783295676,
              0,
              0
            ],
            "thigh_right": [
              0.09912649883381161,
              0.00013558141001968215,
              0.00033979892600526985
            ],
            "calf_right": [
              0.9613679517390896,
              -0.013336019657001848,
              0.00403869197623752
            ],
            "foot_right": [
              0,
              0,
              0
            ]
          }
        },
        {
          "time": 0.49,
          "boneRotations": {
            "hips": [
              -0.1,
              -0.05,
              0
            ],
            "chest": [
              0.12356493731060204,
              -0.13270199514987466,
              -0.00877611628939968
            ],
            "head": [
              0,
              0.16388499240575133,
              0
            ],
            "arm_left": [
              -0.28777451425275397,
              0,
              0
            ],
            "forearm_left": [
              -0.2,
              0,
              0
            ],
            "hand_left": [
              0,
              0,
              0
            ],
            "arm_right": [
              0.7212488410247849,
              0,
              0
            ],
            "forearm_right": [
              -0.2,
              0,
              0
            ],
            "hand_right": [
              -0.31623124866487556,
              0,
              0
            ],
            "thigh_left": [
              0.5,
              0,
              0
            ],
            "calf_left": [
              0.3246761084296467,
              0,
              0
            ],
            "foot_left": [
              0.08250098333252687,
              0,
              0
            ],
            "thigh_right": [
              -0.8983568046813901,
              -0.0728255465389435,
              -0.014261417378545572
            ],
            "calf_right": [
              0.8,
              0,
              0
            ],
            "foot_right": [
              -0.1010119521596535,
              0,
              0
            ]
          }
        },
        {
          "time": 0.62,
          "boneRotations": {
            "thigh_right": [
              -0.27322086244301635,
              -0.0674239392444808,
              0.031017081598376347
            ],
            "hand_left": [
              -0.0072999869963222205,
              0.0012045574173247602,
              0.0013943021243996748
            ],
            "calf_right": [
              0.11485224833194348,
              0,
              0
            ],
            "thigh_left": [
              0.1461196489891652,
              0,
              0
            ],
            "calf_left": [
              1.0034624350270158,
              0,
              0
            ],
            "hips": [
              -0.12599999999999997,
              -0.024000000000000108,
              0
            ]
          }
        },
        {
          "time": 0.74,
          "boneRotations": {
            "hips": [
              -0.15,
              0,
              0
            ],
            "chest": [
              0.10960522982766306,
              0,
              0
            ],
            "head": [
              0,
              0,
              0
            ],
            "arm_left": [
              -0.13430124998126627,
              0,
              0
            ],
            "forearm_left": [
              -0.2,
              0,
              0
            ],
            "hand_left": [
              0,
              0,
              0
            ],
            "arm_right": [
              0.4,
              0,
              0
            ],
            "forearm_right": [
              -0.2,
              0,
              0
            ],
            "hand_right": [
              0,
              0,
              0
            ],
            "thigh_left": [
              0.1,
              0,
              0
            ],
            "calf_left": [
              0.9267877969093982,
              0,
              0
            ],
            "foot_left": [
              0,
              0,
              0
            ],
            "thigh_right": [
              0.08903678030671175,
              0,
              0
            ],
            "calf_right": [
              0.11211189178345635,
              0,
              0
            ],
            "foot_right": [
              -0.005884257099305962,
              0,
              0
            ]
          }
        },
        {
          "time": 1,
          "boneRotations": {
            "hips": [
              -0.1,
              0.05,
              0
            ],
            "chest": [
              0.06994947187009723,
              0.10125478837856766,
              0.006049384033838719
            ],
            "head": [
              0,
              -0.1622410406390022,
              0
            ],
            "arm_left": [
              0.5,
              0,
              0
            ],
            "forearm_left": [
              -0.2,
              0,
              0
            ],
            "hand_left": [
              0,
              0,
              0
            ],
            "arm_right": [
              -0.5,
              0,
              0
            ],
            "forearm_right": [
              -0.2,
              0,
              0
            ],
            "hand_right": [
              0,
              0,
              0
            ],
            "thigh_left": [
              -0.8549121950586727,
              0,
              0
            ],
            "calf_left": [
              0.5948888456086923,
              0,
              0
            ],
            "foot_left": [
              -0.11847614343664373,
              0,
              0
            ],
            "thigh_right": [
              0.5,
              0,
              0
            ],
            "calf_right": [
              0.3040012479328921,
              0,
              0
            ],
            "foot_right": [
              0.14453522483668582,
              0,
              0
            ]
          },
          "bonePositions": {}
        }
      ]
    }
];

export const isNativeAsset = (id: string | undefined): boolean => {
    if (!id) return false;
    return id.endsWith('_default') || !!NATIVE_TEMPLATES[id] || ['sword_basic', 'hammer_war', 'shield_round', 'helm_plate', 'none', 'box', 'smile', 'dot', 'bald'].includes(id);
};
