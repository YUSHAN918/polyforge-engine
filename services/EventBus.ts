// 简单的事件总线实现
export enum EventType {
  LOG_EVENT = 'LOG_EVENT',
  MODULE_STATUS_CHANGE = 'MODULE_STATUS_CHANGE',
}

export interface LogEventData {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  module?: string;
}

export interface ModuleStatusChangeData {
  moduleId: string;
  moduleName: string;
  status: 'Active' | 'Inactive';
  reason?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

type EventHandler<T> = (data: T) => void;

class EventBus {
  private subscribers: Map<EventType, Set<EventHandler<any>>> = new Map();
  private logHistory: LogEntry[] = [];
  private readonly MAX_LOG_HISTORY = 50;

  subscribe<T>(eventType: EventType, handler: EventHandler<T>): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(handler);

    // 返回取消订阅的函数
    return () => {
      const handlers = this.subscribers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  publish<T>(eventType: EventType, data: T): void {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }

    // 如果事件类型是 LOG_EVENT，将日志记录到历史中
    if (eventType === EventType.LOG_EVENT) {
      const logData = data as LogEventData;
      const logEntry: LogEntry = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        message: logData.module ? `[${logData.module}] ${logData.message}` : logData.message,
        type: logData.type,
      };
      this.logHistory.unshift(logEntry); // 添加到开头
      // 限制历史记录长度
      if (this.logHistory.length > this.MAX_LOG_HISTORY) {
        this.logHistory.pop(); // 移除最旧的条目
      }
    }
  }

  // 获取日志历史
  getLogHistory(): LogEntry[] {
    return [...this.logHistory]; // 返回副本以避免外部修改
  }

  // 单例模式
  private static instance: EventBus;
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
}

// 导出单例实例
export default EventBus.getInstance();
