/**
 * PolyForge v1.3.0 InputMappingSystem
 * Phase 6: 输入映射系统
 * 
 * 功能：
 * - 监听全局键盘和鼠标事件
 * - 支持多套输入预设（Blender 风格、游戏风格）
 * - 支持上下文栈机制（解决键位冲突）
 * - 与 CommandManager 集成（Ctrl+Z 撤销）
 */

import type { System } from '../types';
import type { CommandManager } from '../CommandManager';

/**
 * 输入动作定义
 */
export interface InputAction {
  name: string;
  keys?: string[];                     // 键位绑定（如 ['w', 'ArrowUp']）
  mouseButtons?: number[];             // 鼠标按钮（0=左键, 1=中键, 2=右键）
  modifiers?: ('ctrl' | 'shift' | 'alt')[];  // 修饰键
  callback?: () => void;               // 动作回调
}

/**
 * 输入预设
 */
export interface InputPreset {
  name: string;                        // 'blender' | 'game' | 'custom'
  actions: Map<string, InputAction>;
}

/**
 * 输入系统
 * 负责监听全局输入事件并触发对应的动作
 */
export class InputSystem implements System {
  public readonly name = 'InputSystem';
  public readonly priority = 0;        // 最高优先级，最先执行
  public enabled = true;
  public readonly requiredComponents: string[] = [];  // 不需要特定组件

  private currentPreset: InputPreset;
  private presets: Map<string, InputPreset> = new Map();
  private contextStack: string[] = ['global'];  // 上下文栈
  private pressedKeys: Set<string> = new Set();
  public pressedButtons: Set<number> = new Set(); // 🔥 改为 public，让 CameraSystem 可以直接访问
  private commandManager: CommandManager | null = null;
  
  // 🎮 鼠标状态（公共访问用于物理层控制）
  public mousePosition: { x: number; y: number } = { x: 0, y: 0 };
  public mouseDelta: { x: number; y: number } = { x: 0, y: 0 };
  public wheelDelta: number = 0;
  private isDragging: boolean = false;

  constructor() {
    this.currentPreset = this.createDefaultPreset();
    this.presets.set('default', this.currentPreset);
    this.presets.set('blender', this.createBlenderPreset());
    this.presets.set('game', this.createGamePreset());
    
    this.initializeEventListeners();
  }

  /**
   * 设置 CommandManager（用于撤销/重做）
   */
  public setCommandManager(commandManager: CommandManager): void {
    this.commandManager = commandManager;
  }

