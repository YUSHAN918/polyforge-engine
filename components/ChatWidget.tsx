
import React, { useState, useRef, useEffect } from 'react';
import { sendEngineChatMessage } from '../services/geminiService';

interface ChatWidgetProps {
  initialHistory?: {role: 'user' | 'model', text: string}[];
  isOpen: boolean;
  onClose: () => void;
  currentMode?: string;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ initialHistory = [], isOpen, onClose, currentMode = 'GENERAL' }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{role: 'user' | 'model', text: string}[]>(initialHistory);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [history, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userMsg = input.trim();
    const newHistory = [...history, { role: 'user' as const, text: userMsg }];
    
    setHistory(newHistory);
    setInput('');
    setIsSending(true);

    try {
        const historyPayload = history.map(h => ({
            role: h.role,
            parts: [{ text: h.text }]
        }));

        const response = await sendEngineChatMessage(historyPayload, userMsg, currentMode);
        setHistory(prev => [...prev, { role: 'model' as const, text: response }]);
    } catch (error) {
        setHistory(prev => [...prev, { role: 'model' as const, text: "连接错误，请稍后重试。" }]);
    } finally {
        setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-6 left-24 pointer-events-auto z-50">
      <div className="w-80 h-96 bg-gray-900/95 backdrop-blur-md rounded-2xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fas fa-robot text-blue-400"></i> 引擎助手
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <i className="fas fa-times"></i>
            </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-900/50">
            {history.length === 0 && (
                <div className="text-center text-xs text-gray-500 mt-10">
                    有什么可以帮您的吗？<br/>试着问问如何设计角色。
                </div>
            )}
            {history.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                        msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-bl-none'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            {isSending && (
                <div className="flex justify-start">
                    <div className="bg-gray-800 rounded-2xl px-3 py-2 border border-gray-700 rounded-bl-none flex gap-1">
                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-gray-700 bg-gray-800">
            <div className="relative">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="输入消息..."
                    disabled={isSending}
                    className="w-full bg-gray-900 border border-gray-600 rounded-xl py-2 pl-3 pr-10 text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
                />
                <button 
                    type="submit" 
                    disabled={!input.trim() || isSending}
                    className="absolute right-1 top-1 w-7 h-7 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center text-white transition-colors"
                >
                    <i className="fas fa-paper-plane text-xs"></i>
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};
