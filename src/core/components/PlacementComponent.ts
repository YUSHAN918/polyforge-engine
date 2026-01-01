import { Component, ComponentData } from '../types';

/**
 * PlacementComponent
 * 标记实体处于“放置预览”状态，并存储放置参数
 */
export class PlacementComponent implements Component {
    public readonly type = 'Placement';
    public enabled = true;

    public assetId: string = '';
    public assetName: string = '';
    public mode: 'model' | 'billboard' = 'model';
    public scale: number = 1.0;
    public rotationY: number = 0;
    public rotationX: boolean = false; // 是否旋转 90 度 (用于图片垂直/水平切换)

    constructor(assetId: string = '', assetName: string = '') {
        this.assetId = assetId;
        this.assetName = assetName;
    }

    serialize(): ComponentData {
        return {
            type: this.type,
            enabled: this.enabled,
            assetId: this.assetId,
            assetName: this.assetName,
            mode: this.mode,
            scale: this.scale,
            rotationY: this.rotationY,
            rotationX: this.rotationX
        };
    }

    deserialize(data: ComponentData): void {
        this.enabled = data.enabled !== false;
        this.assetId = data.assetId || '';
        this.assetName = data.assetName || '';
        this.mode = data.mode || 'model';
        this.scale = data.scale || 1.0;
        this.rotationY = data.rotationY || 0;
        this.rotationX = !!data.rotationX;
    }
}
