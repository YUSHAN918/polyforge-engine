import { Entity } from '../../Entity';
import { CameraComponent } from '../../components/CameraComponent';
import { InputSystem } from '../InputSystem';

/**
 * 相机策略接口
 * 也可以看作是 "Camera Controller State Pattern"
 */
export interface ICameraStrategy {
    readonly name: string;
    /**
     * 进入该模式时调用 (初始化/重置)
     */
    enter(camera: CameraComponent): void;

    /**
     * 离开该模式时调用 (清理)
     */
    exit(camera: CameraComponent): void;

    /**
     * 处理输入 (每帧调用)
     */
    handleInput(camera: CameraComponent, inputSystem: InputSystem, deltaTime: number): void;

    /**
     * 更新相机目标位置 (计算 TargetState)
     * @param target 当前跟随的目标实体 (可能为空)
     */
    updateTarget(camera: CameraComponent, target: Entity | null, deltaTime: number): {
        position: [number, number, number];
        rotation: [number, number, number];
        pivot: [number, number, number];
        fov: number;
    };
}
