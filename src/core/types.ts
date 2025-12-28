/**
 * PolyForge v1.3.0 Core ECS Types
 * 核心 ECS 类型定义
 */

// ============================================================================
// Component 基础接口
// ============================================================================

/**
 * 组件数据的序列化格式
 */
export interface ComponentData {
  type: string;
  enabled: boolean;
  [key: string]: any;
}

/**
 * Component 基类接口
 * 所有组件必须实现此接口
 */
export interface Component {
  /** 组件类型标识 */
  type: string;

  /** 启用状态 */
  enabled: boolean;

  /** 序列化为 JSON 数据 */
  serialize(): ComponentData;

  /** 从 JSON 数据反序列化 */
  deserialize(data: ComponentData): void;
}

// ============================================================================
// Socket/Anchor 挂点系统
// ============================================================================

/**
 * Socket 挂点定义
 */
export interface Socket {
  /** 挂点名称（如 'hand_right', 'weapon_mount'） */
  name: string;

  /** 本地变换 */
  localTransform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };

  /** 允许附加的实体类型（可选） */
  allowedTypes?: string[];

  /** 当前附加的实体 */
  occupied?: Entity;
}

// ============================================================================
// Entity 实体接口
// ============================================================================

/**
 * Entity 实体接口
 * 游戏世界中的基本对象单元
 */
export interface Entity {
  /** 唯一标识符 */
  id: string;

  /** 可读名称 */
  name: string;

  /** 组件映射 */
  components: Map<string, Component>;

  /** 父实体（用于层级） */
  parent?: Entity;

  /** 父实体的 Socket 名称 */
  parentSocket: string | null;

  /** 子实体列表 */
  children: Entity[];

  /** 挂点定义 */
  sockets: Map<string, Socket>;

  /** 激活状态 */
  active: boolean;

  /** 组件管理方法 */
  addComponent(component: Component): void;
  removeComponent(componentType: string): boolean;
  getComponent<T extends Component>(componentType: string): T | undefined;
  hasComponent(componentType: string): boolean;
  hasAllComponents(componentTypes: string[]): boolean;

  /** 层级管理方法 */
  setParent(parent: Entity, socketName?: string): void;
  removeParent(): void;
  getAllChildren(): Entity[];

  /** Socket 管理方法 */
  addSocket(socket: Socket): void;
  removeSocket(socketName: string): boolean;
  getSocket(socketName: string): Socket | undefined;
  isSocketOccupied(socketName: string): boolean;

  /** 克隆实体 */
  clone(newName?: string): Entity;

  /** 序列化方法 */
  serialize(): SerializedEntity;

  /** 销毁方法 */
  destroy(): void;
}

// ============================================================================
// System 系统接口
// ============================================================================

/**
 * System 基类接口
 * 处理特定类型 Component 的逻辑单元
 */
export interface System {
  /** 执行优先级（数值越小越先执行） */
  priority: number;

  /** 需要的组件类型 */
  requiredComponents: string[];

  /**
   * 初始化方法（可选）
   * 在 System 注册时由 SystemManager 自动调用
   * @param entityManager - 实体管理器引用
   * @param clock - 时钟引用
   */
  initialize?(entityManager: any, clock: any): void;

  /** 更新逻辑 */
  update(deltaTime: number, entities?: Entity[]): void;

  /** 实体添加回调 */
  onEntityAdded(entity: Entity): void;

  /** 实体移除回调 */
  onEntityRemoved(entity: Entity): void;
}

// ============================================================================
// 序列化相关类型
// ============================================================================

/**
 * 序列化的实体数据
 */
export interface SerializedEntity {
  id: string;
  name: string;
  active: boolean;
  components: ComponentData[];
  sockets: Array<{
    name: string;
    localTransform: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
    };
    allowedTypes?: string[];
  }>;
  parentId?: string;
  socketName?: string; // 附加到父实体的哪个 socket
}

// ============================================================================
// 工具类型
// ============================================================================

/**
 * 组件查询过滤器
 */
export type ComponentFilter = string | string[];

/**
 * 实体查询结果
 */
export interface QueryResult {
  entities: Entity[];
  count: number;
}
