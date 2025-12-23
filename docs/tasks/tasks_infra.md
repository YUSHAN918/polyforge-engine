# PolyForge v1.3.0 - 基础设施任务清单

**范围**: Phase 1-7 (核心 ECS 至资产管线)  
**最后更新**: 2025-12-23

---

## Phase 1: 核心 ECS 基础设施 ✅

- [x] 1.1 实现 Entity 和 Component 基础类型
- [x] 1.2 实现 EntityManager（CRUD + 层级管理）
- [x] 1.3 实现 SystemManager（优先级 + 更新循环）
- [x] 1.4 实现 SerializationService（JSON 序列化）
- [x] 1.5 编写完整单元测试套件

## Phase 2: 核心组件实现 ✅

- [x] 2.1 实现 TransformComponent（位置、旋转、缩放）
- [x] 2.2 实现 VisualComponent（几何体、材质、自发光）
- [x] 2.3 实现 RigComponent（骨骼树、约束系统）
- [x] 2.4 实现 PhysicsComponent（刚体、碰撞体）
- [x] 2.5 实现 VehicleComponent（轮子、引擎、悬挂）
- [x] 2.6 实现 AudioSourceComponent（音频资产、空间音频）

## Phase 3: Socket/Anchor 系统 ✅

- [x] 3.1 升级 TransformComponent（4x4 矩阵、脏标记）
- [x] 3.2 实现 HierarchySystem（层级深度排序、世界矩阵更新）
- [x] 3.3 实现 Socket 系统（attachToSocket、detachFromSocket）
- [x] 3.4 实现层级变换传播（父变换自动传播到子实体）
- [x] 3.5 编写完整单元测试（5 个测试套件）

## Phase 4: Clock 时钟系统 ✅

- [x] 4.1 实现 Clock 类（时间追踪、TimeScale、暂停/恢复）
- [x] 4.2 集成 SystemManager（自动调用 clock.tick()）
- [x] 4.3 实现 TimeScale 回调（音频系统等可监听变化）
- [x] 4.4 实现 FPS 计算（实时帧率监控）
- [x] 4.5 编写完整单元测试（5 个测试套件）

## Phase 5: CommandManager 命令系统 ✅

- [x] 5.1 实现 CommandManager（撤销/重做栈管理）
- [x] 5.2 实现 CreateEntityCommand（创建实体命令）
- [x] 5.3 实现 DeleteEntityCommand（删除实体命令，智能快照恢复）
- [x] 5.4 实现 ModifyComponentCommand（修改组件属性命令）
- [x] 5.5 实现 AttachToSocketCommand（Socket 附加命令）
- [x] 5.6 编写完整单元测试（6 个测试套件）

## Phase 6: InputMappingSystem 输入系统 ✅

- [x] 6.1 实现 InputSystem（全局键盘/鼠标事件监听）
- [x] 6.2 实现 InputAction 映射（按键到动作的映射系统）
- [x] 6.3 实现多套预设（default, blender, game 预设）
- [x] 6.4 实现上下文栈（支持输入上下文切换）
- [x] 6.5 集成 Command（Ctrl+Z/Y 自动撤销/重做）
- [x] 6.6 创建完整演示（方向键移动方块）

## Phase 7: AssetRegistry 资产管线 ✅

- [x] 7.1 实现 IndexedDBStorage（原生 IndexedDB 封装 v2，含指纹表）
- [x] 7.2 实现 ModelImporter（GLB/GLTF 导入 + Draco 压缩）
- [x] 7.3 实现 AudioImporter（MP3/WAV/OGG 导入 + 元数据解析）
- [x] 7.4 实现 HDRImporter（HDR 环境贴图 + PMREMGenerator）
- [x] 7.5 实现 AssetRegistry（单例注册表 + 三层缓存 + 内容去重）
- [x] 7.6 实现 FileSystemService（本地文件夹扫描 + 批量导入）
- [x] 7.7 编写集成测试（15 个测试，100% 通过）

---

**制作人**: YUSHAN  
**最后审计**: 2025-12-23
