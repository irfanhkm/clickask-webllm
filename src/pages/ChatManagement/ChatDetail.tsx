import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CreateMLCEngine } from "@mlc-ai/web-llm";
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { getAvailableModels, getModelInfo } from '../ModelManagement/ModelManager';
import './ChatDetail.css';
import { ChatManager } from './ChatManager';
import { ModelManager } from '../ModelManagement/ModelManager';
import { PromptManager, PromptTemplate } from '../PromptManagement/PromptManager';
import { ArrowLeft, Send, Plus, Paperclip, Copy, Settings } from 'lucide-react';
import browser from 'webextension-polyfill';

class DummyEmbeddings extends Embeddings {
  async embedQuery(text: string): Promise<number[]> {
    return new Array(1536).fill(0);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map(() => new Array(1536).fill(0));
  }
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRoom {
  id: string;
  name: string;
  modelId: string;
  messages: Message[];
  createdAt: number;
  lastUpdated: number;
  isVisibleInContextMenu?: boolean;
}

const ChatDetail: React.FC = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [input, setInput] = useState('');
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isMessageSending, setIsMessageSending] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const vectorStoreRef = useRef<MemoryVectorStore | null>(null);
  const engineRef = useRef<any>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [chatTitle, setChatTitle] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [room?.messages]);

  // Initialize engine when model is selected
  const initializeEngine = async (modelId: string) => {
    try {
      setIsModelLoading(true);
      setSelectedModel(modelId);
      
      // Use the shared engine manager
      engineRef.current = await ModelManager.initializeEngine(modelId);
    } catch (error) {
      console.error('Error initializing engine:', error);
      setError(error instanceof Error ? error.message : 'Error initializing model');
      setSelectedModel('');
      engineRef.current = null;
    } finally {
      setIsModelLoading(false);
    }
  };

  // Initialize vector store and load available models
  useEffect(() => {
    const initData = async () => {
      const dummyEmbeddings = {
        embedQuery: async () => Array(1536).fill(0),
        embedDocuments: async (texts: string[]) => texts.map(() => Array(1536).fill(0))
      };
      
      // Create new vector store for this room
      vectorStoreRef.current = new MemoryVectorStore(dummyEmbeddings);
      
      // Load previous messages into vector store if they exist
      if (room?.messages) {
        const documents = room.messages.map(msg => 
          new Document({ pageContent: msg.content })
        );
        await vectorStoreRef.current.addDocuments(documents);
      }
      
      // Only get downloaded models
      const downloadedModels = localStorage.getItem('downloadedModels');
      if (downloadedModels) {
        const models = JSON.parse(downloadedModels);
        setAvailableModels(models.map((m: any) => m.name));
      } else {
        setAvailableModels([]);
      }
    };
    initData();

    // Cleanup function
    return () => {
      // Clear vector store reference
      vectorStoreRef.current = null;
    };
  }, [room?.id]);

  // Load room data
  useEffect(() => {
    const loadChat = async () => {
      if (!roomId) {
        navigate('/chats');
        return;
      }

      try {
        // Get room from ChatManager
        const room = await ChatManager.getChatRoom(roomId);
        if (room) {
          // Set current chat ID in storage for context menu
          await browser.storage.local.set({ currentChatId: roomId });
          
          setRoom({
            ...room,
            lastUpdated: room.lastUpdated || Date.now(),
            isVisibleInContextMenu: room.isVisibleInContextMenu ?? false
          });
          
          if (room.modelId) {
            setSelectedModel(room.modelId);
            const currentEngine = ModelManager.getCurrentEngine();
            if (currentEngine?.engine && currentEngine.modelId === room.modelId) {
              engineRef.current = currentEngine.engine;
            } else {
              await initializeEngine(room.modelId);
            }
          }
        } else {
          navigate('/chats');
        }
      } catch (error) {
        console.error('Error in chat:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      }
    };

    loadChat();
  }, [roomId, navigate]);

  // Add this useEffect to load templates
  useEffect(() => {
    const loadTemplates = async () => {
      const loadedTemplates = await PromptManager.getPromptTemplates();
      setTemplates(loadedTemplates);
    };
    loadTemplates();
  }, []);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setInput(template.content);
    }
  };

  const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModelId = e.target.value;
    if (!newModelId || newModelId === selectedModel) return;

    try {
      setIsModelLoading(true);
      setError(null);
      
      // Initialize the new model
      await initializeEngine(newModelId);
      
      // Update the chat room with the new model
      if (room) {
        const updatedRoom = {
          ...room,
          modelId: newModelId,
          lastUpdated: Date.now()
        };
        await ChatManager.updateChat(room.id, updatedRoom);
        setRoom(updatedRoom);
      }
    } catch (error) {
      console.error('Error changing model:', error);
      setError(error instanceof Error ? error.message : 'Error changing model');
      // Revert to the previous model
      setSelectedModel(room?.modelId || '');
    } finally {
      setIsModelLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !engineRef.current || !room) {
      console.error('Cannot send message: engine not initialized or missing data');
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    const updatedMessages = [...room.messages, userMessage];
    
    // Update room messages
    const updatedRoom = {
      ...room,
      messages: updatedMessages,
      lastUpdated: Date.now()
    };
    setRoom(updatedRoom);

    // Save to ChatManager
    await ChatManager.updateChat(room.id, updatedRoom);

    setInput('');
    setIsMessageSending(true);

    try {
      // Add message to vector store
      await vectorStoreRef.current?.addDocuments([
        new Document({ pageContent: input })
      ]);

      // Get relevant context from previous messages
      const relevantDocs = await vectorStoreRef.current?.similaritySearch(input, 3);
      const context = relevantDocs?.map(doc => doc.pageContent).join('\n') || '';

      let response = '';

      // System instruction to guide the model's behavior
      const systemInstruction = `You are a helpful AI assistant. Your responses should:
      1. NEVER repeat or rephrase the user's question
      2. Provide direct answers without any preamble
      3. Be concise and to the point
      4. Focus on the specific information requested
      5. If you don't know something, simply say "I don't know"`;

      // Use the engine's chat completion API with proper message formatting
      const messages = [
        {
          role: "system",
          content: systemInstruction
        },
        ...updatedMessages
      ].filter(msg => msg.content !== "");

      const chunks = await engineRef.current.chat.completions.create({
        messages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
        stream_options: { include_usage: true },
        response_format: { type: "text" }
      });
      
      let reply = "";
      for await (const chunk of chunks) {
        const content = chunk.choices[0]?.delta.content;
        if (content !== undefined && content !== null) {
          reply += content;
        }
        if (chunk.usage) {
          console.log(chunk.usage); // only last chunk has usage
        }
      }

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: reply
      };
      const newMessages = [...updatedRoom.messages, assistantMessage];
      const newRoom = {
        ...updatedRoom,
        messages: newMessages,
        lastUpdated: Date.now()
      };
      setRoom(newRoom);

      // Save to ChatManager
      await ChatManager.updateChat(room.id, newRoom);

    } catch (error) {
      console.error('Error in chat:', error);
      const errorMessage: Message = { 
        role: 'assistant', 
        content: 'Sorry, there was an error processing your message.' 
      };
      const updatedMessages = [...updatedRoom.messages, errorMessage];
      const newRoom = {
        ...updatedRoom,
        messages: updatedMessages,
        lastUpdated: Date.now()
      };
      setRoom(newRoom);

      // Save to ChatManager
      await ChatManager.updateChat(room.id, newRoom);
    } finally {
      setIsMessageSending(false);
    }
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // You could add a toast notification here if you want
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleContextMenuToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!room) return;
    
    const checked = e.target.checked;
    const updatedRoom = {
      ...room,
      isVisibleInContextMenu: checked,
      lastUpdated: Date.now()
    };
    
    try {
      await ChatManager.updateChat(room.id, updatedRoom);
      setRoom(updatedRoom);
    } catch (error) {
      console.error('Error updating chat settings:', error);
    }
  };

  const handleAttachmentClick = () => {
    // TODO: Implement attachment functionality
    console.log('Attachment clicked');
  };

  if (!room) {
    return <div>Loading...</div>;
  }

  return (
    <div className="chat-detail">
      <div className="chat-main">
        {room.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <Plus size={24} className="text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Start a new conversation</h2>
            <p className="text-gray-500 max-w-md">
              Select a template or type your message to begin chatting with the AI assistant.
            </p>
          </div>
        ) : (
          <>
            {room.messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.role === 'user' ? 'message-user' : 'message-assistant'}`}
              >
                {message.content}
                {message.role === 'assistant' && (
                  <div className="message-actions">
                    <button 
                      className="p-1 hover:bg-gray-100 rounded-full"
                      onClick={() => handleCopyMessage(message.content)}
                      title="Copy message"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} style={{ float: 'left', clear: 'both' }} />
          </>
        )}  
      </div>
      <div className="chat-footer">
        <form onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}>
          {showSettings && (
            <div className="settings-panel">
              <div className="settings-section">
                <h3>Model Settings</h3>
                <div className="template-selector">
                  {selectedModel && (
                    <select
                      value={selectedModel}
                      onChange={handleModelChange}
                      disabled={isModelLoading || isMessageSending}
                      className="model-select"
                    >
                      {availableModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  )}
                  {isModelLoading && (
                    <span className="text-sm text-gray-500">Initializing model...</span>
                  )}
                </div>
              </div>

              <div className="settings-section">
                <h3>Template Settings</h3>
                <div className="template-selector">
                  <select 
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    value=""
                    className="template-select"
                  >
                    <option value="">Select a template</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => navigate('/prompts')}
                    className="manage-templates-button"
                  >
                    Manage Templates
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="input-area">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask me anything..."
              disabled={isModelLoading || isMessageSending || !engineRef.current}
              rows={2}
            />
            <div className="input-toolbar">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/chats')}
                  className="back-button"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="settings-button"
                  type="button"
                >
                  <Settings size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleAttachmentClick}
                  className="attachment-button"
                >
                  <Paperclip size={16} />
                </button>
              </div>
              <button
                type="submit"
                disabled={isModelLoading || isMessageSending || !input.trim() || !engineRef.current}
                className="send-button"
              >
                {isMessageSending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⚪</span>
                    Sending...
                  </span>
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatDetail; 