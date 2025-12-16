
import React, { useState, useRef, useEffect } from 'react';
import { AppMode } from '../types';
import { sendEngineChatMessage } from '../services/aiService';

interface AIAssistantProps {
  currentMode: AppMode;
  onAiCommand: (action: string, payload: any) => void;
  isDocked?: boolean;
  onDock?: () => void;
  onTurnOff?: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ currentMode, onAiCommand, isDocked, onDock, onTurnOff }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{role: 'user' | 'model', text: string}[]>([
      { role: 'model', text: '你好！我是 PolySprite (灵枢)。我可以帮你生成模型、动作、背景故事，或者回答关于编辑器的问题。' }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Drag State
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [menuVisible, setMenuVisible] = useState(false);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isOpen]);

  // Drag Logic
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isDragging) return;
          setPosition({
              x: e.clientX - dragOffset.current.x,
              y: e.clientY - dragOffset.current.y
          });
      };
      
      const handleMouseUp = () => {
          setIsDragging(false);
      };

      if (isDragging) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only Left Click
      e.stopPropagation();
      setIsDragging(true);
      dragOffset.current = {
          x: e.clientX - position.x,
          y: e.clientY - position.y
      };
      setMenuVisible(false); // Hide menu on drag
  };

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setMenuVisible(true);
  };

  const handleSend = async (textOverride?: string) => {
    const userMsg = textOverride || input.trim();
    if (!userMsg || isThinking) return;

    const newHistory = [...history, { role: 'user' as const, text: userMsg }];
    setHistory(newHistory);
    setInput('');
    setIsThinking(true);

    try {
        const historyPayload = history.map(h => ({
            role: h.role,
            parts: [{ text: h.text }]
        }));

        const responseText = await sendEngineChatMessage(historyPayload, userMsg, currentMode);
        
        let displayText = responseText || "我好像走神了...";
        const cmdRegex = /<<<JSON:(.*?)>>>/s;
        const match = responseText?.match(cmdRegex);

        if (match && match[1]) {
            try {
                const cmd = JSON.parse(match[1]);
                displayText = responseText?.replace(match[0], '').trim();
                onAiCommand(cmd.action, cmd.payload);
            } catch (e) {
                console.error("Failed to parse AI command", e);
            }
        }

        setHistory(prev => [...prev, { role: 'model' as const, text: displayText || "执行中..." }]);

    } catch (error) {
        setHistory(prev => [...prev, { role: 'model' as const, text: "连接中断，请稍后重试。" }]);
    } finally {
        setIsThinking(false);
    }
  };

  // Quick Action Buttons based on Context
  const getQuickActions = () => {
      switch(currentMode) {
          case AppMode.CHARACTER_EDITOR:
              return [
                  { label: "生成背景故事", prompt: "为当前角色生成一段背景故事" },
                  { label: "推荐配色", prompt: "给出一套适合战士的配色方案建议" }
              ];
          case AppMode.MODEL_WORKSHOP:
              return [
                  { label: "生成剑", prompt: "做一个低多边形的剑 (Generate low poly sword)" },
                  { label: "生成盾牌", prompt: "做一个圆形的盾牌 (Generate round shield)" },
                  { label: "随机头盔", prompt: "做一个骑士头盔" }
              ];
          case AppMode.ACTION_STUDIO:
              return [
                  { label: "僵尸行走", prompt: "把动作调整为僵尸行走的风格" },
                  { label: "忍者跑", prompt: "生成忍者跑步的动作风格" },
                  { label: "重击动画", prompt: "生成一个挥舞重武器的攻击动作" }
              ];
          case AppMode.MAP_EDITOR:
              return [
                  { label: "如何操作？", prompt: "告诉我地图编辑器的快捷键和操作方法" },
                  { label: "做个树", prompt: "我想要一个简单的松树模型，带我去模型工坊生成" }
              ];
          default:
              return [
                  { label: "你是谁？", prompt: "介绍一下你自己" }
              ];
      }
  };

  if (isDocked) return null;

  return (
    <>
        {/* CONTEXT MENU */}
        {menuVisible && (
            <div 
                className="fixed z-[60] bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden py-1 animate-fade-in"
                style={{ left: position.x + 20, top: position.y - 40 }}
                onMouseLeave={() => setMenuVisible(false)}
            >
                <button 
                    onClick={() => { onTurnOff && onTurnOff(); setMenuVisible(false); }}
                    className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-red-600 hover:text-white flex items-center gap-2"
                >
                    <i className="fas fa-power-off"></i> 关闭AI助手
                </button>
                <button 
                    onClick={() => { setIsOpen(!isOpen); setMenuVisible(false); }}
                    className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-gray-800 flex items-center gap-2"
                >
                    <i className={`fas ${isOpen ? 'fa-eye-slash' : 'fa-comment'}`}></i> {isOpen ? '关闭对话' : '打开对话'}
                </button>
            </div>
        )}

        {/* CONTAINER FOR DRAGGING */}
        <div 
            className="fixed z-50 font-sans flex flex-col items-end"
            style={{ left: position.x, top: position.y, transform: 'translate(-100%, -100%)' }}
        >
        
        {/* CHAT WINDOW */}
        {isOpen && (
            <div className="w-80 h-96 bg-gray-900/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up mb-4 pointer-events-auto relative">
                {/* Header */}
                <div className="p-3 bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-b border-gray-700 flex justify-between items-center cursor-move" onMouseDown={handleMouseDown}>
                    <div className="flex items-center gap-2">
                        <i className="fas fa-sparkles text-blue-400 animate-pulse"></i>
                        <span className="text-xs font-bold text-white tracking-widest uppercase">PolySprite</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white"><i className="fas fa-times"></i></button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" onMouseDown={(e) => e.stopPropagation()}>
                    {history.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : 'bg-gray-800/80 text-gray-200 border border-gray-700 rounded-bl-none'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="bg-gray-800/80 rounded-2xl px-3 py-2 border border-gray-700 rounded-bl-none flex gap-1 items-center">
                                <span className="text-[10px] text-gray-400 mr-2">思考中</span>
                                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                <div className="px-3 py-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-gray-800/50 bg-gray-900/30" onMouseDown={(e) => e.stopPropagation()}>
                    {getQuickActions().map((action, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => handleSend(action.prompt)}
                            className="whitespace-nowrap px-3 py-1 bg-blue-900/30 hover:bg-blue-800/50 border border-blue-500/30 rounded-full text-[10px] text-blue-200 transition-colors"
                        >
                            {action.label}
                        </button>
                    ))}
                </div>

                {/* Input */}
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 bg-gray-900/80 border-t border-gray-700 flex gap-2" onMouseDown={(e) => e.stopPropagation()}>
                    <input 
                        type="text" 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="输入指令..." 
                        className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                    <button type="submit" disabled={!input.trim() || isThinking} className="w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-lg text-white flex items-center justify-center disabled:opacity-50 transition-colors">
                        <i className="fas fa-paper-plane text-xs"></i>
                    </button>
                </form>
            </div>
        )}

        {/* SPRITE AVATAR (FLOATING BUTTON) */}
        <div 
            onMouseDown={handleMouseDown} 
            onContextMenu={handleContextMenu}
            className={`w-14 h-14 rounded-full relative group cursor-grab active:cursor-grabbing transition-transform duration-100 hover:scale-110 ${isOpen ? 'opacity-80 hover:opacity-100' : ''}`}
        >
            {/* Glow Effect */}
            <div className={`absolute inset-0 rounded-full blur-md transition-all duration-1000 ${isThinking ? 'bg-purple-500 animate-pulse' : 'bg-blue-500/50 group-hover:bg-blue-400/80'}`}></div>
            
            {/* Core Orb */}
            <div className="absolute inset-1 bg-gray-900 rounded-full flex items-center justify-center border border-blue-400/30 shadow-inner overflow-hidden" onClick={() => !isDragging && setIsOpen(!isOpen)}>
                <div className={`absolute inset-0 bg-gradient-to-tr from-blue-900/20 to-cyan-500/20 rounded-full ${isThinking ? 'animate-spin' : ''}`}></div>
                <i className={`fas fa-cube text-xl z-10 transition-colors ${isThinking ? 'text-purple-300' : 'text-cyan-300'}`}></i>
                
                {/* Eye/Face Detail */}
                {!isThinking && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center animate-float">
                        <div className="w-8 h-0.5 bg-cyan-400/50 blur-sm rounded-full mt-6"></div>
                    </div>
                )}
            </div>
        </div>

        </div>
    </>
  );
};
