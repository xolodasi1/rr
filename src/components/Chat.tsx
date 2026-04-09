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
        className="bg-white/40 backdrop-blur-md border border-white/60 rounded-lg px-4 py-2 text-gray-800 font-sans font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-white/60 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.5)]"
      >
        💬 Open Chat
      </button>
    );
  }

  return (
    <div className="flex flex-col h-32 w-48 sm:h-48 sm:w-60 md:h-64 md:w-80 bg-white/30 backdrop-blur-md border border-white/50 rounded-lg overflow-hidden font-sans text-[10px] md:text-xs shadow-[0_4px_15px_rgba(0,0,0,0.1)]">
      <div className="bg-white/40 px-3 py-1 border-b border-white/50 text-gray-800 font-bold uppercase tracking-widest text-[8px] md:text-[10px] flex justify-between items-center">
        <span>Global Chat</span>
        <button onClick={toggleChat} className="text-gray-600 hover:text-gray-900 px-2 py-1 bg-white/50 rounded hover:bg-white/70 transition-colors">
          _
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-1 md:space-y-2 scrollbar-thin scrollbar-thumb-gray-300">
        {messages.map((msg, i) => (
          <div key={i} className={`break-words ${msg.isSystem ? 'text-orange-500 font-bold italic' : 'text-gray-800 font-medium'}`}>
            {!msg.isSystem && <span className="text-green-600 font-bold mr-2">[{msg.sender}]</span>}
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-1 md:p-2 border-t border-white/50 bg-white/20 flex">
        <span className="text-gray-500 font-bold mr-1 md:mr-2">{'>'}</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-500"
          placeholder="Enter message..."
          maxLength={100}
        />
      </form>
    </div>
  );
};
