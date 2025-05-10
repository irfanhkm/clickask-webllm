import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelManager } from '../ModelManagement/ModelManager';
import { ChatManager } from './ChatManager';
import { ChatRoom } from './types/chat';
import { prebuiltAppConfig } from '@mlc-ai/web-llm';
import { useToggle } from '../../hooks/useToggle';
import { Plus, MessageSquare, Clock } from 'lucide-react';
import SearchBar from '../../components/SearchBar';
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
      <div className="chat-list-header">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search chats..."
        />
        <div className="header-buttons">
          <button 
            onClick={() => toggleCreating()} 
            className="add-button"
          >
            <Plus size={16} />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="create-chat-section">
          <input
            type="text"
            value={newChatName}
            onChange={(e) => setNewChatName(e.target.value)}
            placeholder="Enter chat name"
            className="chat-name-input"
          />
          <div className="create-chat-actions">
            <button
              onClick={() => toggleCreating()}
              className="cancel-button"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateChat}
              className="create-button"
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div className="chat-cards-list">
        {filteredRooms.map(room => (
          <div
            key={room.id}
            className="chat-card"
            onClick={() => navigate(`/chats/${room.id}`)}
          >
            <div className="chat-card-content">
              <div className="chat-card-header">
                <div className="chat-card-title">
                  <h3>{room.name}</h3>
                </div>
                <div className="chat-card-date">
                  <Clock size={14} />
                  <span>{new Date(room.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="chat-card-info">
                <div className="chat-preview">
                  <MessageSquare size={14} className="chat-icon" />
                  <span>
                    {room.messages[room.messages.length - 1]?.content.substring(0, 50) || 'No messages yet'}
                    {room.messages[room.messages.length - 1]?.content.length > 50 ? '...' : ''}
                  </span>
                </div>
                <div className="chat-model">
                  <span className="model-tag">{getModelDisplayName(room.modelId)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredRooms.length === 0 && (
          <div className="no-chats">
            {searchQuery ? 'No matching chat rooms found' : 'No chat rooms yet'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList; 