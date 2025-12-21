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
}
