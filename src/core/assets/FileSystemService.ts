/**
 * PolyForge Asset System - File System Service
 * 
 * 本地文件系统访问服务
 * 使用 File System Access API 实现文件夹选择和批量导入
 * 
 * 铁律：
 * - 保持异步处理的优雅，不阻塞 UI 主线程
 * - 捕获所有错误，损坏的文件自动跳过
 */

/**
 * 支持的文件类型映射
 */
const SUPPORTED_EXTENSIONS = {
  model: ['.glb', '.gltf'],
  audio: ['.mp3', '.wav', '.ogg'],
  hdr: ['.hdr'],
  texture: ['.png', '.jpg', '.jpeg'],
} as const;

/**
 * 扫描结果接口
 */
export interface ScannedFile {
  name: string;
  path: string;
  type: 'model' | 'audio' | 'hdr' | 'texture';
  size: number;
  file: File;
}

/**
 * 批量导入进度接口
 */
export interface ImportProgress {
  total: number;           // 总文件数
  current: number;         // 当前处理的文件索引
  succeeded: number;       // 成功导入数
  failed: number;          // 失败数
  currentFile: string;     // 当前处理的文件名
  errors: Array<{          // 错误列表
    file: string;
    error: string;
  }>;
}

/**
 * 进度回调函数类型
 */
export type ProgressCallback = (progress: ImportProgress) => void;

/**
 * 文件系统服务
 */
export class FileSystemService {
  /**
   * 检查浏览器是否支持 File System Access API
   */
  static isSupported(): boolean {
    return 'showDirectoryPicker' in window;
  }

  /**
   * 选择文件夹
   * 
   * @returns 文件夹句柄
   */
  static async selectDirectory(): Promise<FileSystemDirectoryHandle | null> {
    if (!FileSystemService.isSupported()) {
      throw new Error('File System Access API is not supported in this browser');
    }

    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'read',
      });
      console.log(`[FileSystemService] Directory selected: ${dirHandle.name}`);
      return dirHandle;
    } catch (error) {
      // 用户取消选择
      if ((error as Error).name === 'AbortError') {
        console.log('[FileSystemService] Directory selection cancelled');
        return null;
      }
      throw error;
    }
  }

  /**
   * 递归扫描文件夹
   * 
   * @param dirHandle 文件夹句柄
   * @param basePath 基础路径（用于显示）
   * @returns 扫描到的文件列表
   */
  static async scanDirectory(
    dirHandle: FileSystemDirectoryHandle,
    basePath: string = ''
  ): Promise<ScannedFile[]> {
    const files: ScannedFile[] = [];

    try {
      // 遍历文件夹中的所有条目
      for await (const entry of (dirHandle as any).values()) {
        const currentPath = basePath ? `${basePath}/${entry.name}` : entry.name;

        if (entry.kind === 'file') {
          // 处理文件
          const fileHandle = entry as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          const fileType = FileSystemService.getFileType(file.name);

          if (fileType) {
            files.push({
              name: file.name,
              path: currentPath,
              type: fileType,
              size: file.size,
              file,
            });
            console.log(`[FileSystemService] Found ${fileType}: ${currentPath}`);
          }
        } else if (entry.kind === 'directory') {
          // 递归扫描子文件夹
          const subDirHandle = entry as FileSystemDirectoryHandle;
          const subFiles = await FileSystemService.scanDirectory(subDirHandle, currentPath);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      console.error(`[FileSystemService] Failed to scan directory ${basePath}:`, error);
      throw error;
    }

    return files;
  }

  /**
   * 根据文件名判断文件类型
   * 
   * @param fileName 文件名
   * @returns 文件类型，如果不支持则返回 null
   */
  static getFileType(fileName: string): 'model' | 'audio' | 'hdr' | 'texture' | null {
    const lowerName = fileName.toLowerCase();

    for (const [type, extensions] of Object.entries(SUPPORTED_EXTENSIONS)) {
      if (extensions.some(ext => lowerName.endsWith(ext))) {
        return type as 'model' | 'audio' | 'hdr' | 'texture';
      }
    }

    return null;
  }

  /**
   * 批量导入文件
   * 
   * @param files 扫描到的文件列表
   * @param registry AssetRegistry 实例
   * @param onProgress 进度回调
   * @returns 导入结果
   */
  static async batchImport(
    files: ScannedFile[],
    registry: any, // AssetRegistry 实例
    onProgress?: ProgressCallback
  ): Promise<ImportProgress> {
    const progress: ImportProgress = {
      total: files.length,
      current: 0,
      succeeded: 0,
      failed: 0,
      currentFile: '',
      errors: [],
    };

    console.log(`[FileSystemService] Starting batch import: ${files.length} files`);

    // 确保 registry 已初始化
    await registry.initialize();

    // 逐个导入文件（避免并发过多导致内存问题）
    for (let i = 0; i < files.length; i++) {
      const scannedFile = files[i];
      progress.current = i + 1;
      progress.currentFile = scannedFile.name;

      // 调用进度回调
      if (onProgress) {
        onProgress({ ...progress });
      }

      try {
        // 根据文件类型调用对应的导入方法
        await FileSystemService.importSingleFile(scannedFile, registry);
        progress.succeeded++;
        console.log(`[FileSystemService] ✓ Imported: ${scannedFile.name}`);
      } catch (error) {
        progress.failed++;
        const errorMessage = (error as Error).message;
        progress.errors.push({
          file: scannedFile.name,
          error: errorMessage,
        });
        console.error(`[FileSystemService] ✗ Failed to import ${scannedFile.name}:`, errorMessage);
      }

      // 让出主线程，避免阻塞 UI
      await FileSystemService.yield();
    }

    console.log(`[FileSystemService] Batch import complete: ${progress.succeeded} succeeded, ${progress.failed} failed`);

    // 最终进度回调
    if (onProgress) {
      onProgress({ ...progress });
    }

    return progress;
  }

  /**
   * 导入单个文件
   * 
   * @param scannedFile 扫描到的文件
   * @param registry AssetRegistry 实例
   */
  private static async importSingleFile(scannedFile: ScannedFile, registry: any): Promise<void> {
    const { file, type, path } = scannedFile;

    // 根据文件类型调用对应的导入方法
    switch (type) {
      case 'model':
        await registry.importModel(file, {
          category: 'models',
          tags: ['batch-import', 'model', path],
        });
        break;

      case 'audio':
        await registry.importAudio(file, {
          category: 'audio',
          tags: ['batch-import', 'audio', path],
        });
        break;

      case 'hdr':
        await registry.importHDR(file, {
          category: 'environments',
          tags: ['batch-import', 'hdr', path],
        });
        break;

      case 'texture':
        await registry.importTexture(file, {
          category: 'textures',
          tags: ['batch-import', 'texture', path],
        });
        break;

      default:
        throw new Error(`Unsupported file type: ${type}`);
    }
  }

  /**
   * 让出主线程（避免阻塞 UI）
   * 使用 setTimeout 0 让浏览器有机会处理其他任务
   */
  private static yield(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * 获取支持的文件扩展名列表
   */
  static getSupportedExtensions(): string[] {
    return Object.values(SUPPORTED_EXTENSIONS).flat();
  }

  /**
   * 获取支持的文件类型统计
   */
  static getFileTypeStats(files: ScannedFile[]): Record<string, number> {
    const stats: Record<string, number> = {
      model: 0,
      audio: 0,
      hdr: 0,
      texture: 0,
    };

    for (const file of files) {
      stats[file.type]++;
    }

    return stats;
  }
}
