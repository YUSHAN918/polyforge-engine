import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

// ============================================================================
// PolyForge v1.3.0 Core ECS - Shadow Build Integration
// 新架构测试运行器（不干扰现有功能）
// ============================================================================
import './src/testRunner';

// 全局错误捕获
window.onerror = (message, source, lineno, colno, error) => {
  console.error('🔴 全局错误捕获:', {
    message,
    source,
    lineno,
    colno,
    error,
    stack: error?.stack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  });
  return false; // 让错误继续传播到控制台
};

// 未处理的 Promise 拒绝
window.onunhandledrejection = (event) => {
  console.error('🔴 未处理的 Promise 拒绝:', {
    reason: event.reason,
    promise: event.promise,
    timestamp: new Date().toISOString()
  });
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);