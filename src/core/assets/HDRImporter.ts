/**
 * PolyForge Asset System - HDR Importer
 * 
 * HDR 环境贴图导入工具
 * 支持 .hdr 格式，使用 Three.js HDRLoader
 * 
 * 铁律：严禁引用外部库，所有 Loader 必须本地化
 */

import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

/**
 * HDR 元数据接口
 */
export interface HDRMetadata {
  width: number;           // 宽度（像素）
  height: number;          // 高度（像素）
  format: string;          // 格式（hdr/rgbe）
  exposure: number;        // 曝光值
}

/**
 * HDR 导入器
 * 使用 Three.js HDRLoader 解析 HDR 文件
 */
export class HDRImporter {
  private hdrLoader: HDRLoader;
  private renderer: THREE.WebGLRenderer | null = null;
  private pmremGenerator: THREE.PMREMGenerator | null = null;

  constructor() {
    // 初始化 HDR Loader（本地化，零外部依赖）
    this.hdrLoader = new HDRLoader();
    console.log('[HDRImporter] Initialized with local HDRLoader');
  }

  /**
   * 导入 HDR 文件
   * 
   * @param file HDR 文件
   * @returns HDR 数据、元数据和缩略图
   */
  async importHDR(file: File): Promise<{
    blob: Blob;
    metadata: HDRMetadata;
    thumbnail: string;
    envMap: THREE.Texture;  // 预处理的环境贴图（可直接用于 PBR）
  }> {
    console.log(`[HDRImporter] Importing HDR: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

    try {
      // 1. 验证 HDR 格式
      this.validateHDRFormat(file);

      // 2. 读取文件为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // 3. 使用 HDRLoader 解析 HDR
      const texture = await this.loadHDR(arrayBuffer);

      // 4. 使用 PMREMGenerator 预处理纹理（生成 envMap）
      const envMap = await this.preprocessTexture(texture);

      // 5. 提取元数据
      const metadata = this.extractMetadata(texture);
      console.log('[HDRImporter] Metadata extracted:', metadata);

      // 6. 生成全景缩略图（256x128）
      const thumbnail = await this.generatePanoramaThumbnail(texture);
      console.log('[HDRImporter] Panorama thumbnail generated (256x128)');

      // 7. 将文件转换为 Blob
      const blob = new Blob([arrayBuffer], { type: 'image/vnd.radiance' });

      // 清理原始纹理（保留 envMap）
      texture.dispose();

      return {
        blob,
        metadata,
        thumbnail,
        envMap,
      };
    } catch (error) {
      console.error('[HDRImporter] Import failed:', error);
      throw error;
    }
  }

  /**
   * 验证 HDR 格式
   */
  private validateHDRFormat(file: File): void {
    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith('.hdr')) {
      throw new Error(`Unsupported HDR format: ${fileName}. Only .hdr files are supported.`);
    }
  }

  /**
   * 使用 HDRLoader 加载 HDR
   */
  private loadHDR(arrayBuffer: ArrayBuffer): Promise<THREE.DataTexture> {
    return new Promise((resolve, reject) => {
      this.hdrLoader.load(
        // 使用 Data URL 避免网络请求
        this.arrayBufferToDataURL(arrayBuffer),
        (texture) => resolve(texture),
        undefined,
        (error) => reject(error)
      );
    });
  }

  /**
   * 将 ArrayBuffer 转换为 Data URL
   */
  private arrayBufferToDataURL(arrayBuffer: ArrayBuffer): string {
    const blob = new Blob([arrayBuffer], { type: 'image/vnd.radiance' });
    return URL.createObjectURL(blob);
  }

  /**
   * 使用 PMREMGenerator 预处理纹理
   * 生成可直接用于 PBR 材质的 envMap
   */
  private async preprocessTexture(texture: THREE.DataTexture): Promise<THREE.Texture> {
    // 初始化渲染器（如果还没有）
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ antialias: false });
      this.renderer.setSize(256, 256); // 小尺寸用于预处理
      console.log('[HDRImporter] WebGLRenderer initialized for preprocessing');
    }

    // 初始化 PMREMGenerator
    if (!this.pmremGenerator) {
      this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.pmremGenerator.compileEquirectangularShader();
      console.log('[HDRImporter] PMREMGenerator initialized');
    }

    // 从等距柱状投影生成 PMREM 环境贴图
    const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
    
    console.log('[HDRImporter] Texture preprocessed with PMREMGenerator');
    return envMap;
  }

  /**
   * 提取 HDR 元数据
   */
  private extractMetadata(texture: THREE.DataTexture): HDRMetadata {
    return {
      width: texture.image.width,
      height: texture.image.height,
      format: 'hdr',
      exposure: 1.0, // 默认曝光值
    };
  }

  /**
   * 生成全景缩略图（256x128 Base64）
   */
  private async generatePanoramaThumbnail(texture: THREE.DataTexture): Promise<string> {
    // 初始化渲染器（如果还没有）
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: false,
        preserveDrawingBuffer: true 
      });
    }

    // 设置缩略图尺寸（256x128 全景比例）
    const width = 256;
    const height = 128;
    this.renderer.setSize(width, height);

    // 创建场景和相机
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(90, width / height, 0.1, 100);
    camera.position.set(0, 0, 0);

    // 创建球体几何体用于显示全景
    const geometry = new THREE.SphereGeometry(10, 64, 32);
    // 翻转几何体使纹理在内部显示
    geometry.scale(-1, 1, 1);

    // 创建材质并应用 HDR 纹理
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      toneMapped: false, // 禁用色调映射以保持 HDR 效果
    });

    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // 渲染全景视图
    this.renderer.render(scene, camera);

    // 转换为 Base64
    const canvas = this.renderer.domElement;
    const dataURL = canvas.toDataURL('image/png');

    // 清理
    geometry.dispose();
    material.dispose();
    scene.remove(sphere);

    return dataURL;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.pmremGenerator) {
      this.pmremGenerator.dispose();
      this.pmremGenerator = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    console.log('[HDRImporter] Resources disposed');
  }
}
