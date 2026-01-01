import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { eventBus } from '../EventBus';

export interface ExportOptions {
    binary?: boolean;
    maxTextureSize?: number;
    animations?: THREE.AnimationClip[];
}

export interface ExportResult {
    success: boolean;
    filename: string;
    size: number;
    data?: ArrayBuffer;
    error?: string;
}

export class ModelExportService {
    private exporter = new GLTFExporter();
    private MAX_SAFE_SIZE = 10 * 1024 * 1024; // 10MB 警告阈值

    /**
     * 对已有的二进制 Buffer 进行规范化导出（应用命名规范与事件分发）
     * @param buffer 原始数据
     * @param name 导出文件名基底
     */
    public async exportBuffer(buffer: ArrayBuffer, name: string): Promise<ExportResult> {
        const filename = this.generateFilename(name);
        const size = buffer.byteLength;

        console.log(`📡 [ModelExportService] Dispatching raw buffer export: ${filename} (${(size / 1024 / 1024).toFixed(2)}MB)`);

        this.downloadGLB(buffer, filename);

        // 发送全局导出完成事件
        eventBus.emit('MODEL_EXPORT_COMPLETE', {
            success: true,
            filename,
            size,
            isLarge: size > this.MAX_SAFE_SIZE
        });

        return {
            success: true,
            filename,
            size,
            data: buffer
        };
    }

    /**
     * 将 Three.js 对象导出为 GLB
     * @param object 目标对象 (mesh, group, etc.)
     * @param name 导出文件名基底
     */
    public async exportToGLB(object: THREE.Object3D, name: string, options: ExportOptions = {}): Promise<ExportResult> {
        const filename = this.generateFilename(name);

        console.log(`📡 [ModelExportService] Starting GLB export: ${filename}`);

        return new Promise((resolve) => {
            this.exporter.parse(
                object,
                (result: any) => {
                    const buffer = result as ArrayBuffer;
                    const size = buffer.byteLength;

                    this.downloadGLB(buffer, filename);

                    // 发送全局导出完成事件
                    eventBus.emit('MODEL_EXPORT_COMPLETE', {
                        success: true,
                        filename,
                        size,
                        isLarge: size > this.MAX_SAFE_SIZE
                    });

                    resolve({
                        success: true,
                        filename,
                        size,
                        data: buffer
                    });
                },
                (error: any) => {
                    console.error('🔥 [ModelExportService] Export failed:', error);
                    eventBus.emit('MODEL_EXPORT_COMPLETE', {
                        success: false,
                        error: String(error)
                    });
                    resolve({
                        success: false,
                        filename,
                        size: 0,
                        error: String(error)
                    });
                },
                {
                    binary: options.binary !== undefined ? options.binary : true,
                    animations: options.animations || [],
                    maxTextureSize: options.maxTextureSize || 2048
                }
            );
        });
    }

    /**
     * 触发浏览器下载
     */
    private downloadGLB(buffer: ArrayBuffer, filename: string) {
        const blob = new Blob([buffer], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /**
     * 生成规范化的文件名
     */
    private generateFilename(name: string): string {
        // 清理不兼容字符，保留中文、字母、数字、下划线、中划线
        const safeName = name.replace(/[^\u4e00-\u9fa5a-zA-Z0-9_\-]/g, '_');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        return `${safeName}_${timestamp}.glb`;
    }

    /**
     * 检查文件容量并触发警告
     */
    public checkSize(size: number): { isLarge: boolean; message?: string } {
        if (size > this.MAX_SAFE_SIZE) {
            return {
                isLarge: true,
                message: `警告：文件大小 (${(size / 1024 / 1024).toFixed(2)}MB) 超过了建议的 10MB 分发阈值，可能会影响加载性能。`
            };
        }
        return { isLarge: false };
    }
}
