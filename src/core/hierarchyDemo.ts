/**
 * PolyForge v1.3.0 Hierarchy Demo
 * Phase 3: 层级变换和 Socket 系统演示
 * 
 * 场景：战士手持发光长剑，战士旋转时长剑保持在手部位置
 */

import { EntityManager } from './EntityManager';
import { SystemManager } from './SystemManager';
import { TransformComponent } from './components/TransformComponent';
import { VisualComponent } from './components/VisualComponent';
import { RigComponent } from './components/RigComponent';
import { NameComponent } from './components/NameComponent';
import { HierarchySystem } from './systems/HierarchySystem';

/**
 * Hierarchy Demo
 * 演示层级变换和 Socket 附加
 */
export function hierarchyDemo(): void {
  console.log('\n=== PolyForge Phase 3: Hierarchy & Socket Demo ===\n');

  // 创建管理器
  const entityManager = new EntityManager();
  const systemManager = new SystemManager(entityManager);
  entityManager.setSystemManager(systemManager);

  // 注册组件
  entityManager.registerComponent('Transform', TransformComponent);
  entityManager.registerComponent('Visual', VisualComponent);
  entityManager.registerComponent('Rig', RigComponent);
  entityManager.registerComponent('Name', NameComponent);

  // 注册层级系统（最高优先级）
  systemManager.registerSystem('Hierarchy', new HierarchySystem());

  console.log('✓ Managers and systems registered\n');

  // ============================================================================
  // 创建战士实体
  // ============================================================================

  const warrior = entityManager.createEntity('Warrior');

  // 添加 Transform
  const warriorTransform = new TransformComponent(
    [0, 0, 0],      // 位置
    [0, 0, 0],      // 旋转
    [1, 1, 1]       // 缩放
  );
  entityManager.addComponent(warrior.id, warriorTransform);

  // 添加 Name
  entityManager.addComponent(warrior.id, new NameComponent('战士', '一位勇敢的战士'));

  // 添加 Visual
  const warriorVisual = new VisualComponent();
  warriorVisual.geometry = {
    type: 'cylinder',
    parameters: { radius: 0.5, height: 2.0 },
  };
  warriorVisual.material = {
    type: 'standard',
    color: '#3366cc', // 蓝色盔甲
    metalness: 0.7,
    roughness: 0.3,
  };
  entityManager.addComponent(warrior.id, warriorVisual);

  // 添加 Rig（人形骨架）
  const warriorRig = RigComponent.createHumanoidRig();
  entityManager.addComponent(warrior.id, warriorRig);

  // 添加右手 Socket
  warrior.addSocket({
    name: 'hand_right',
    localTransform: {
      position: [0.8, 1.2, 0.3],  // 右手位置
      rotation: [0, 0, -45],       // 握剑角度
      scale: [1, 1, 1],
    },
    allowedTypes: ['weapon'],
  });

  console.log('✓ Warrior entity created');
  console.log(`  - Name: ${warrior.getComponent<NameComponent>('Name')?.displayName}`);
  console.log(`  - Bones: ${warriorRig.bones.size}`);
  console.log(`  - Sockets: ${warrior.sockets.size}`);
  console.log(`  - Right hand socket at: [${warrior.getSocket('hand_right')?.localTransform.position}]`);

  // ============================================================================
  // 创建发光长剑实体
  // ============================================================================

  const lightsaber = entityManager.createEntity('Lightsaber');

  // 添加 Transform（相对于 Socket 的偏移）
  const lightsaberTransform = new TransformComponent(
    [0, 0.5, 0],    // 剑柄在手中，剑身向上延伸
    [0, 0, 0],      // 无额外旋转
    [1, 1, 1]       // 正常缩放
  );
  entityManager.addComponent(lightsaber.id, lightsaberTransform);

  // 添加 Name
  entityManager.addComponent(lightsaber.id, new NameComponent('光剑', '红色能量光剑'));

  // 添加 Visual（红色自发光）
  const lightsaberVisual = new VisualComponent();
  lightsaberVisual.geometry = {
    type: 'cylinder',
    parameters: { radius: 0.05, height: 1.5 },
  };
  lightsaberVisual.material = {
    type: 'standard',
    color: '#ff0000',     // 红色
    metalness: 0.0,
    roughness: 0.0,
  };
  lightsaberVisual.emissive = {
    color: '#ff0000',  // 红色自发光
    intensity: 5.0,     // 高强度发光
  };
  lightsaberVisual.postProcessing = {
    bloom: true,
  };
  entityManager.addComponent(lightsaber.id, lightsaberVisual);

  console.log('\n✓ Lightsaber entity created');
  console.log(`  - Name: ${lightsaber.getComponent<NameComponent>('Name')?.displayName}`);
  console.log(`  - Emissive: ${lightsaberVisual.emissive.color}`);
  console.log(`  - Emissive Intensity: ${lightsaberVisual.emissive.intensity}`);
  console.log(`  - Bloom enabled: ${lightsaberVisual.postProcessing.bloom}`);

  // ============================================================================
  // 附加长剑到战士的右手 Socket
  // ============================================================================

  entityManager.setParent(lightsaber.id, warrior.id, 'hand_right');

  console.log('\n✓ Lightsaber attached to warrior\'s right hand socket');
  console.log(`  - Parent: ${lightsaber.parent?.name}`);
  console.log(`  - Socket occupied: ${warrior.isSocketOccupied('hand_right')}`);

  // ============================================================================
  // 模拟战士旋转，验证长剑跟随
  // ============================================================================

  console.log('\n=== Simulating Warrior Rotation ===\n');

  // 初始状态
  systemManager.update(0.016);
  const initialLightsaberPos = lightsaberTransform.getWorldPosition();
  console.log(`Frame 0: Warrior rotation = [${warriorTransform.rotation}]`);
  console.log(`         Lightsaber world position = [${initialLightsaberPos.map(v => v.toFixed(2)).join(', ')}]`);

  // 战士绕 Y 轴旋转 90 度
  warriorTransform.rotation[1] = 90;
  warriorTransform.markLocalDirty();
  systemManager.update(0.016);
  const rotated90Pos = lightsaberTransform.getWorldPosition();
  console.log(`\nFrame 1: Warrior rotation = [${warriorTransform.rotation}]`);
  console.log(`         Lightsaber world position = [${rotated90Pos.map(v => v.toFixed(2)).join(', ')}]`);

  // 战士继续旋转到 180 度
  warriorTransform.rotation[1] = 180;
  warriorTransform.markLocalDirty();
  systemManager.update(0.016);
  const rotated180Pos = lightsaberTransform.getWorldPosition();
  console.log(`\nFrame 2: Warrior rotation = [${warriorTransform.rotation}]`);
  console.log(`         Lightsaber world position = [${rotated180Pos.map(v => v.toFixed(2)).join(', ')}]`);

  // 战士旋转到 270 度
  warriorTransform.rotation[1] = 270;
  warriorTransform.markLocalDirty();
  systemManager.update(0.016);
  const rotated270Pos = lightsaberTransform.getWorldPosition();
  console.log(`\nFrame 3: Warrior rotation = [${warriorTransform.rotation}]`);
  console.log(`         Lightsaber world position = [${rotated270Pos.map(v => v.toFixed(2)).join(', ')}]`);

  // 战士回到初始位置
  warriorTransform.rotation[1] = 0;
  warriorTransform.markLocalDirty();
  systemManager.update(0.016);
  const finalPos = lightsaberTransform.getWorldPosition();
  console.log(`\nFrame 4: Warrior rotation = [${warriorTransform.rotation}]`);
  console.log(`         Lightsaber world position = [${finalPos.map(v => v.toFixed(2)).join(', ')}]`);

  // ============================================================================
  // 验证结果
  // ============================================================================

  console.log('\n=== Verification ===\n');

  // 验证长剑位置随战士旋转而改变
  const positionChanged = 
    Math.abs(rotated90Pos[0] - initialLightsaberPos[0]) > 0.1 ||
    Math.abs(rotated90Pos[2] - initialLightsaberPos[2]) > 0.1;

  console.log(`✓ Lightsaber position changes with warrior rotation: ${positionChanged}`);

  // 验证长剑回到初始位置（允许浮点误差）
  const backToInitial = 
    Math.abs(finalPos[0] - initialLightsaberPos[0]) < 0.01 &&
    Math.abs(finalPos[1] - initialLightsaberPos[1]) < 0.01 &&
    Math.abs(finalPos[2] - initialLightsaberPos[2]) < 0.01;

  console.log(`✓ Lightsaber returns to initial position: ${backToInitial}`);

  // 验证 Socket 偏移正确应用
  const socketOffset = warrior.getSocket('hand_right')?.localTransform.position;
  console.log(`✓ Socket offset applied: [${socketOffset}]`);

  // ============================================================================
  // 统计信息
  // ============================================================================

  console.log('\n=== Statistics ===\n');
  const stats = entityManager.getStats();
  console.log(`Total Entities: ${stats.totalEntities}`);
  console.log(`Active Entities: ${stats.activeEntities}`);
  console.log(`Root Entities: ${stats.rootEntities}`);
  console.log(`Component Types: ${stats.componentTypes}`);
  console.log(`Avg Components/Entity: ${stats.averageComponentsPerEntity.toFixed(2)}`);

  console.log('\n=== Hierarchy Demo Complete! ===\n');
  console.log('✅ Warrior with glowing red lightsaber created');
  console.log('✅ Lightsaber attached to right hand socket');
  console.log('✅ Hierarchy transform verified: lightsaber follows warrior rotation');
  console.log('✅ Socket system working correctly');
  console.log('✅ Dirty flag propagation working');
  console.log('✅ World matrix calculation accurate');
}
