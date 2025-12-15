
import { GoogleGenAI, Modality } from "@google/genai";
import { CharacterConfig, ModelPrimitive, CustomAction, AnimationConfig, VfxAsset } from "../types";

// Helper to get API Key safely
const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    console.warn("process.env is not defined");
    return '';
  }
};

let aiClient: GoogleGenAI | null = null;
const getAiClient = () => {
    if (!aiClient) {
        const key = getApiKey();
        if (key) {
            aiClient = new GoogleGenAI({ apiKey: key });
        }
    }
    return aiClient;
};


/**
 * Generates a creative backstory and stats for the character using Thinking Mode
 */
export const generateCharacterLore = async (config: CharacterConfig): Promise<string> => {
  if (!getApiKey()) return "缺少 API Key。";

  try {
    const ai = getAiClient();
    if (!ai) return "AI Client Init Failed";

    const prompt = `为名为"${config.name}"的游戏角色创作一段简短的史诗RPG背景故事（最多100字）和3个关键属性。该角色的职业是${config.className}。装备情况：${config.gear.weapon ? '有武器' : '空手'}，${config.gear.shield !== 'none' ? '有盾牌' : '无盾牌'}。请用中文回答。`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2048 }, // Using thinking for creative writing
      }
    });

    return response.text || "无法生成背景故事。";
  } catch (error) {
    console.error("Lore gen error:", error);
    return "生成背景故事时出错。";
  }
};

/**
 * Generates a texture for the character armor using Gemini Image Gen
 */
