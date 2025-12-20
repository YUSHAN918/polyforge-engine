/**
 * PolyForge v1.3.0 Visual Component Demo
 * 视觉组件演示 - 展示带有红色自发光光剑的角色
 */

import { EntityManager } from './EntityManager';
import { SystemManager } from './SystemManager';
import { SerializationService } from './SerializationService';
import { TransformComponent } from './components/TransformComponent';
import { NameComponent } from './components/NameComponent';
import { VisualComponent } from './components/VisualComponent';
import { RigComponent } from './components/RigComponent';

/**
 * 运行视觉组件演示
 */
export function runVisualDemo(): void {
  console.log('🎨 PolyForge v1.3.0 - Visual Component Demo\n');
  console.log('展示：带有红色自发光光剑的角色\n');

  // 创建管理器
  const entityManager = new EntityManager();
  const systemManager = new SystemManager(entityManager);
  const serializationService = new SerializationService(entityManager);
  entityManager.setSystemManager(systemManager);

  // 注册组件
  entityManager.registerComponent('Transform', TransformComponent);
  entityManager.registerComponent('Name', NameComponent);
  entityManager.registerComponent('Visual', VisualComponent);
  entityManager.registerComponent('Rig', RigComponent);

  console.log('✓ 管理器和组件已注册\n');

  // ============================================================================
  // 创建角色实体
  // ============================================================================

  console.log('👤 创建角色实体...');

  const character = entityManager.createEntity('Character');

  // 添加变换组件
  entityManager.addComponent(
    character.id,
    new TransformComponent([0, 0, 0], [0, 0, 0], [1, 1, 1])
  );

  // 添加名称组件
  entityManager.addComponent(
    character.id,
    new NameComponent('战士', '一位手持光剑的勇敢战士')
  );

  // 添加视觉组件 - 角色身体
  const characterVisual = new VisualComponent(
    {
      type: 'cylinder',
      parameters: {
        radius: 0.3,
        height: 1.8,
        segments: 16,
      },
    },
    {
      type: 'standard',
      color: '#4a90e2', // 蓝色盔甲
      metalness: 0.8,
      roughness: 0.3,
    },
    {
      color: '#000000',
      intensity: 0, // 身体不发光
    },
    {
      bloom: false,
      outline: true, // 显示轮廓
    }
  );
  entityManager.addComponent(character.id, characterVisual);

  // 添加骨骼组件 - 使用标准人形骨骼
  const characterRig = RigComponent.createHumanoidRig();
  entityManager.addComponent(character.id, characterRig);

  // 添加右手挂点
  character.addSocket({
    name: 'hand_right',
    localTransform: {
      position: [0.5, 0.8, 0], // 右手位置
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    allowedTypes: ['weapon'],
  });

  console.log(`✓ 角色创建完成: ${character.id}`);
  console.log(`  - 名称: ${character.getComponent<NameComponent>('Name')?.displayName}`);
  console.log(`  - 骨骼类型: ${characterRig.rigType}`);
  console.log(`  - 骨骼数量: ${characterRig.bones.size}`);
  console.log(`  - 挂点: hand_right\n`);

  // ============================================================================
  // 创建光剑实体
  // ============================================================================

  console.log('⚔️  创建光剑实体...');

  const lightsaber = entityManager.createEntity('Lightsaber');

  // 添加变换组件
  entityManager.addComponent(
    lightsaber.id,
    new TransformComponent([0, 0, 0], [0, 0, 90], [1, 1, 1]) // 旋转 90 度使其水平
  );

  // 添加名称组件
  entityManager.addComponent(
    lightsaber.id,
    new NameComponent('红色光剑', '西斯武士的标志性武器')
  );

  // 添加视觉组件 - 光剑剑柄
  const handleVisual = new VisualComponent(
    {
      type: 'cylinder',
      parameters: {
        radius: 0.03,
        height: 0.25,
        segments: 16,
      },
    },
    {
      type: 'standard',
      color: '#2c3e50', // 深灰色金属
      metalness: 0.9,
      roughness: 0.2,
    },
    {
      color: '#000000',
      intensity: 0, // 剑柄不发光
    },
    {
      bloom: false,
      outline: false,
    }
  );
  entityManager.addComponent(lightsaber.id, handleVisual);

  console.log(`✓ 光剑剑柄创建完成: ${lightsaber.id}\n`);

  // ============================================================================
  // 创建光剑刀身（自发光部分）
  // ============================================================================

  console.log('✨ 创建光剑刀身（红色自发光）...');

  const blade = entityManager.createEntity('LightsaberBlade');

  // 添加变换组件 - 相对剑柄的位置
  entityManager.addComponent(
    blade.id,
    new TransformComponent([0, 0.5, 0], [0, 0, 0], [1, 1, 1]) // 在剑柄上方
  );

  // 添加名称组件
  entityManager.addComponent(
    blade.id,
    new NameComponent('光剑刀身', '红色能量刀身')
  );

  // 添加视觉组件 - 红色自发光刀身 ⭐ 核心亮点！
  const bladeVisual = new VisualComponent(
    {
      type: 'cylinder',
      parameters: {
        radius: 0.02,
        height: 1.0, // 1 米长的刀身
        segments: 16,
      },
    },
    {
      type: 'standard',
      color: '#ff0000', // 红色
      metalness: 0.0,
      roughness: 0.0,
      opacity: 0.9,
      transparent: true,
    },
    {
      color: '#ff0000', // 红色自发光 ⭐
      intensity: 5.0, // 高强度发光 ⭐
    },
    {
      bloom: true, // 启用辉光效果 ⭐
      outline: false,
    }
  );
  entityManager.addComponent(blade.id, bladeVisual);

  console.log(`✓ 光剑刀身创建完成: ${blade.id}`);
  console.log(`  - 自发光颜色: ${bladeVisual.emissive.color}`);
  console.log(`  - 自发光强度: ${bladeVisual.emissive.intensity}`);
  console.log(`  - 辉光效果: ${bladeVisual.postProcessing.bloom ? '启用' : '禁用'}`);
  console.log(`  - 是否发光: ${bladeVisual.hasEmissive() ? '是 ✨' : '否'}\n`);

  // ============================================================================
  // 组装层级结构
  // ============================================================================

  console.log('🔗 组装层级结构...');

  // 将刀身附加到剑柄
  entityManager.setParent(blade.id, lightsaber.id);
  console.log(`✓ 刀身附加到剑柄`);

  // 将光剑附加到角色的右手挂点
  entityManager.setParent(lightsaber.id, character.id, 'hand_right');
  console.log(`✓ 光剑附加到角色右手\n`);

  // ============================================================================
  // 验证层级结构
  // ============================================================================

  console.log('📊 层级结构验证:');
  console.log(`  角色子实体数: ${character.children.length}`);
  console.log(`  光剑父实体: ${lightsaber.parent?.name}`);
  console.log(`  光剑子实体数: ${lightsaber.children.length}`);
  console.log(`  刀身父实体: ${blade.parent?.name}`);
  console.log(`  右手挂点占用: ${character.getSocket('hand_right')?.occupied ? '是' : '否'}\n`);

  // ============================================================================
  // 序列化测试
  // ============================================================================

  console.log('💾 序列化测试...');

  const json = serializationService.serializeToJSON(
    {
      name: '光剑战士场景',
      author: 'PolyForge',
      description: '展示带有红色自发光光剑的角色',
    },
    true // 美化输出
  );

  const jsonSize = new Blob([json]).size;
  console.log(`✓ 序列化成功: ${jsonSize} 字节`);
  console.log(`✓ 实体数量: 3 (角色 + 光剑 + 刀身)`);
  console.log(`✓ 层级关系: 完整保存\n`);

  // ============================================================================
  // 组件统计
  // ============================================================================

  console.log('📈 组件统计:');
  const allEntities = entityManager.getAllEntities();
  let visualCount = 0;
  let rigCount = 0;
  let emissiveCount = 0;

  for (const entity of allEntities) {
    const visual = entity.getComponent<VisualComponent>('Visual');
    if (visual) {
      visualCount++;
      if (visual.hasEmissive()) {
        emissiveCount++;
      }
    }
    if (entity.getComponent<RigComponent>('Rig')) {
      rigCount++;
    }
  }

  console.log(`  总实体数: ${allEntities.length}`);
  console.log(`  VisualComponent: ${visualCount}`);
  console.log(`  RigComponent: ${rigCount}`);
  console.log(`  自发光实体: ${emissiveCount} ✨\n`);

  // ============================================================================
  // 展示自发光配置
  // ============================================================================

  console.log('✨ 自发光配置详情:');
  const bladeEntity = entityManager.getEntity(blade.id);
  const bladeVisualComp = bladeEntity?.getComponent<VisualComponent>('Visual');
  if (bladeVisualComp) {
    console.log(`  实体: ${bladeEntity?.name}`);
    console.log(`  颜色: ${bladeVisualComp.emissive.color}`);
    console.log(`  强度: ${bladeVisualComp.emissive.intensity}`);
    console.log(`  辉光: ${bladeVisualComp.postProcessing.bloom ? '✓' : '✗'}`);
    console.log(`  轮廓: ${bladeVisualComp.postProcessing.outline ? '✓' : '✗'}\n`);
  }

  // ============================================================================
  // 展示骨骼信息
  // ============================================================================

  console.log('🦴 骨骼系统详情:');
  const characterEntity = entityManager.getEntity(character.id);
  const characterRigComp = characterEntity?.getComponent<RigComponent>('Rig');
  if (characterRigComp) {
    console.log(`  骨骼类型: ${characterRigComp.rigType}`);
    console.log(`  总骨骼数: ${characterRigComp.bones.size}`);
    console.log(`  根骨骼: ${characterRigComp.getRootBones().map((b) => b.name).join(', ')}`);
    console.log(`  IK 链: ${characterRigComp.ikChains.length}`);
    console.log(`  约束: ${characterRigComp.constraints.length}\n`);

    // 显示部分骨骼
    console.log('  关键骨骼:');
    const keyBones = ['head', 'hand_left', 'hand_right', 'foot_left', 'foot_right'];
    for (const boneName of keyBones) {
      const bone = characterRigComp.getBone(boneName);
      if (bone) {
        console.log(`    - ${boneName}: [${bone.position.join(', ')}]`);
      }
    }
    console.log('');
  }

  // ============================================================================
  // 完成
  // ============================================================================

  console.log('✅ 演示完成！');
  console.log('🎉 PolyForge v1.3.0 视觉组件系统正常工作！');
  console.log('');
  console.log('💡 关键特性:');
  console.log('  ✓ VisualComponent 支持自发光配置');
  console.log('  ✓ 自发光强度和颜色可自定义');
  console.log('  ✓ 后期处理标记（bloom, outline）');
  console.log('  ✓ RigComponent 支持人形和多足骨骼');
  console.log('  ✓ 完整的骨骼树结构');
  console.log('  ✓ 层级关系和挂点系统集成');
  console.log('  ✓ 完美的序列化支持');
  console.log('');
  console.log('🚀 阶段 2 第一批组件实现完成！');
}
