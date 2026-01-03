/**
 * PolyForge v1.3.0 - EventBus
 * 全局事件总线，用于跨系统通信（如 CameraSystem -> UI）
 */

type EventHandler = (data?: any) => void;

class EventBus {
    private handlers: Map<string, EventHandler[]> = new Map();

    /**
     * 订阅事件
     * @param eventName 事件名称
     * @param handler 处理函数
     */
    public on(eventName: string, handler: EventHandler): void {
        if (!this.handlers.has(eventName)) {
            this.handlers.set(eventName, []);
        }
        this.handlers.get(eventName)!.push(handler);
    }

    /**
     * 取消订阅
     * @param eventName 事件名称
     * @param handler 处理函数
     */
    public off(eventName: string, handler: EventHandler): void {
        const eventHandlers = this.handlers.get(eventName);
        if (!eventHandlers) return;

        this.handlers.set(
            eventName,
            eventHandlers.filter((h) => h !== handler)
        );
    }

    /**
     * 发射事件
     * @param eventName 事件名称
     * @param data 事件数据
     */
    public emit(eventName: string, data?: any): void {
        const eventHandlers = this.handlers.get(eventName);
        if (!eventHandlers) return;

        eventHandlers.forEach((handler) => {
            try {
                handler(data);
            } catch (error) {
                console.error(`[EventBus] Error in handler for event "${eventName}":`, error);
            }
        });
    }

    /**
     * 清除所有事件处理器（主要用于热更新或重置）
     */
    public clear(): void {
        this.handlers.clear();
    }
}

// 导出全局单例
export const eventBus = new EventBus();

// 🔥 确保全局可用 (供 AudioSystem 等核心系统广播)
if (typeof window !== 'undefined') {
    (window as any).eventBus = eventBus;
} else if (typeof globalThis !== 'undefined') {
    (globalThis as any).eventBus = eventBus;
}

export default eventBus;