export const generateArmorTexture = async (description: string): Promise<string | null> => {
  if (!getApiKey()) return null;

  try {
    const ai = getAiClient();
    if (!ai) return null;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: {
        parts: [{ text: `A seamless texture for low poly fantasy armor, style: ${description}, flat lighting, hand painted style. No text.` }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Texture gen error:", error);
    return null;
  }
};

/**
 * General Chat Assistant for the Engine with Command Capabilities
 */
export const sendEngineChatMessage = async (
    history: { role: string, parts: { text: string }[] }[], 
    message: string,
    context: string // Pass current AppMode/Context
) => {
  if (!getApiKey()) throw new Error("API Key missing");

  try {
    const ai = getAiClient();
    if (!ai) throw new Error("AI init failed");

    const systemPrompt = `
    你是一个名为“PolySprite (灵枢)”的智能游戏引擎助手。你的目标是帮助用户创作游戏资产。
    
    当前用户所处的编辑器环境 (Context): ${context}

    你有能力执行以下操作，如果你判断用户的意图是执行这些操作，请在回复的末尾附加一个JSON命令块，格式如下：
    
    <<<JSON: { "action": "ACTION_NAME", "payload": ... } >>>

    可用的 Action:
    1. GENERATE_MODEL: 生成3D模型。Payload 必须是一个JSON对象: 
       { 
         "description": "模型的视觉描述 (英文)", 
         "category": "分类", 
         "subCategory": "子分类" 
       }
       
       [AssetCategory分类列表]: 'weapon'(武器), 'shield'(盾牌), 'helm'(头盔), 'mask'(面具), 'map_object'(场景物件), 'mob'(怪物), 'character_part'(角色部位)。
       
       [AssetSubCategory子分类列表]:
         - weapon: 'one_handed' (单手), 'two_handed' (双手)
         - map_object: 'structure'(建筑), 'prop'(道具), 'nature'(自然/植物/山石)
         - mob: 'small', 'medium', 'large'
         - character_part: 'head', 'chest', 'hips', 'upper_arm', 'forearm', 'hand', 'thigh', 'calf', 'foot', 'hair', 'eye', 'mouth'
       
       示例: 
       - "做一个红色的剑" -> { "action": "GENERATE_MODEL", "payload": { "description": "low poly red sword", "category": "weapon", "subCategory": "one_handed" } }
       - "造一些小山丘" -> { "action": "GENERATE_MODEL", "payload": { "description": "green hills low poly", "category": "map_object", "subCategory": "nature" } }
       - "做个可爱的史莱姆" -> { "action": "GENERATE_MODEL", "payload": { "description": "cute slime monster", "category": "mob", "subCategory": "small" } }

    2. GENERATE_ANIMATION: 生成动作。Payload 必须是 JSON 对象:
       {
         "description": "动作描述 (英文)",
         "type": "keyframe" | "procedural",
         "category": "idle" | "walk" | "run" | "attack"
       }
       - type="keyframe": 用于具体的、一次性的动作姿态（如：回旋踢、挥手、防御姿势）。
       - type="procedural": 用于持续的、循环的运动风格参数调整（如：僵尸走路、忍者跑、待机呼吸感）。
       
       示例:
       - "做一个回旋踢" -> { "action": "GENERATE_ANIMATION", "payload": { "description": "roundhouse kick", "type": "keyframe", "category": "attack" } }
       - "跑得像个忍者" -> { "action": "GENERATE_ANIMATION", "payload": { "description": "ninja run style", "type": "procedural", "category": "run" } }
       - "做个防御姿势" -> { "action": "GENERATE_ANIMATION", "payload": { "description": "block pose", "type": "keyframe", "category": "idle" } }
    
    3. GENERATE_VFX: 生成特效。Payload: 字符串 (特效描述)。
       示例:
       - "做一个火焰喷射特效" -> { "action": "GENERATE_VFX", "payload": "flamethrower fire stream" }
       - "生成一个治疗光环" -> { "action": "GENERATE_VFX", "payload": "healing green aura ring" }

    4. GENERATE_LORE: 生成背景故事。Payload: 空字符串 (使用当前角色配置)。
    
    5. NAVIGATE: 切换界面。Payload: 目标模式名称 (CHARACTER_EDITOR, MAP_EDITOR, ACTION_STUDIO, MODEL_WORKSHOP, ASSET_LIBRARY, GAMEPLAY, VFX_STUDIO).

    规则：
    - 请用中文简洁、俏皮、像一个AI精灵一样回答。
    - 如果用户只是聊天，正常回答即可。
    - 如果需要执行操作，先回答确认，然后在最后附上JSON块。
    - 如果用户要求生成的东西与当前环境不符（例如在地图编辑器要求生成动作），你可以建议跳转，或者直接生成指令（系统会自动处理跳转）。
    `;

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      history: history,
      config: {
        systemInstruction: systemPrompt,
      }
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
};

/**
 * Generate TTS for the character
 */
export const generateCharacterVoice = async (text: string): Promise<ArrayBuffer | null> => {
    if (!getApiKey()) return null;

    try {
        const ai = getAiClient();
        if (!ai) return null;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Fenrir' }, // Deep voice for RPG chars
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        }
        return null;
    } catch (e) {
        console.error("TTS Error", e);
        return null;
    }
}

/**
 * Generates a 3D model (list of primitives) from text
 */
export const generate3DModel = async (description: string): Promise<ModelPrimitive[]> => {
    if (!getApiKey()) throw new Error("API Key missing");
    
    try {
        const ai = getAiClient();
        if (!ai) throw new Error("AI init failed");

        const prompt = `
        You are a Low Poly 3D Modeler. 
        Create a simple 3D model based on this description: "${description}".
        Return ONLY a JSON object.
        The JSON must contain a "parts" array.
        Each part must have:
        - "id": string (random)
        - "type": "box" | "sphere" | "cylinder" | "cone" | "capsule" | "ring" | "tetrahedron"
        - "position": [x, y, z] (numbers, keep mostly between -1 and 1)
        - "rotation": [x, y, z] (radians)
        - "scale": [x, y, z] (numbers, typically 0.1 to 1.0)
        - "color": string (hex code, e.g. "#ff0000")
        
        Keep the model simple, using under 12 primitives.
        Construct the shape logically.
        Do not include markdown formatting like \`\`\`json.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text || "{}";
        const json = JSON.parse(text);
        
        if (json.parts && Array.isArray(json.parts)) {
            return json.parts;
        }
        return [];
    } catch (e) {
        console.error("3D Gen Error", e);
        return [];
    }
}

/**
 * Generates a character animation (keyframes) from text
 */
export const generateCharacterAction = async (description: string): Promise<CustomAction | null> => {
    if (!getApiKey()) throw new Error("API Key missing");

    try {
        const ai = getAiClient();
        if (!ai) throw new Error("AI init failed");

        // RELAXED PROMPT - Focus on Poses, not Constraints
        const prompt = `
        You are a professional 3D Game Animator.
        Create a looped keyframe animation for a humanoid character.
        Action Description: "${description}".
        
        **Instructions:**
        1. Generate 4 to 8 keyframes (Key Poses).
        2. Ensure perfect looping (Time 0.0 state ≈ Time 1.0 state).
        3. Use standard Euler angles in Radians for rotations [x, y, z].
        4. Focus on clear, readable poses and natural movement.
        5. Return ONLY valid JSON.

        Available Bones: 'hips', 'chest', 'head', 'arm_left', 'forearm_left', 'hand_left', 'arm_right', 'forearm_right', 'hand_right', 'thigh_left', 'calf_left', 'foot_left', 'thigh_right', 'calf_right', 'foot_right'.

        Format:
        {
          "name": "Action Name",
          "duration": 1.5,
          "loop": true,
          "interpolation": "linear",
          "keyframes": [
            { "time": 0.0, "boneRotations": { "bone_name": [x, y, z] } },
            ...
          ]
        }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text || "{}";
        const json = JSON.parse(text);

        if (json.keyframes && Array.isArray(json.keyframes)) {
             const action: CustomAction = {
                 id: `ai_action_${Math.random().toString(36).substr(2, 9)}`,
                 name: json.name || "AI Action",
                 category: 'idle', // Default category since AI doesn't decide this
                 duration: json.duration || 1.5,
                 loop: json.loop !== undefined ? json.loop : true,
                 interpolation: 'linear',
                 keyframes: json.keyframes
             };
             return action;
        }
        return null;
    } catch (e) {
        console.error("Action Gen Error", e);
        return null;
    }
}

/**
 * Generates a procedural animation config from text
 */
export const generateProceduralConfig = async (description: string, context?: string): Promise<AnimationConfig | null> => {
    if (!getApiKey()) throw new Error("API Key missing");

    try {
        const ai = getAiClient();
        if (!ai) throw new Error("AI init failed");
        
        const contextStr = context ? `Focus primarily on the "${context}" parameters, but you can return others if relevant.` : "Generate a complete balanced config.";

        const prompt = `
        You are a Technical Animator.
        Adjust the procedural animation parameters for a game character to match this description: "${description}".
        ${contextStr}
        
        New Parameters available:
        - kneeBend (0.5 to 3.0): How much the knee bends/lifts (High value = high knees).
        - armSpan (0.0 to 1.5): How wide the arms are spread out (T-pose factor).
        - spineRotation (0.0 to 0.5): How much the torso twists.
        - stepWidth (0.0 to 0.6): Feet width apart (wide stance vs tight rope).
        - armRotation (-1.5 to 1.5): Base arm angle (positive=back/naruto, negative=forward/zombie).
        - sway (0.0 to 0.1): Hips sway amount (Idle only).
        - headBob (0.0 to 0.05): Head bounce amount (Idle only).
        - decay (0.1 to 1.0): Attack recovery speed (1.0 = instant, 0.1 = slow).
        - recoil (0.0 to 0.5): Body kickback intensity on attack.
        - legSpread (0.0 to 1.0): Attack combat stance width (0.0=feet together, 1.0=wide lunge).
        - kneeBend (Attack) (0.0 to 0.5): Attack crouch amount.
        
        Return a JSON object. You may return partial config for specific states (idle, walk, run, attack).
        
        Structure:
        {
          "idle": { "speed": number, "amplitude": number, "sway": number, "headBob": number },
          "walk": { "speed": number, "legAmplitude": number, "armAmplitude": number, "bounciness": number, "kneeBend": number, "armSpan": number, "spineRotation": number, "stepWidth": number, "armRotation": number },
          "run": { ... same as walk ... },
          "attack": { "speedMult": number, "windupRatio": number, "intensity": number, "decay": number, "recoil": number, "legSpread": number, "kneeBend": number }
        }
        
        Example logic:
        - "Zombie": Slow speed, low bounciness, low kneeBend, armRotation -1.0 (arms forward).
        - "Ninja": High speed, high lean, high kneeBend, armRotation 1.5 (arms back).
        - "Boxer": High legSpread, high kneeBend (crouch), fast decay.
        
        Do not include markdown.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text || "{}";
        const json = JSON.parse(text);

        // Relaxed validation: Accept if ANY valid key is present
        if (json.idle || json.walk || json.run || json.attack) {
             return json as AnimationConfig;
        }
        return null;
    } catch (e) {
        console.error("Procedural Config Gen Error", e);
        return null;
    }
}

/**
 * Generates a VFX Asset from description
 */
export const generateVfxConfig = async (description: string): Promise<VfxAsset | null> => {
    if (!getApiKey()) throw new Error("API Key missing");

    try {
        const ai = getAiClient();
        if (!ai) throw new Error("AI init failed");

        const prompt = `
        You are a VFX Artist for a Low Poly game.
        Create a particle effect configuration based on: "${description}".
        
        Construct a valid JSON object for 'VfxAsset'.
        
        Data Structure:
        {
          "name": string (Short name),
          "type": "continuous" | "burst",
          "emitters": [
            {
              "name": string,
              "enabled": true,
              "shape": "box" | "sphere" | "plane" | "tetrahedron",
              "colorStart": hex_string,
              "colorEnd": hex_string,
              "opacity": number (0.0 - 1.0),
              "blending": "normal" | "additive",
              "rate": number (particles per second, e.g. 50),
              "burstCount": number (for burst type, e.g. 20),
              "lifetime": number (seconds, e.g. 1.0),
              "sizeStart": number (0.1 - 2.0),
              "sizeEnd": number (0.0 - 2.0),
              "speed": number (0.0 - 10.0),
              "spread": number (0.0 - 1.0),
              "gravity": number (-10.0 to 10.0),
              "offset": [x, y, z],
              "followParent": boolean,
              "rotationSpeed": number (0.0 - 10.0),
              "turbulence": number (0.0 - 2.0),
              "delay": number (0.0 - 2.0)
            }
          ]
        }
        
        Use multiple emitters to create complex effects (e.g. core + sparks + smoke).
        Do not include markdown.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text || "{}";
        const json = JSON.parse(text);

        if (json.emitters && Array.isArray(json.emitters)) {
             // Validate and fill ID/Defaults
             const asset: VfxAsset = {
                 id: `vfx_ai_${Math.random().toString(36).substr(2, 9)}`,
                 name: json.name || "AI Effect",
                 type: json.type || 'continuous',
                 emitters: json.emitters.map((e: any, idx: number) => ({
                     id: `emit_ai_${idx}_${Math.random().toString(36).substr(2, 5)}`,
                     name: e.name || `Layer ${idx + 1}`,
                     enabled: true,
                     shape: e.shape || 'box',
                     colorStart: e.colorStart || '#ffffff',
                     colorEnd: e.colorEnd || '#ffffff',
                     opacity: e.opacity ?? 1,
                     blending: e.blending || 'normal',
                     rate: e.rate || 20,
                     burstCount: e.burstCount || 20,
                     lifetime: e.lifetime || 1,
                     sizeStart: e.sizeStart || 0.2,
                     sizeEnd: e.sizeEnd || 0,
                     speed: e.speed || 1,
                     spread: e.spread || 0.2,
                     gravity: e.gravity || 0,
                     offset: e.offset || [0, 0, 0],
                     followParent: e.followParent || false,
                     rotationSpeed: e.rotationSpeed || 0,
                     turbulence: e.turbulence || 0,
                     delay: e.delay || 0
                 }))
             };
             return asset;
        }
        return null;
    } catch (e) {
        console.error("VFX Gen Error", e);
        return null;
    }
}
