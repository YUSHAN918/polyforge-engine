/**
 * Bundle 系统进度回调接口
 * 用于在打包和加载过程中向 UI 同步当前处理的资产及进度百分比
 */
export interface BundleProgress {
    /** 当前正在处理的资产名称 */
    assetName: string;
    /** 当前阶段的进度 (0-1) */
    progress: number;
    /** 总体步骤描述（如：正在收集依赖... / 正在解密资产...） */
    step: string;
}

export type ProgressCallback = (data: BundleProgress) => void;
