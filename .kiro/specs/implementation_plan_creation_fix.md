# 实施方案 - 创造模式视觉修复

**目标**: 修复创造模式下植被投影不同步的问题，优化 Orbit 相机缩放手感，并解决太阳阴影切分问题。

## 用户审查 (User Review Required)
> [!NOTE]
> **Orbit 相机“缩放瞬移”**: 这种“瞬移感”是由于 `CameraSystem` 中的“自适应阻尼 (Adaptive Damping)”机制导致的。当目标距离变化过大（如快速滚轮）时，它会判定为“掉队”并强制加速。为了保证电影级的丝滑感，我们将**仅在 Orbit 模式下**禁用此加速机制。

## 建议变更 (Proposed Changes)

### 渲染层 (Rendering)

#### [修改] [VegetationVisual.tsx](file:///f:/%E5%B7%A5%E4%BD%9C/LOW3D%E7%BC%96%E8%BE%91%E6%96%87%E4%BB%B6%E5%82%A8%E5%AD%98%E7%82%B9/polyforge-engine-v130-251230/src/components/rendering/VegetationVisual.tsx)
- 创建 `customDepthMaterial` (基于 `THREE.MeshDepthMaterial`)。
- 在 `onBeforeCompile` 中注入逻辑：
    - 注入 `uGlobalScale` uniform 变量。
    - 注入顶点位移逻辑 (Vertex Displacement)，确保深度计算与主材质的形变一致。
    - 注入风场摆动 (Wind Sway)，确保影子动态同步。
- 将 `customDepthMaterial` 传递给 `<instancedMesh>` 的 `customDepthMaterial` 属性。
- 在 `useFrame` 中同时更新主材质和深度材质的 `uGlobalScale` 和 `time`。

#### [MODIFY] [EngineBridge.tsx](file:///f:/%E5%B7%A5%E4%BD%9C/LOW3D%E7%BC%96%E8%BE%91%E6%96%87%E4%BB%B6%E5%82%A8%E5%AD%98%E7%82%B9/polyforge-engine-v130-251230/src/components/rendering/EngineBridge.tsx)
-   **Dynamic Shadow Focus (Infinite World Logic)**:
    -   In `useFrame`, retrieve the `currentPivot` from `CameraSystem` (via `archValidationManager`).
    -   Update `directionalLight.position` to be relative to this `pivot`.
    -   Update `directionalLight.target.position` to match this `pivot`.
    -   Ensure `directionalLight.target.updateMatrixWorld()` is called.
-   Keep `shadow-camera` bounds at `[-50, 50]` (100m coverage around player is sufficient).
-   Use `shadow-bias` of `-0.0005`.

### 核心系统 (Core Systems)

#### [修改] [CameraSystem.ts](file:///f:/%E5%B7%A5%E4%BD%9C/LOW3D%E7%BC%96%E8%BE%91%E6%96%87%E4%BB%B6%E5%AD%98%E7%82%B9/polyforge-engine-v130-251230/src/core/systems/CameraSystem.ts)
- 修改 `smoothUpdate` 方法。
- 添加逻辑判断：如果 `camera.mode === 'orbit'`，则**跳过**“自适应阻尼 (Adaptive Damping)”加速块。确保 Orbit 模式始终使用固定的线性阻尼系数，提供一致的阻尼手感。

## 验证计划 (Verification Plan)

### 手动验证 (Manual Verification)
1.  **植被投影 (Vegetation Shadows)**:
    - 进入创造模式。
    - 生成草地。
    - 调节缩放滑块 (Scale) **变大**。 -> **验证**: 地面阴影同步变大。
    - 调节缩放滑块 (Scale) **变小**。 -> **验证**: 地面阴影同步变小。
2.  **Orbit 缩放 (Orbit Zoom)**:
    - 进入创造模式 (Orbit)。
    - 快速滚动鼠标滚轮。
    - **验证**: 镜头推拉过程平滑，具有惯性，无突兀跳变。
3.  **Sun Shadow Cuts & Scalability**:
    -   Enter Director Mode.
    -   Move camera to the edge of the map (e.g., maintain distance but pan far).
    -   Drag Time Slider.
    -   **Verify**: Shadows remain sharp and visible around the camera center, even if the camera is far from `[0,0,0]`.
    -   **Verify**: No "swimming" or clipping of shadows on vegetation near the camera.
