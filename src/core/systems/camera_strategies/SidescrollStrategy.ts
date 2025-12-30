import { ICameraStrategy } from './ICameraStrategy';
import { CameraComponent } from '../../components/CameraComponent';
import { TransformComponent } from '../../components/TransformComponent';
import { InputSystem } from '../InputSystem';
import { Entity } from '../../Entity';

export class SidescrollStrategy implements ICameraStrategy {
    public readonly name = 'sidescroll';
    public enter(camera: CameraComponent): void { }
    public exit(camera: CameraComponent): void {
        // 清理工作：归零平移偏移
        camera.pivotOffset[0] = 0;
        camera.pivotOffset[1] = 0;
        camera.pivotOffset[2] = 0;
    }

    public handleInput(camera: CameraComponent, inputSystem: InputSystem, deltaTime: number): void {
        // 🚫 NO-OP: Do not move camera pivot manually. 
        // Let CameraSystem.updateCharacterControl handle WASD for the character.
        // The camera will naturally follow the character.
    }

    public updateTarget(camera: CameraComponent, target: Entity | null, deltaTime: number): { position: [number, number, number]; rotation: [number, number, number]; pivot: [number, number, number]; fov: number; } {
        let targetPos: [number, number, number] = [0, 0, 0];
        const t = target?.getComponent<TransformComponent>('Transform');

        if (t) {
            // 🔥 Fix: Use raw position for root entities to avoid latency (Same as TPS/FPS)
            targetPos = (target?.parent && t.getWorldPosition) ? t.getWorldPosition() : t.position;
        }

        // 固定 Z 轴位置，只跟随 X 和 Y
        const distance = camera.distance;

        // 侧板模式：严格锁定 Z 轴距离，跟随 X/Y
        // 旋转必须归零（正视前方）

        // 1. 计算目标中心 (Pivot)
        const pivot: [number, number, number] = [
            targetPos[0],
            targetPos[1] + 1.0, // 降低高度，让角色居中 (腰部高度)
            targetPos[2]
        ];

        // 2. 计算相机位置
        const position: [number, number, number] = [
            pivot[0] + camera.pivotOffset[0], // 允许左右微调
            pivot[1] + camera.pivotOffset[1], // 允许上下微调
            pivot[2] + camera.distance        // 严格保持距离
        ];

        // 3. 强制锁定
        // 如果 InputSystem 传入了非法的 resetFrameData 之前的旋转，这里要强行覆盖
        // Sidescroll 永远是正交或正视
        const rotation: [number, number, number] = [0, 0, 0];

        return {
            position,
            rotation,
            pivot,
            fov: camera.fov
        };
    }
}
