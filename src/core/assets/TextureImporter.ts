/**
 * PolyForge Asset System - Texture Importer
 * 
 * 纹理资产导入工具
 * 支持 PNG/JPG/JPEG/WEBP 格式
 */

import type { TextureMetadata } from './types';

/**
 * 纹理导入器
 */
export class TextureImporter {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;

    constructor() {
        console.log('[TextureImporter] Initialized');
    }

    /**
     * 导入图片文件为纹理
     * 
     * @param file 图片文件
     * @returns 纹理数据和元数据
     */
    async importTexture(file: File): Promise<{
        blob: Blob;
        metadata: TextureMetadata;
        thumbnail: string;
    }> {
        console.log(`[TextureImporter] Importing texture: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

        try {
            // 1. 读取文件并创建 Image 对象
            const url = URL.createObjectURL(file);
            const image = await this.loadImage(url);
            URL.revokeObjectURL(url);

            // 2. 提取元数据
            const metadata: TextureMetadata = {
                width: image.width,
                height: image.height,
                format: this.getFileFormat(file.name),
                isPowerOfTwo: this.isPowerOfTwo(image.width) && this.isPowerOfTwo(image.height),
            };

            console.log('[TextureImporter] Metadata extracted:', metadata);

            // 3. 生成缩略图
            const thumbnail = this.generateThumbnail(image);

            // 4. 将文件转换为 Blob
            const blob = new Blob([await file.arrayBuffer()], { type: file.type });

            return {
                blob,
                metadata,
                thumbnail,
            };
        } catch (error) {
            console.error('[TextureImporter] Import failed:', error);
            throw error;
        }
    }

    /**
     * 加载图片
     */
    private loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(new Error('Failed to load image'));
            img.src = url;
        });
    }

    /**
     * 生成缩略图
     */
    private generateThumbnail(image: HTMLImageElement): string {
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.width = 128;
            this.canvas.height = 128;
            this.ctx = this.canvas.getContext('2d');
        }

        if (!this.ctx) return '';

        // 清空画布
        this.ctx.clearRect(0, 0, 128, 128);

        // 计算缩放和居中
        const aspect = image.width / image.height;
        let dw = 128;
        let dh = 128;
        let dx = 0;
        let dy = 0;

        if (aspect > 1) {
            dh = 128 / aspect;
            dy = (128 - dh) / 2;
        } else {
            dw = 128 * aspect;
            dx = (128 - dw) / 2;
        }

        // 绘制并生成数据
        this.ctx.drawImage(image, dx, dy, dw, dh);
        return this.canvas.toDataURL('image/png');
    }

    /**
     * 判断是否为 2 的幂次
     */
    private isPowerOfTwo(n: number): boolean {
        return n > 0 && (n & (n - 1)) === 0;
    }

    /**
     * 获取文件格式
     */
    private getFileFormat(fileName: string): string {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        if (['jpg', 'jpeg'].includes(ext)) return 'jpg';
        return ext;
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.canvas = null;
        this.ctx = null;
    }
}
