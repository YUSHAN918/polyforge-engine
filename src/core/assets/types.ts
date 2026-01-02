/**
 * PolyForge Asset System - Type Definitions
 * 
 * 定义资产系统的核心类型和接口
 * 遵循设计文档中的 AssetMetadata 规范
 */

/**
 * 资产类型枚举
 */
export enum AssetType {
  MODEL = 'model',       // 3D 模型（GLB/GLTF）
  AUDIO = 'audio',       // 音频文件（MP3/WAV/OGG）
  TEXTURE = 'texture',   // 纹理贴图（PNG/JPG）
  HDR = 'hdr',          // HDR 环境贴图
}

/**
 * 资产元数据接口
 * 用于快速查询和索引
 */
export interface AssetMetadata {
  id: string;              // 唯一标识符（UUID）
  name: string;            // 资产名称
  type: AssetType;         // 资产类型
  category: string;        // 分类（如 'characters', 'props', 'environments'）
  tags: string[];          // 标签数组（用于搜索）
  size: number;            // 文件大小（字节）
  createdAt: number;       // 创建时间戳
  thumbnail?: string;      // Base64 缩略图（可选）
  modelStats?: ModelMetadata; // 模型特定数据（可选）
  textureMetadata?: TextureMetadata; // 🔥 图片特定数据（可选）
  physicsConfig?: {        // 🔥 用户自定义的默认物理配置（覆盖原始 BBox）
    colliderScale?: number;
    colliderOffset?: [number, number, number];
    colliderRotation?: [number, number, number];
  };
}

/**
 * 资产数据接口
 * 包含元数据和实际数据
 */
export interface AssetData {
  metadata: AssetMetadata;
  data: Blob;              // 实际文件数据
}

/**
 * 资产查询过滤器
 */
export interface AssetFilter {
  type?: AssetType;        // 按类型过滤
  category?: string;       // 按分类过滤
  tags?: string[];         // 按标签过滤（AND 逻辑）
  namePattern?: string;    // 名称模糊匹配
}

/**
 * 资产导入选项
 */
export interface ImportOptions {
  compress?: boolean;      // 是否压缩（仅模型）
  generateThumbnail?: boolean; // 是否生成缩略图
  category?: string;       // 指定分类
  tags?: string[];         // 指定标签
}

/**
 * 模型元数据
 */
export interface ModelMetadata {
  vertices: number;        // 顶点数
  faces: number;           // 面数
  bones: number;           // 骨骼数
  animations: number;      // 动画数
  materials: number;       // 材质数
  textures: number;        // 纹理数
  boundingBox?: {          // 🔥 原始物理包围盒
    min: [number, number, number];
    max: [number, number, number];
    size: [number, number, number];
    center: [number, number, number]; // 🔥 中心偏移坐标
  };
}

/**
 * 音频元数据
 */
export interface AudioMetadata {
  duration: number;        // 时长（秒）
  sampleRate: number;      // 采样率（Hz）
  numberOfChannels: number; // 声道数
  format: string;          // 文件格式（mp3/wav/ogg）
}

/**
 * HDR 元数据
 */
export interface HDRMetadata {
  width: number;           // 宽度（像素）
  height: number;          // 高度（像素）
  format: string;          // 格式（hdr/rgbe）
  exposure: number;        // 曝光值
}

/**
 * 纹理元数据
 */
export interface TextureMetadata {
  width: number;           // 宽度（像素）
  height: number;          // 高度（像素）
  format: string;          // 格式（png/jpg/webp）
  isPowerOfTwo: boolean;   // 是否为 2 的幂次（优化建议）
}

/**
 * 内容指纹（用于去重）
 */
export interface ContentFingerprint {
  hash: string;            // SHA-256 哈希值
  size: number;            // 文件大小（字节）
  assetId: string;         // 关联的资产 ID
}


/**
 * 文件系统相关类型
 */
export interface ScannedFile {
  name: string;
  path: string;
  type: 'model' | 'audio' | 'hdr' | 'texture';
  size: number;
  file: File;
}

export interface ImportProgress {
  total: number;
  current: number;
  succeeded: number;
  failed: number;
  currentFile: string;
  errors: Array<{
    file: string;
    error: string;
  }>;
}

export type ProgressCallback = (progress: ImportProgress) => void;
