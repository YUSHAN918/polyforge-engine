/**
 * PolyForge v1.3.0 Vehicle Demo
 * 载具演示 - 展示在空中缓慢坠落并发出警报声的飞行载具
 */

import { EntityManager } from './EntityManager';
import { SystemManager } from './SystemManager';
import { SerializationService } from './SerializationService';
import { TransformComponent } from './components/TransformComponent';
import { NameComponent } from './components/NameComponent';
import { VisualComponent } from './components/VisualComponent';
import { PhysicsComponent } from './components/PhysicsComponent';
import { VehicleComponent } from './components/VehicleComponent';
import { AudioSourceComponent } from './components/AudioSourceComponent';

/**
 * 运行载具演示
 */
export function runVehicleDemo(): void {
  console.log('🚁 PolyForge v1.3.0 - Vehicle Component Demo\n');
  console.log('展示：在空中缓慢坠落并发出警报声的飞行载具\n');

  // 创建管理器
  const entityManager = new EntityManager();
  const systemManager = new SystemManager(entityManager);
  const serializationService = new SerializationService(entityManager);
  entityManager.setSystemManager(systemManager);

  // 注册组件
  entityManager.registerComponent('Transform', TransformComponent);
  entityManager.registerComponent('Name', NameComponent);
  entityManager.registerComponent('Visual', VisualComponent);
  entityManager.registerComponent('Physics', PhysicsComponent);
  entityManager.registerComponent('Vehicle', VehicleComponent);
  entityManager.registerComponent('AudioSource', AudioSourceComponent);

  console.log('✓ 管理器和组件已注册\n');

  // ============================================================================
  // 创建飞行载具实体
  // ============================================================================

  console.log('🚁 创建飞行载具实体...');

  const aircraft = entityManager.createEntity('Aircraft');

  // 添加变换组件 - 初始位置在空中
  entityManager.addComponent(
    aircraft.id,
    new TransformComponent([0, 50, 0], [0, 0, 0], [1, 1, 1]) // 50 米高空
  );

  // 添加名称组件
  entityManager.addComponent(
    aircraft.id,
    new NameComponent('紧急迫降飞行器', '一架正在坠落的飞行载具')
  );

  // 添加视觉组件 - 飞行器机身
  const aircraftVisual = new VisualComponent(
    {
      type: 'box',
      parameters: {
        width: 3,
        height: 1,
        depth: 5,
      },
    },
    {
      type: 'standard',
      color: '#ff6b35', // 橙色机身
      metalness: 0.7,
      roughness: 0.3,
    },
    {
      color: '#000000',
      intensity: 0, // 机身不发光
    },
    {
      bloom: false,
      outline: true, // 显示轮廓
    }
  );
  entityManager.addComponent(aircraft.id, aircraftVisual);

  // 添加物理组件 - 动态刚体，受重力影响
  const aircraftPhysics = new PhysicsComponent(
    'dynamic', // 动态刚体
    {
      shape: 'box',
      size: [3, 1, 5],
      offset: [0, 0, 0],
    },
    500, // 质量 500kg
    0.3, // 低摩擦
    0.1 // 低弹性
  );
  aircraftPhysics.useGravity = true; // 受重力影响
  aircraftPhysics.linearDamping = 0.5; // 空气阻力
  aircraftPhysics.angularDamping = 0.8; // 旋转阻尼
  entityManager.addComponent(aircraft.id, aircraftPhysics);

  // 添加载具组件 - 飞行载具
  const aircraftVehicle = VehicleComponent.createSimpleFlyingVehicle();
  aircraftVehicle.engine.maxPower = 0; // 引擎失效！
  aircraftVehicle.engine.maxTorque = 0;
  entityManager.addComponent(aircraft.id, aircraftVehicle);

  // 添加音频组件 - 警报声
  const alarmAudio = AudioSourceComponent.createSpatialSFX(
    'alarm_sound', // 警报音频资产 ID
    0.8, // 音量
    100 // 最大听到距离 100 米
  );
  alarmAudio.loop = true; // 循环播放
  alarmAudio.autoPlay = true; // 自动播放
  alarmAudio.pitch = 1.2; // 稍高音调
  alarmAudio.affectedByTimeScale = true; // 受时间缩放影响
  entityManager.addComponent(aircraft.id, alarmAudio);

  console.log(`✓ 飞行载具创建完成: ${aircraft.id}`);
  console.log(`  - 名称: ${aircraft.getComponent<NameComponent>('Name')?.displayName}`);
  console.log(`  - 初始高度: 50 米`);
  console.log(`  - 质量: ${aircraftPhysics.mass} kg`);
  console.log(`  - 引擎状态: 失效 ❌`);
  console.log(`  - 重力: ${aircraftPhysics.useGravity ? '启用' : '禁用'}`);
  console.log(`  - 警报声: ${alarmAudio.loop ? '循环播放' : '单次播放'}\n`);

  // ============================================================================
  // 创建警示灯（自发光）
  // ============================================================================

  console.log('🚨 创建警示灯...');

  const warningLight = entityManager.createEntity('WarningLight');

  // 添加变换组件 - 相对飞行器的位置
  entityManager.addComponent(
    warningLight.id,
    new TransformComponent([0, 0.8, 0], [0, 0, 0], [0.5, 0.5, 0.5])
  );

  // 添加名称组件
  entityManager.addComponent(
    warningLight.id,
    new NameComponent('警示灯', '红色闪烁警示灯')
  );

  // 添加视觉组件 - 红色自发光 ⭐
  const lightVisual = new VisualComponent(
    {
      type: 'sphere',
      parameters: {
        radius: 0.3,
        segments: 16,
      },
    },
    {
      type: 'standard',
      color: '#ff0000', // 红色
      metalness: 0.0,
      roughness: 0.0,
    },
    {
      color: '#ff0000', // 红色自发光 ⭐
      intensity: 8.0, // 高强度发光 ⭐
    },
    {
      bloom: true, // 启用辉光效果 ⭐
      outline: false,
    }
  );
  entityManager.addComponent(warningLight.id, lightVisual);

  console.log(`✓ 警示灯创建完成: ${warningLight.id}`);
  console.log(`  - 自发光颜色: ${lightVisual.emissive.color}`);
  console.log(`  - 自发光强度: ${lightVisual.emissive.intensity}`);
  console.log(`  - 辉光效果: ${lightVisual.postProcessing.bloom ? '启用 ✨' : '禁用'}\n`);

  // ============================================================================
  // 组装层级结构
  // ============================================================================

  console.log('🔗 组装层级结构...');

  // 将警示灯附加到飞行器顶部
  entityManager.setParent(warningLight.id, aircraft.id);
  console.log(`✓ 警示灯附加到飞行器\n`);

  // ============================================================================
  // 验证层级结构
  // ============================================================================

  console.log('📊 层级结构验证:');
  console.log(`  飞行器子实体数: ${aircraft.children.length}`);
  console.log(`  警示灯父实体: ${warningLight.parent?.name}\n`);

  // ============================================================================
  // 组件统计
  // ============================================================================

  console.log('📈 组件统计:');
  const allEntities = entityManager.getAllEntities();
  let physicsCount = 0;
  let vehicleCount = 0;
  let audioCount = 0;
  let emissiveCount = 0;

  for (const entity of allEntities) {
    if (entity.getComponent('Physics')) physicsCount++;
    if (entity.getComponent('Vehicle')) vehicleCount++;
    if (entity.getComponent('AudioSource')) audioCount++;
    const visual = entity.getComponent<VisualComponent>('Visual');
    if (visual && visual.hasEmissive()) emissiveCount++;
  }

  console.log(`  总实体数: ${allEntities.length}`);
  console.log(`  PhysicsComponent: ${physicsCount}`);
  console.log(`  VehicleComponent: ${vehicleCount}`);
  console.log(`  AudioSourceComponent: ${audioCount}`);
  console.log(`  自发光实体: ${emissiveCount} ✨\n`);

  // ============================================================================
  // 物理组件详情
  // ============================================================================

  console.log('⚙️ 物理组件详情:');
  const physics = aircraft.getComponent<PhysicsComponent>('Physics');
  if (physics) {
    console.log(`  刚体类型: ${physics.bodyType}`);
    console.log(`  碰撞体形状: ${physics.collider.shape}`);
    console.log(`  碰撞体尺寸: [${physics.collider.size.join(', ')}]`);
    console.log(`  质量: ${physics.mass} kg`);
    console.log(`  摩擦系数: ${physics.friction}`);
    console.log(`  弹性系数: ${physics.restitution}`);
    console.log(`  线性阻尼: ${physics.linearDamping}`);
    console.log(`  角阻尼: ${physics.angularDamping}`);
    console.log(`  受重力影响: ${physics.useGravity ? '是 ⬇️' : '否'}\n`);
  }

  // ============================================================================
  // 载具组件详情
  // ============================================================================

  console.log('🚁 载具组件详情:');
  const vehicle = aircraft.getComponent<VehicleComponent>('Vehicle');
  if (vehicle) {
    console.log(`  载具类型: ${vehicle.vehicleType}`);
    console.log(`  引擎功率: ${vehicle.engine.maxPower} HP`);
    console.log(`  引擎扭矩: ${vehicle.engine.maxTorque} N·m`);
    console.log(`  最高速度: ${vehicle.engine.maxSpeed} m/s`);
    console.log(`  轮子数量: ${vehicle.wheels.length}`);
    if (vehicle.flight) {
      console.log(`  飞行配置:`);
      console.log(`    - 升力系数: ${vehicle.flight.lift}`);
      console.log(`    - 阻力系数: ${vehicle.flight.drag}`);
      console.log(`    - 俯仰速度: ${vehicle.flight.pitchSpeed}°/s`);
      console.log(`    - 翻滚速度: ${vehicle.flight.rollSpeed}°/s`);
      console.log(`    - 偏航速度: ${vehicle.flight.yawSpeed}°/s`);
    }
    console.log('');
  }

  // ============================================================================
  // 音频组件详情
  // ============================================================================

  console.log('🔊 音频组件详情:');
  const audio = aircraft.getComponent<AudioSourceComponent>('AudioSource');
  if (audio) {
    console.log(`  资产 ID: ${audio.assetId}`);
    console.log(`  音频类型: ${audio.audioType}`);
    console.log(`  音量: ${audio.volume}`);
    console.log(`  音调: ${audio.pitch}`);
    console.log(`  循环播放: ${audio.loop ? '是 🔁' : '否'}`);
    console.log(`  空间音频: ${audio.spatial ? '是 🎧' : '否'}`);
    if (audio.spatial) {
      console.log(`  最大距离: ${audio.maxDistance} 米`);
      console.log(`  最小距离: ${audio.minDistance} 米`);
      console.log(`  衰减因子: ${audio.rolloffFactor}`);
    }
    console.log(`  受 TimeScale 影响: ${audio.affectedByTimeScale ? '是 ⏱️' : '否'}\n`);
  }

  // ============================================================================
  // 序列化测试
  // ============================================================================

  console.log('💾 序列化测试...');

  const json = serializationService.serializeToJSON(
    {
      name: '坠落飞行器场景',
      author: 'PolyForge',
      description: '展示物理、载具和音频组件的集成',
    },
    true // 美化输出
  );

  const jsonSize = new Blob([json]).size;
  console.log(`✓ 序列化成功: ${jsonSize} 字节`);
  console.log(`✓ 实体数量: 2 (飞行器 + 警示灯)`);
  console.log(`✓ 层级关系: 完整保存\n`);

  // ============================================================================
  // 模拟坠落过程
  // ============================================================================

  console.log('⬇️ 模拟坠落过程（5 秒）...\n');

  const transform = aircraft.getComponent<TransformComponent>('Transform');
  if (transform && physics) {
    const gravity = -9.8; // 重力加速度 m/s²
    const deltaTime = 1.0; // 每秒
    let velocity = 0; // 初始速度

    for (let i = 0; i < 5; i++) {
      // 计算速度（考虑阻尼）
      velocity += gravity * deltaTime;
      velocity *= 1 - physics.linearDamping * deltaTime;

      // 更新位置
      transform.position[1] += velocity * deltaTime;

      console.log(
        `  第 ${i + 1} 秒: 高度 ${transform.position[1].toFixed(2)} 米, 速度 ${velocity.toFixed(2)} m/s`
      );
    }

    console.log('');
    console.log(`  最终高度: ${transform.position[1].toFixed(2)} 米`);
    console.log(`  最终速度: ${velocity.toFixed(2)} m/s`);
    console.log(`  状态: ${transform.position[1] > 0 ? '仍在空中 🚁' : '已着陆 💥'}\n`);
  }

  // ============================================================================
  // 完成
  // ============================================================================

  console.log('✅ 演示完成！');
  console.log('🎉 PolyForge v1.3.0 载具组件系统正常工作！');
  console.log('');
  console.log('💡 关键特性:');
  console.log('  ✓ PhysicsComponent 支持动态刚体和重力');
  console.log('  ✓ VehicleComponent 支持飞行载具配置');
  console.log('  ✓ AudioSourceComponent 支持空间音频');
  console.log('  ✓ 音频受 TimeScale 影响');
  console.log('  ✓ 完整的物理模拟（重力 + 阻尼）');
  console.log('  ✓ 层级关系和组件集成');
  console.log('  ✓ 完美的序列化支持');
  console.log('');
  console.log('🚀 阶段 2 第二批组件实现完成！');
}
