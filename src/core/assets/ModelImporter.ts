/**
 * PolyForge Asset System - Model Importer
 * 
 * 模型资产导入工具
 * 支持 GLB/GLTF 格式，使用本地 Draco 解码器
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { ModelMetadata } from './types';

/**
 * 模型导入器
 */
export class ModelImporter {
  private gltfLoader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;

  constructor() {
    // 初始化 Draco 解码器
    this.dracoLoader = new DRACOLoader();
    // 使用本地 Draco 解码器路径（严禁使用 CDN）
    this.dracoLoader.setDecoderPath('/draco/');
    this.dracoLoader.setDecoderConfig({ type: 'js' });

    // 初始化 GLTF 加载器
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    console.log('[ModelImporter] Initialized with local Draco decoder at /draco/');
  }

  /**
   * 导入模型文件
   * 
   * @param file 模型文件（GLB/GLTF）
   * @returns 模型数据和元数据
   */
  async importModel(file: File): Promise<{
    blob: Blob;
    metadata: ModelMetadata;
    thumbnail?: string;
  }> {
    console.log(`[ModelImporter] Importing model: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

    try {
      // 1. 读取文件为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // 2. 使用 GLTF Loader 解析模型
      const gltf = await this.loadGLTF(arrayBuffer);

      // 3. 提取元数据
      const metadata = this.extractMetadata(gltf);
      console.log('[ModelImporter] Metadata extracted:', metadata);

      // 4. 生成缩略图
      const thumbnail = await this.generateThumbnail(gltf);
      console.log('[ModelImporter] Thumbnail generated');

      // 5. 将文件转换为 Blob
      const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });

      return {
        blob,
        metadata,
        thumbnail,
      };
    } catch (error) {
      console.error('[ModelImporter] Import failed:', error);
      throw error;
    }
  }

  /**
   * 使用 GLTF Loader 加载模型
   */
  private loadGLTF(arrayBuffer: ArrayBuffer): Promise<any> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.parse(
        arrayBuffer,
        '',
        (gltf) => resolve(gltf),
        (error) => reject(error)
      );
    });
  }

  /**
   * 提取模型元数据
   */
  private extractMetadata(gltf: any): ModelMetadata {
    let vertices = 0;
    let faces = 0;
    let bones = 0;
    const materials = new Set<string>();
    const textures = new Set<string>();

    // 遍历场景中的所有对象
    gltf.scene.traverse((object: any) => {
      // 统计几何体信息
      if (object.isMesh && object.geometry) {
        const geometry = object.geometry;

        // 顶点数
        if (geometry.attributes.position) {
          vertices += geometry.attributes.position.count;
        }

        // 面数
        if (geometry.index) {
          faces += geometry.index.count / 3;
        } else if (geometry.attributes.position) {
          faces += geometry.attributes.position.count / 3;
        }
      }

      // 统计骨骼信息
      if (object.isSkinnedMesh && object.skeleton) {
        bones += object.skeleton.bones.length;
      }

      // 统计材质
      if (object.material) {
        const mats = Array.isArray(object.material) ? object.material : [object.material];
        mats.forEach((mat: any) => {
          if (mat.uuid) {
            materials.add(mat.uuid);
          }

          // 统计纹理
          if (mat.map) textures.add(mat.map.uuid);
          if (mat.normalMap) textures.add(mat.normalMap.uuid);
          if (mat.roughnessMap) textures.add(mat.roughnessMap.uuid);
          if (mat.metalnessMap) textures.add(mat.metalnessMap.uuid);
          if (mat.emissiveMap) textures.add(mat.emissiveMap.uuid);
        });
      }
    });

    // 提取物理包围盒 (Original Dimensions)
    // 🔥 紧致算法：排除非渲染节点（如灯光、辅助相机），只计算 Mesh 顶点的真实包围盒
    // 🛡️ 架构加固 (2026-01-02): 必须强制同步世界矩阵，否则子网格的 applyMatrix4 将失效
    gltf.scene.updateMatrixWorld(true);

    const tightBox = new THREE.Box3();
    let hasMesh = false;

    gltf.scene.traverse((obj: any) => {
      if (obj.isMesh && obj.geometry) {
        // 计算该网格的包围盒（应用其世界变换前的本地包围盒转世界坐标）
        if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
        const meshBox = obj.geometry.boundingBox.clone();
        meshBox.applyMatrix4(obj.matrixWorld);

        if (!hasMesh) {
          tightBox.copy(meshBox);
          hasMesh = true;
        } else {
          tightBox.union(meshBox);
        }
      }
    });

    // 如果找不到网格（兜底），使用标准 setFromObject
    if (!hasMesh) tightBox.setFromObject(gltf.scene);

    const min = tightBox.min.toArray() as [number, number, number];
    const max = tightBox.max.toArray() as [number, number, number];
    const size = tightBox.getSize(new THREE.Vector3()).toArray() as [number, number, number];
    const center = tightBox.getCenter(new THREE.Vector3()).toArray() as [number, number, number];

    return {
      vertices: Math.round(vertices),
      faces: Math.round(faces),
      bones,
      animations: gltf.animations ? gltf.animations.length : 0,
      materials: materials.size,
      textures: textures.size,
      boundingBox: { min, max, size, center }
    };
  }

  /**
   * 生成模型缩略图（128x128 Base64）
   */
  private async generateThumbnail(gltf: any): Promise<string> {
    // 初始化渲染器（如果还没有）
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
      });
      this.renderer.setSize(128, 128);
      this.renderer.setClearColor(0x000000, 0); // 透明背景
    }

    // 初始化场景
    if (!this.scene) {
      this.scene = new THREE.Scene();
    } else {
      // 清空场景
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
    }

    // 初始化相机
    if (!this.camera) {
      this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    }

    // 添加模型到场景
    this.scene.add(gltf.scene);

    // 计算模型边界盒
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // 设置相机位置（从右上方观察）
    const distance = maxDim * 2.5;
    this.camera.position.set(distance, distance * 0.7, distance);
    this.camera.lookAt(center);

    // 添加光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(distance, distance, distance);
    this.scene.add(directionalLight);

    // 渲染
    this.renderer.render(this.scene, this.camera);

    // 转换为 Base64
    const canvas = this.renderer.domElement;
    const dataURL = canvas.toDataURL('image/png');

    // 清理光照
    this.scene.remove(ambientLight);
    this.scene.remove(directionalLight);

    return dataURL;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    if (this.scene) {
      this.scene.clear();
      this.scene = null;
    }
    this.camera = null;
    this.dracoLoader.dispose();
    console.log('[ModelImporter] Resources disposed');
  }
}