  /**
   * 初始化事件监听器
   */
  private initializeEventListeners(): void {
    if (typeof window === 'undefined') return;

    // 键盘事件
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));

    // 鼠标事件
    window.addEventListener('mousedown', this.handleMouseDown.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

    // 🎯 右键菜单拦截：只在 Canvas 上拦截
    window.addEventListener('contextmenu', (e) => {
      const target = e.target as HTMLElement;
      const isCanvas = target.tagName === 'CANVAS' || target.closest('canvas');
      
      // 只在 Canvas 上拦截右键菜单
      if (isCanvas) {
        e.preventDefault();
      }
    });
  }

  /**
   * 处理键盘按下事件
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    this.pressedKeys.add(key);

    // 检查是否有匹配的动作
    for (const [actionName, action] of this.currentPreset.actions) {
      if (this.matchesAction(action, key, event)) {
        // 阻止默认行为（如 Ctrl+Z 的浏览器撤销）
        event.preventDefault();
        
        // 触发回调
        if (action.callback) {
          action.callback();
        }

        // 特殊处理：撤销/重做
        if (actionName === 'UNDO' && this.commandManager) {
          this.commandManager.undo();
        } else if (actionName === 'REDO' && this.commandManager) {
          this.commandManager.redo();
        }
      }
    }
  }

  /**
   * 处理键盘释放事件
   */
  private handleKeyUp(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    this.pressedKeys.delete(key);
  }

  /**
   * 处理鼠标按下事件
   */
  private handleMouseDown(event: MouseEvent): void {
    this.pressedButtons.add(event.button);
    
    // 右键或中键按下时开始拖拽
    if (event.button === 1 || event.button === 2) {
      this.isDragging = true;
    }

    // 检查是否有匹配的动作
    for (const [, action] of this.currentPreset.actions) {
      if (action.mouseButtons?.includes(event.button)) {
        if (this.matchesModifiers(action, event)) {
          if (action.callback) {
            action.callback();
          }
        }
      }
    }
  }

  /**
   * 处理鼠标释放事件
   */
  private handleMouseUp(event: MouseEvent): void {
    this.pressedButtons.delete(event.button);
    this.isDragging = false;
  }

  /**
   * 处理鼠标移动事件
   */
  private handleMouseMove(event: MouseEvent): void {
    const newX = event.clientX;
    const newY = event.clientY;
    
    // 🔥 修正状态机：如果有按钮按下，自动进入拖拽状态
    if (event.buttons > 0 && (this.pressedButtons.has(1) || this.pressedButtons.has(2))) {
      this.isDragging = true;
    }
    
    // 计算 delta（只在拖拽时有效）
    if (this.isDragging) {
      this.mouseDelta.x = newX - this.mousePosition.x;
      this.mouseDelta.y = newY - this.mousePosition.y;
    } else {
      this.mouseDelta.x = 0;
      this.mouseDelta.y = 0;
    }
    
    this.mousePosition.x = newX;
    this.mousePosition.y = newY;
  }

  /**
   * 处理滚轮事件
   * 🎯 输入隔离逻辑：只在 Canvas 上拦截，UI 面板保持原生滚动
   */
  private handleWheel(event: WheelEvent): void {
    // 🚫 检查事件目标：如果是 UI 面板内部，立即放行
    const target = event.target as HTMLElement;
    
    // 检查是否在右侧面板内（通过 class 或 data 属性识别）
    if (target.closest('.architecture-validation-panel') || 
        target.closest('[data-panel="true"]') ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT') {
      // ✅ UI 元素，允许默认滚动
      return;
    }
    
    // 检查是否在 Canvas 上
    const isCanvas = target.tagName === 'CANVAS' || target.closest('canvas');
    
    // 🎮 Canvas 上的滚轮事件由 EngineBridge 的物理层拦截处理
    // 这里不再处理，避免冲突
    // 注释掉原有逻辑，让 EngineBridge 完全接管
    /*
    const context = this.getCurrentContext();
    if (context === 'orbit' && isCanvas) {
      event.preventDefault();
      this.wheelDelta = event.deltaY;
    }
    */
  }

  /**
   * 检查动作是否匹配
   */
  private matchesAction(action: InputAction, key: string, event: KeyboardEvent): boolean {
    // 检查键位
    if (!action.keys || !action.keys.includes(key)) {
      return false;
    }

    // 检查修饰键
    return this.matchesModifiers(action, event);
  }

  /**
   * 检查修饰键是否匹配
   */
  private matchesModifiers(action: InputAction, event: KeyboardEvent | MouseEvent): boolean {
    const hasCtrl = event.ctrlKey || event.metaKey;  // Mac 的 Cmd 键
    const hasShift = event.shiftKey;
    const hasAlt = event.altKey;

    const requiresCtrl = action.modifiers?.includes('ctrl') ?? false;
    const requiresShift = action.modifiers?.includes('shift') ?? false;
    const requiresAlt = action.modifiers?.includes('alt') ?? false;

    return (
      hasCtrl === requiresCtrl &&
      hasShift === requiresShift &&
      hasAlt === requiresAlt
    );
  }

  /**
   * 检查动作是否被按下
   */
  public isActionPressed(actionName: string): boolean {
    const action = this.currentPreset.actions.get(actionName);
    if (!action) return false;

    // 检查键位
    if (action.keys) {
      for (const key of action.keys) {
        if (this.pressedKeys.has(key.toLowerCase())) {
          return true;
        }
      }
    }

    // 检查鼠标按钮
    if (action.mouseButtons) {
      for (const button of action.mouseButtons) {
        if (this.pressedButtons.has(button)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 切换输入预设
   */
  public setPreset(name: string): void {
    const preset = this.presets.get(name);
    if (preset) {
      this.currentPreset = preset;
      console.log(`✓ Input preset changed to: ${name}`);
    } else {
      console.warn(`Input preset not found: ${name}`);
    }
  }

  /**
   * 绑定动作
   */
  public bindAction(actionName: string, keys: string[], callback?: () => void): void {
    const action: InputAction = {
      name: actionName,
      keys,
      callback,
    };
    this.currentPreset.actions.set(actionName, action);
  }

  /**
   * 推入上下文（用于解决键位冲突）
   */
  public pushContext(context: string): void {
    this.contextStack.push(context);
  }

  /**
   * 弹出上下文
   */
  public popContext(): void {
    if (this.contextStack.length > 1) {
      this.contextStack.pop();
    }
  }

  /**
   * 获取当前上下文
   */
  public getCurrentContext(): string {
    return this.contextStack[this.contextStack.length - 1];
  }

  /**
   * 创建默认预设
   */
  private createDefaultPreset(): InputPreset {
    const actions = new Map<string, InputAction>();

    // 移动
    actions.set('MOVE_FORWARD', { name: 'MOVE_FORWARD', keys: ['w', 'arrowup'] });
    actions.set('MOVE_BACKWARD', { name: 'MOVE_BACKWARD', keys: ['s', 'arrowdown'] });
    actions.set('MOVE_LEFT', { name: 'MOVE_LEFT', keys: ['a', 'arrowleft'] });
    actions.set('MOVE_RIGHT', { name: 'MOVE_RIGHT', keys: ['d', 'arrowright'] });

    // 撤销/重做
    actions.set('UNDO', { name: 'UNDO', keys: ['z'], modifiers: ['ctrl'] });
    actions.set('REDO', { name: 'REDO', keys: ['y'], modifiers: ['ctrl'] });

    // 全局快捷键
    actions.set('FOCUS', { name: 'FOCUS', keys: ['f'] });
    actions.set('ESCAPE', { name: 'ESCAPE', keys: ['escape'] });

    return {
      name: 'default',
      actions,
    };
  }

  /**
   * 创建 Blender 风格预设
   */
  private createBlenderPreset(): InputPreset {
    const actions = new Map<string, InputAction>();

    // Blender 风格：中键旋转，Shift+中键平移
    actions.set('ROTATE_VIEW', { name: 'ROTATE_VIEW', mouseButtons: [1] });
    actions.set('PAN_VIEW', { name: 'PAN_VIEW', mouseButtons: [1], modifiers: ['shift'] });
    actions.set('ZOOM_VIEW', { name: 'ZOOM_VIEW', mouseButtons: [1], modifiers: ['ctrl'] });

    // 选择
    actions.set('SELECT', { name: 'SELECT', mouseButtons: [0] });
    actions.set('SELECT_ADD', { name: 'SELECT_ADD', mouseButtons: [0], modifiers: ['shift'] });

    // 撤销/重做
    actions.set('UNDO', { name: 'UNDO', keys: ['z'], modifiers: ['ctrl'] });
    actions.set('REDO', { name: 'REDO', keys: ['z'], modifiers: ['ctrl', 'shift'] });

    // 聚焦
    actions.set('FOCUS', { name: 'FOCUS', keys: ['f'] });

    return {
      name: 'blender',
      actions,
    };
  }

  /**
   * 创建游戏风格预设
   */
  private createGamePreset(): InputPreset {
    const actions = new Map<string, InputAction>();

    // WASD 移动
    actions.set('MOVE_FORWARD', { name: 'MOVE_FORWARD', keys: ['w'] });
    actions.set('MOVE_BACKWARD', { name: 'MOVE_BACKWARD', keys: ['s'] });
    actions.set('MOVE_LEFT', { name: 'MOVE_LEFT', keys: ['a'] });
    actions.set('MOVE_RIGHT', { name: 'MOVE_RIGHT', keys: ['d'] });

    // 跳跃和冲刺
    actions.set('JUMP', { name: 'JUMP', keys: ['space'] });
    actions.set('SPRINT', { name: 'SPRINT', keys: ['shift'] });

    // 鼠标
    actions.set('ATTACK', { name: 'ATTACK', mouseButtons: [0] });
    actions.set('AIM', { name: 'AIM', mouseButtons: [2] });

    // 撤销/重做
    actions.set('UNDO', { name: 'UNDO', keys: ['z'], modifiers: ['ctrl'] });
    actions.set('REDO', { name: 'REDO', keys: ['y'], modifiers: ['ctrl'] });

    return {
      name: 'game',
      actions,
    };
  }

  /**
   * 检查鼠标按钮是否被按下
   */
  public isButtonPressed(button: number): boolean {
    return this.pressedButtons.has(button);
  }

  /**
   * 获取鼠标 Delta（用于相机旋转）
   */
  public getMouseDelta(): { x: number; y: number } {
    return { ...this.mouseDelta };
  }

  /**
   * 获取滚轮 Delta（用于相机缩放）
   */
  public getWheelDelta(): number {
    return this.wheelDelta;
  }

  /**
   * 重置帧数据（每帧调用）
   */
  public resetFrameData(): void {
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    this.wheelDelta = 0;
  }

  /**
   * System 接口：更新
   */
  public update(_deltaTime: number): void {
    // InputSystem 主要是事件驱动，不需要每帧更新
    // 但可以在这里处理持续按键的逻辑
  }

  /**
   * System 接口：实体添加回调（不需要）
   */
  public onEntityAdded(_entity: import('../Entity').Entity): void {
    // InputSystem 不需要处理实体添加
  }

  /**
   * System 接口：实体移除回调（不需要）
   */
  public onEntityRemoved(_entity: import('../Entity').Entity): void {
    // InputSystem 不需要处理实体移除
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    window.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    window.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    window.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    window.removeEventListener('wheel', this.handleWheel.bind(this));
  }

  /**
   * 获取统计信息
   */
  public getStats() {
    return {
      currentPreset: this.currentPreset.name,
      totalPresets: this.presets.size,
      totalActions: this.currentPreset.actions.size,
      pressedKeys: Array.from(this.pressedKeys),
      pressedButtons: Array.from(this.pressedButtons),
      contextStack: [...this.contextStack],
    };
  }
}
