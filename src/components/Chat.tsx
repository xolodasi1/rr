import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../services/socketService';

export const Chat: React.FC = () => {
  const [input, setInput] = useState('');
  const messages = useGameStore(state => state.chatMessages);
  const isChatOpen = useGameStore(state => state.isChatOpen);
  const toggleChat = useGameStore(state => state.toggleChat);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const socket = getSocket();
    if (socket) {
      socket.emit('chatMessage', input);
      setInput('');
    }
  };

  if (!isChatOpen) {
    return (
      <button 
        onClick={toggleChat}
        className="bg-black/60 backdrop-blur-md border border-cyan-900/50 rounded-lg px-4 py-2 text-cyan-400 font-mono text-[10px] md:text-xs uppercase tracking-widest hover:bg-cyan-900/40 transition-colors shadow-[0_0_15px_rgba(0,255,255,0.1)]"
      >
        💬 Open Chat
      </button>
    );
  }

  return (
    <div className="flex flex-col h-32 w-48 sm:h-48 sm:w-60 md:h-64 md:w-80 bg-black/60 backdrop-blur-md border border-cyan-900/50 rounded-lg overflow-hidden font-mono text-[10px] md:text-xs">
      <div className="bg-cyan-950/50 px-3 py-1 border-b border-cyan-900/50 text-cyan-400 uppercase tracking-widest text-[8px] md:text-[10px] flex justify-between items-center">
        <span>System Comms</span>
        <button onClick={toggleChat} className="text-cyan-200 hover:text-white px-2 py-1 bg-cyan-900/50 rounded hover:bg-cyan-800 transition-colors">
          _
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-1 md:space-y-2 scrollbar-thin scrollbar-thumb-cyan-900">
        {messages.map((msg, i) => (
          <div key={i} className={`break-words ${msg.isSystem ? 'text-yellow-400/80 italic' : 'text-gray-300'}`}>
            {!msg.isSystem && <span className="text-cyan-400 font-bold mr-2">[{msg.sender}]</span>}
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-1 md:p-2 border-t border-cyan-900/50 bg-black/40 flex">
        <span className="text-cyan-500 mr-1 md:mr-2">{'>'}</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent outline-none text-cyan-100 placeholder-cyan-800/50"
          placeholder="Enter message..."
          maxLength={100}
        />
      </form>
    </div>
  );
};
