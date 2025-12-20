/**
 * PolyForge v1.3.0 EntityManager Tests
 * EntityManager 单元测试
 */

import { EntityManager } from '../EntityManager';
import { TransformComponent } from '../components/TransformComponent';
import { NameComponent } from '../components/NameComponent';

/**
 * 测试套件：EntityManager 基础功能
 */
export function runEntityManagerTests(): void {
  console.log('\n=== EntityManager Tests ===\n');

  testEntityCreation();
  testComponentManagement();
  testComponentQuery();
  testHierarchy();
  testSerialization();
  testEntityDestruction();

  console.log('\n=== All Tests Passed! ===\n');
}

/**
 * 测试 1：实体创建
 */
function testEntityCreation(): void {
  console.log('Test 1: Entity Creation');
  
  const manager = new EntityManager();
  
  const entity1 = manager.createEntity('Player');
  const entity2 = manager.createEntity('Enemy');
  
  console.assert(entity1.id !== entity2.id, 'Entity IDs should be unique');
  console.assert(entity1.name === 'Player', 'Entity name should match');
  console.assert(manager.getEntityCount() === 2, 'Should have 2 entities');
  
  console.log('✓ Entity creation works correctly\n');
}

/**
 * 测试 2：组件管理
 */
function testComponentManagement(): void {
  console.log('Test 2: Component Management');
  
  const manager = new EntityManager();
  manager.registerComponent('Transform', TransformComponent);
  manager.registerComponent('Name', NameComponent);
  
  const entity = manager.createEntity('TestEntity');
  
  // 添加组件
  const transform = new TransformComponent([1, 2, 3], [0, 0, 0], [1, 1, 1]);
  const name = new NameComponent('Test', 'A test entity');
  
  manager.addComponent(entity.id, transform);
  manager.addComponent(entity.id, name);
  
  console.assert(entity.hasComponent('Transform'), 'Should have Transform component');
  console.assert(entity.hasComponent('Name'), 'Should have Name component');
  console.assert(entity.components.size === 2, 'Should have 2 components');
  
  // 移除组件
  manager.removeComponent(entity.id, 'Name');
  console.assert(!entity.hasComponent('Name'), 'Should not have Name component after removal');
  console.assert(entity.components.size === 1, 'Should have 1 component');
  
  console.log('✓ Component management works correctly\n');
}

/**
 * 测试 3：组件查询
 */
function testComponentQuery(): void {
  console.log('Test 3: Component Query');
  
  const manager = new EntityManager();
  manager.registerComponent('Transform', TransformComponent);
  manager.registerComponent('Name', NameComponent);
  
  // 创建多个实体
  const entity1 = manager.createEntity('Entity1');
  const entity2 = manager.createEntity('Entity2');
  const entity3 = manager.createEntity('Entity3');
  
  // 添加不同组件组合
  manager.addComponent(entity1.id, new TransformComponent());
  manager.addComponent(entity1.id, new NameComponent());
  
  manager.addComponent(entity2.id, new TransformComponent());
  
  manager.addComponent(entity3.id, new NameComponent());
  
  // 查询
  const withTransform = manager.getEntitiesWithComponents(['Transform']);
  const withName = manager.getEntitiesWithComponents(['Name']);
  const withBoth = manager.getEntitiesWithComponents(['Transform', 'Name']);
  
  console.assert(withTransform.length === 2, 'Should find 2 entities with Transform');
  console.assert(withName.length === 2, 'Should find 2 entities with Name');
  console.assert(withBoth.length === 1, 'Should find 1 entity with both components');
  console.assert(withBoth[0].id === entity1.id, 'Should find entity1');
  
  console.log('✓ Component query works correctly\n');
}

/**
 * 测试 4：层级管理
 */
function testHierarchy(): void {
  console.log('Test 4: Hierarchy Management');
  
  const manager = new EntityManager();
  
  const parent = manager.createEntity('Parent');
  const child1 = manager.createEntity('Child1');
  const child2 = manager.createEntity('Child2');
  
  // 添加 socket
  parent.addSocket({
    name: 'slot1',
    localTransform: {
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  });
  
  // 设置父子关系
  manager.setParent(child1.id, parent.id);
  manager.setParent(child2.id, parent.id, 'slot1');
  
  console.assert(child1.parent === parent, 'Child1 parent should be set');
  console.assert(child2.parent === parent, 'Child2 parent should be set');
  console.assert(parent.children.length === 2, 'Parent should have 2 children');
  console.assert(parent.isSocketOccupied('slot1'), 'Socket should be occupied');
  
  // 移除父子关系
  manager.removeParent(child1.id);
  console.assert(child1.parent === undefined, 'Child1 should have no parent');
  console.assert(parent.children.length === 1, 'Parent should have 1 child');
  
  console.log('✓ Hierarchy management works correctly\n');
}

/**
 * 测试 5：序列化
 */
function testSerialization(): void {
  console.log('Test 5: Serialization');
  
  const manager = new EntityManager();
  manager.registerComponent('Transform', TransformComponent);
  manager.registerComponent('Name', NameComponent);
  
  // 创建实体
  const entity1 = manager.createEntity('Entity1');
  manager.addComponent(entity1.id, new TransformComponent([1, 2, 3]));
  manager.addComponent(entity1.id, new NameComponent('Test Entity'));
  
  const entity2 = manager.createEntity('Entity2');
  manager.addComponent(entity2.id, new TransformComponent([4, 5, 6]));
  
  // 序列化
  const serialized = manager.serializeAll();
  console.assert(serialized.length === 2, 'Should serialize 2 entities');
  
  // 清空并反序列化
  manager.clear();
  console.assert(manager.getEntityCount() === 0, 'Should have 0 entities after clear');
  
  manager.deserializeAll(serialized);
  console.assert(manager.getEntityCount() === 2, 'Should have 2 entities after deserialize');
  
  const restored = manager.getEntity(entity1.id);
  console.assert(restored !== undefined, 'Entity should be restored');
  console.assert(restored!.hasComponent('Transform'), 'Should have Transform component');
  console.assert(restored!.hasComponent('Name'), 'Should have Name component');
  
  const transform = restored!.getComponent<TransformComponent>('Transform');
  console.assert(transform!.position[0] === 1, 'Position should be restored');
  
  console.log('✓ Serialization works correctly\n');
}

/**
 * 测试 6：实体销毁
 */
function testEntityDestruction(): void {
  console.log('Test 6: Entity Destruction');
  
  const manager = new EntityManager();
  manager.registerComponent('Transform', TransformComponent);
  
  const parent = manager.createEntity('Parent');
  const child = manager.createEntity('Child');
  
  manager.addComponent(parent.id, new TransformComponent());
  manager.addComponent(child.id, new TransformComponent());
  
  manager.setParent(child.id, parent.id);
  
  // 销毁父实体应该同时销毁子实体
  manager.destroyEntity(parent.id);
  
  console.assert(manager.getEntityCount() === 0, 'Should have 0 entities after destroying parent');
  console.assert(manager.getEntity(parent.id) === undefined, 'Parent should be destroyed');
  console.assert(manager.getEntity(child.id) === undefined, 'Child should be destroyed');
  
  // 检查组件索引是否清理
  const withTransform = manager.getEntitiesWithComponents(['Transform']);
  console.assert(withTransform.length === 0, 'Component index should be cleared');
  
  console.log('✓ Entity destruction works correctly\n');
}
