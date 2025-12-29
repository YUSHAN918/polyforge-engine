// 🔒 FROZEN: PolyForge Orbit Camera Strategy (Stabilized Dec 29)
import { ICameraStrategy } from './ICameraStrategy';
import { CameraComponent } from '../../components/CameraComponent';
import { TransformComponent } from '../../components/TransformComponent';
import { InputSystem } from '../InputSystem';
import { Entity } from '../../Entity';

export class OrbitStrategy implements ICameraStrategy {
    public readonly name = 'orbit';
    public enter(camera: CameraComponent): void {
        // 制作人指令：确保进入创造模式时，镜头第一时间对准地面
        // 1. 强制重置平移偏移，将视角拉回地心坐标系 (0,0,0)
        camera.pivotOffset[0] = 0;
        camera.pivotOffset[1] = 0;
        camera.pivotOffset[2] = 0;

        // 2. 强制设置“上帝斜俯视角” (45度)
        camera.pitch = 45;

        // 3. 设置一个适中的初始观察距离
        if (camera.distance < 5 || camera.distance > 50) {
            camera.distance = 20;
        }

        // 4. 重置 Yaw 到标准正面
        camera.yaw = 0;

        console.log("📷 OrbitStrategy: Entered. Pivot reset to Origin. Facing ground at 45°.");
    }

    public exit(camera: CameraComponent): void {
        // Cleanup
    }

    public handleInput(camera: CameraComponent, inputSystem: InputSystem, deltaTime: number): void {
        // 移植自 handleCreationInputs
        // 如果正在跟随目标，则禁用手动 Panning 和旋转 (ISO 模式下通常固定，但也防止干扰)
        if (camera.targetEntityId) return;

        const mouseDelta = inputSystem.mouseDelta;
        const pressedButtons = inputSystem.pressedButtons || new Set();
        const pressedKeys = inputSystem.pressedKeys || new Set();
        const wheel = inputSystem.wheelDelta;

        // 1. Panning: Space + Left Click (0) OR Middle Click (1)
        if (pressedKeys.has(' ') && (pressedButtons.has(0) || pressedButtons.has(1))) {
            if (mouseDelta && (Math.abs(mouseDelta.x) > 0 || Math.abs(mouseDelta.y) > 0)) {
                // Adjust pan speed based on distance (farther = faster)
                const panSpeed = camera.distance * 0.002;

                // Rotation (Radians)
                const yawRad = camera.yaw * Math.PI / 180;
                const pitchRad = camera.pitch * Math.PI / 180;

                // Right Vector (Local X) - Always horizontal for Orbit
                const rightX = Math.cos(yawRad);
                const rightZ = -Math.sin(yawRad);

                // Up Vector (Screen Space Up)
                // When looking down (Pitch > 0), "Up" on screen is "Back and Up" in world.
                const sinP = Math.sin(pitchRad);
                const cosP = Math.cos(pitchRad);
                const sinY = Math.sin(yawRad);
                const cosY = Math.cos(yawRad);

                // Up Vector components (Screen Space Up mapped to world)
                const upX = -sinY * sinP;
                const upY = cosP;
                const upZ = -cosY * sinP;

                // Apply Panning to Pivot
                // Horizontal (Mouse X) -> Right Vector (Confirming "左右是对的")
                camera.pivotOffset[0] -= rightX * mouseDelta.x * panSpeed;
                camera.pivotOffset[2] -= rightZ * mouseDelta.x * panSpeed;

                // Vertical (Mouse Y) -> Screen Up Vector (Fixing "上下是缩放")
                // Using Screen Up prevents moving purely along Forward/Backward on ground.
                camera.pivotOffset[0] += upX * mouseDelta.y * panSpeed;
                camera.pivotOffset[1] += upY * mouseDelta.y * panSpeed;
                camera.pivotOffset[2] += upZ * mouseDelta.y * panSpeed;
            }
        }

        // 2. Rotation: Middle Click Only (Rebuilt from zero)
        if (pressedButtons.has(1) && !pressedKeys.has(' ')) {
            if (mouseDelta && (Math.abs(mouseDelta.x) > 0 || Math.abs(mouseDelta.y) > 0)) {
                // 旋转灵敏度
                const sensitivity = 0.3;

                // 水平旋转 (Yaw) - “拽动场景”感：鼠标向右，视角向左绕，物体向右转
                camera.yaw -= mouseDelta.x * sensitivity;

                // 垂直旋转 (Pitch) - “英雄大厅”逻辑：
                // 鼠标向上推 (DeltaY < 0) -> Pitch 减小 -> 相机下潜 -> 仰视看到底部
                camera.pitch += mouseDelta.y * sensitivity;

                // 物理限制：允许全范围旋转 (-89 到 89 度)，确保可以从最底下看
                camera.pitch = Math.max(-89, Math.min(89, camera.pitch));
            }
        }

        // 3. Zoom: Mouse Wheel (Re-added, essential)
        if (wheel !== 0) {
            // 切换为线性缩放 (Linear Zoom)，确保推、拉数值绝对一致
            // 步进值从 0.5 调优至 0.2，确保极致丝滑对称
            const zoomSpeed = 0.2;
            camera.distance += wheel * zoomSpeed;
            // 解锁距离限制：保留 0.1 的物理安全下限防止坐标归零，移除最大距离限制
            camera.distance = Math.max(0.1, camera.distance);
        }
    }

    public updateTarget(camera: CameraComponent, target: Entity | null, deltaTime: number): { position: [number, number, number]; rotation: [number, number, number]; pivot: [number, number, number]; fov: number; } {
        // 移植自 updateOrbitMode
        const targetPos = target
            ? target.getComponent<TransformComponent>('Transform')?.position || [0, 0, 0]
            : [0, 0, 0];

        // 基础参数
        const distance = camera.distance;

        // Euler Angles to Radians
        const pitchRad = camera.pitch * Math.PI / 180;
        const yawRad = camera.yaw * Math.PI / 180;

        // 计算相机相对于 Pivot 的偏移向量 (Spherical to Cartesian)
        const y = distance * Math.sin(pitchRad);
        const hDist = distance * Math.cos(pitchRad); // 水平投影距离
        const x = hDist * Math.sin(yawRad);
        const z = hDist * Math.cos(yawRad);

        // 最终位置 = 目标位置 + 手动平移偏移 + 球面旋转偏移
        const pivotX = targetPos[0] + camera.pivotOffset[0];
        const pivotY = targetPos[1] + camera.pivotOffset[1];
        const pivotZ = targetPos[2] + camera.pivotOffset[2];

        const finalX = pivotX + x;
        const finalY = pivotY + y;
        const finalZ = pivotZ + z;

        return {
            position: [finalX, finalY, finalZ],
            rotation: [camera.pitch, camera.yaw, 0],
            pivot: [pivotX, pivotY, pivotZ],
            fov: camera.fov
        };
    }
}
