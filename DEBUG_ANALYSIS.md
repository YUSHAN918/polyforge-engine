# ✅ 问题已解决

## 根本原因

**Component Index Not Updated**:
- `Entity.addComponent()` 不会更新 `EntityManager.componentIndex`
- 只有 `EntityManager.addComponent()` 才会调用 `addToComponentIndex()`
- 在 `ArchitectureValidationManager` 中，我们直接调用了 `entity.addComponent()`
- 这导致 `getActiveEntitiesWithComponents(['Camera', 'Transform'])` 返回空数组

## 代码证据

### EntityManager.ts - 正确方式（更新索引）
```typescript
addComponent(entityId: string, component: Component): boolean {
  entity.addComponent(component);
  this.addToComponentIndex(entityId, component.type);  // ✅ 更新索引
  this.systemManager?.notifyComponentChanged(entity, component.type, true);
}
```

### Entity.ts - 不完整（不更新索引）
```typescript
addComponent(component: Component): void {
  this.components.set(component.type, component);  // ❌ 没有索引更新
}
```

## 修复方案

### 修复前（错误）
```typescript
// ArchitectureValidationManager.ts
this.cameraEntity.addComponent(cameraTransform);  // ❌ 索引未更新
this.cameraEntity.addComponent(camera);           // ❌ 索引未更新
this.terrainEntity.addComponent(terrainTransform); // ❌ 索引未更新
```

### 修复后（正确）
```typescript
// ArchitectureValidationManager.ts
this.entityManager.addComponent(this.cameraEntity.id, cameraTransform);  // ✅
this.entityManager.addComponent(this.cameraEntity.id, camera);           // ✅
this.entityManager.addComponent(this.terrainEntity.id, terrainTransform); // ✅
this.entityManager.addComponent(this.terrainEntity.id, terrain);         // ✅
this.entityManager.addComponent(this.terrainEntity.id, terrainVisual);   // ✅
```

## 影响范围

1. **相机控制**：现在 `CameraSystem` 能正确接收到相机实体，可以处理输入并更新相机位置
2. **植被渲染**：地形实体的组件索引也被正确更新，`VegetationSystem` 可以正确查询地形高度

## 状态

✅ **已修复** - 相机控制和植被渲染应该都能正常工作了
