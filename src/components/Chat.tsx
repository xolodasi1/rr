import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../services/socketService';

export const Chat: React.FC = () => {
  const [input, setInput] = useState('');
  const messages = useGameStore(state => state.chatMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const socket = getSocket();
    if (socket) {
      socket.emit('chatMessage', input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-64 w-80 bg-black/60 backdrop-blur-md border border-cyan-900/50 rounded-lg overflow-hidden font-mono text-xs">
      <div className="bg-cyan-950/50 px-3 py-1 border-b border-cyan-900/50 text-cyan-400 uppercase tracking-widest text-[10px]">
        System Comms
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-cyan-900">
        {messages.map((msg, i) => (
          <div key={i} className={`break-words ${msg.isSystem ? 'text-yellow-400/80 italic' : 'text-gray-300'}`}>
            {!msg.isSystem && <span className="text-cyan-400 font-bold mr-2">[{msg.sender}]</span>}
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-2 border-t border-cyan-900/50 bg-black/40 flex">
        <span className="text-cyan-500 mr-2">{'>'}</span>
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
