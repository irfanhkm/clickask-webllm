import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelManager } from '../ModelManagement/ModelManager';
import { ChatManager } from './ChatManager';
import { ChatRoom } from './types/chat';
import { prebuiltAppConfig } from '@mlc-ai/web-llm';
import { useToggle } from '../../hooks/useToggle';
import './ChatList.css';

const ChatList: React.FC = () => {
  const navigate = useNavigate();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isCreating, toggleCreating] = useToggle(false);
  const [newChatName, setNewChatName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadChatRooms = async () => {
      const rooms = await ChatManager.getChatRooms();
      setChatRooms(rooms);
    };

    const loadModels = async () => {
      const models = await ModelManager.getAvailableModels();
      setAvailableModels(models);
    };

    loadChatRooms();
    loadModels();
  }, []);

  const handleCreateChat = async () => {
    // if (!newChatName.trim() || availableModels.length === 0) return;

    // Use the first available model
    const newRoom = await ChatManager.createChatRoom(newChatName, availableModels[0]);
    setChatRooms([...chatRooms, newRoom]);
    setNewChatName('');
    toggleCreating();
    navigate(`/chats/${newRoom.id}`);
  };

  const getModelDisplayName = (modelId: string): string => {
    const modelInfo = prebuiltAppConfig.model_list.find(m => m.model_id === modelId);
    if (!modelInfo) return modelId;
    
    // Extract a more readable name from the model ID
    const parts = modelId.split('-');
    const modelName = parts[0];
    const size = parts.find(p => p.includes('B')) || '';
    return `${modelName} ${size}`;
  };

  const filteredRooms = chatRooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="chat-list-container">
      <div className="flex flex row mb-4 gap-4">
        <button
            onClick={() => toggleCreating()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            New Chat
        </button>
        
        <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="search-input"
          />
      </div>

      {isCreating && (
        <div className="mb-4 p-4 border rounded">
          <input
            type="text"
            value={newChatName}
            onChange={(e) => setNewChatName(e.target.value)}
            placeholder="Enter chat name"
            className="w-full p-2 border rounded mb-2"
          />
          <div className="flex justify-end">
            <button
              onClick={handleCreateChat}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div className="room-list">
        {filteredRooms.map(room => (
          <div
            key={room.id}
            className="room-item"
            onClick={() => navigate(`/chats/${room.id}`)}
          >
            <div className="room-info">
              <span className="room-name">{room.name}</span>
              <span className="room-preview">
                {room.messages[room.messages.length - 1]?.content.substring(0, 30) || 'No messages yet'}
                ...
              </span>
            </div>
            <span className="room-date">
              {new Date(room.createdAt).toLocaleTimeString()}
              <br/>
              {new Date(room.createdAt).toLocaleDateString()}
            </span>
          </div>
        ))}
        {filteredRooms.length === 0 && (
          <div className="no-rooms">
            {searchQuery ? 'No matching chat rooms found' : 'No chat rooms yet'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList; 