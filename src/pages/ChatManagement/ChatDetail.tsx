import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ChatDetail.css';
import { ChatManager } from './ChatManager';
import { ChatRoom } from './types/chat';
import { ModelManager } from '../ModelManagement/ModelManager';
import { PromptManager, PromptTemplate } from '../PromptManagement/PromptManager';
import { Send, Plus, Copy, Settings, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import browser from 'webextension-polyfill';
import { createMarkdownComponents } from './MarkdownComponents';
import { StorageKey } from '../../constants';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Input mode types
type InputMode = 'freeText' | 'prompt';

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
  const engineRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('freeText');
  const [promptInputs, setPromptInputs] = useState<{[key: string]: string}>({});
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [latestTemplateId, setLatestTemplateId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Combined scroll effect for both message changes and streaming
  useEffect(() => {
    if (isMessageSending) {
      // During streaming, scroll continuously
      const interval = setInterval(scrollToBottom, 100);
      return () => clearInterval(interval);
    } else {
      // For regular message changes, scroll once
      scrollToBottom();
    }
  }, [room?.messages, isMessageSending]);

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
      const downloadedModels = await ModelManager.getAvailableModels();
      if (downloadedModels) {
        setAvailableModels(downloadedModels);
      } else {
        setAvailableModels([]);
      }
    };
    initData();

    // Cleanup function
    return () => {
      // Clear vector store reference
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
          await browser.storage.local.set({ [StorageKey.CURRENT_CHAT_ID]: roomId });
          
          setRoom({
            ...room,
            lastUpdated: room.lastUpdated || Date.now(),
            isVisibleInContextMenu: room.isVisibleInContextMenu ?? false
          });
          
          // Handle initial prompt and prompt mode if set
          if (room.initialPrompt) {
            setInput(room.initialPrompt);
            
            // Check if we should use prompt mode
            if (room.usePromptMode) {
              setInputMode('prompt');
              // Check for placeholders after a short delay to ensure state is updated
              setTimeout(() => {
                checkForPlaceholders();
              }, 100);
            }
          }
          
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
          console.error('Chat room not found');
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

  // Add this useEffect to watch for input changes in prompt mode
  useEffect(() => {
    if (inputMode === 'prompt') {
      checkForPlaceholders();
    }
  }, [input, inputMode]);

  // Update checkForPlaceholders to be more robust
  const checkForPlaceholders = () => {
    if (!input) return;
    
    // Find all text within curly braces
    const placeholderRegex = /\{([^{}]+)\}/g;
    const matches = [...input.matchAll(placeholderRegex)];
    
    if (matches.length > 0) {
      // Extract unique placeholder names
      const uniquePlaceholders = [...new Set(matches.map(match => match[1]))];
      
      // Initialize empty values for each placeholder
      const newInputs: {[key: string]: string} = {};
      uniquePlaceholders.forEach((placeholderName, index) => {
        newInputs[`input${index}`] = '';
      });
      
      setPromptInputs(newInputs);
      
      // After setting up placeholders, check for highlighted text
      browser.storage.local.get(StorageKey.HIGHLIGHTED_TEXT).then(result => {
        const highlightedText = result[StorageKey.HIGHLIGHTED_TEXT];
        if (highlightedText && Object.keys(newInputs).length > 0) {
          // Fill the first prompt input with the highlighted text
          const firstInputKey = Object.keys(newInputs)[0];
          setPromptInputs(prev => ({
            ...prev,
            [firstInputKey]: highlightedText
          }));
          
          // Clear the highlighted text from storage
          browser.storage.local.remove(StorageKey.HIGHLIGHTED_TEXT);
        }
      });
    } else {
      // Clear inputs if no placeholders found
      setPromptInputs({});
    }
  };

  // Update input and check for placeholders
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newInput = e.target.value;
    setInput(newInput);
    
    // If in prompt mode, check for placeholders
    if (inputMode === 'prompt') {
      checkForPlaceholders();
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setInput(template.content);
      setLatestTemplateId(templateId);
      // First set the input mode to prompt if template has placeholders
      const hasPlaceholders = template.content.match(/\{([^{}]+)\}/);
      if (hasPlaceholders) {
        setInputMode('prompt');
      }
      // Then set the input content
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

  // Process input based on selected mode
  const processInput = (): string => {
    if (inputMode === 'freeText') {
      return input;
    } else {
      // Prompt mode - replace placeholders with user inputs
      let processedInput = input;
      Object.entries(promptInputs).forEach(([key, value], index) => {
        // Find the placeholder at this index
        const placeholderRegex = /\{([^{}]+)\}/g;
        const matches = [...input.matchAll(placeholderRegex)];
        
        if (matches[index]) {
          const placeholder = matches[index][0]; // Full match like {placeholderName}
          processedInput = processedInput.replace(placeholder, value);
        }
      });
      return processedInput;
    }
  };

  const handleSend = async () => {
    setValidationError(null);
    if (!input.trim() || !engineRef.current || !room) {
      console.error('Cannot send message: engine not initialized or missing data');
      return;
    }
    // Validation for prompt mode: all placeholders must be filled
    if (inputMode === 'prompt') {
      const emptyKey = Object.entries(promptInputs).find(([_, v]) => !v.trim());
      if (emptyKey) {
        setValidationError('Please fill in all placeholder values before sending.');
        return;
      }
    }

    // Process input based on selected mode
    const userMsg = processInput();
    
    const userMessage: Message = { role: 'user', content: userMsg };
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

    // After sending in prompt mode, reset input to latest template or default
    if (inputMode === 'prompt') {
      if (latestTemplateId) {
        const latestTemplate = templates.find(t => t.id === latestTemplateId);
        setInput(latestTemplate ? latestTemplate.content : 'Write a {type} about {topic} with a {tone} tone.');
      } else {
        setInput('Write a {type} about {topic} with a {tone} tone.');
      }
    } else {
      setInput('');
    }
    setIsMessageSending(true);

    try {
      // Get system prompt from ModelManager
      const systemPrompt = await ModelManager.getSystemPrompt();

      // Use the engine's chat completion API with proper message formatting
      const messages = [
        {
          role: "system",
          content: systemPrompt
        },
        ...updatedMessages
      ].filter(msg => msg.content !== "");

      // Create a temporary message for streaming
      const streamingMessage: Message = { role: 'assistant', content: '' };
      const streamingMessages = [...updatedMessages, streamingMessage];
      const streamingRoom = {
        ...updatedRoom,
        messages: streamingMessages,
        lastUpdated: Date.now()
      };
      setRoom(streamingRoom);

      const chunks = await engineRef.current.chat.completions.create({
        messages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.0,
        stream_options: { include_usage: true },
        response_format: { type: "text" }
      });
      
      let reply = "";
      for await (const chunk of chunks) {
        const content = chunk.choices[0]?.delta.content;
        if (content !== undefined && content !== null) {
          reply += content;
          // Update the streaming message content
          streamingMessage.content = reply;
          setRoom({
            ...streamingRoom,
            messages: [...updatedMessages, { ...streamingMessage }]
          });
        }
      }

      // Final update with complete message
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: reply
      };
      const newMessages = [...updatedMessages, assistantMessage];
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
      scrollToBottom();
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

  const handleInputModeChange = (mode: InputMode) => {
    // Check for unsaved input in current mode
    let hasUnsaved = false;
    if (inputMode === 'freeText' && input.trim()) {
      hasUnsaved = true;
    } else if (inputMode === 'prompt' && Object.values(promptInputs).some(v => v.trim())) {
      hasUnsaved = true;
    }
    if (hasUnsaved) {
      if (!window.confirm('You have unsaved input. Changing mode will clear it. Continue?')) {
        return;
      }
    }
    setInputMode(mode);
    setInput(''); // Clear textarea/input when changing mode
    setPromptInputs({});
    setValidationError(null);
    // If switching to prompt mode, set default example prompt
    if (mode === 'prompt') {
      setInput('Write a {type} about {topic} with a {tone} tone.');
      setTimeout(() => {
        checkForPlaceholders();
      }, 0);
    }
  };

  const handlePromptInputChange = (key: string, value: string) => {
    setPromptInputs(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const markdownComponents = createMarkdownComponents({
    onCopyCode: handleCopyMessage
  });

  // Add message listener for updates from background script
  useEffect(() => {
    const handleMessage = async (message: any) => {
      if (message.action === 'UPDATE_CHAT_DETAIL') {
        // If we're already on the correct chat page
        if (roomId === message.chatId) {
          // If we have highlighted text and we're in prompt mode
          if (message.highlightedText && inputMode === 'prompt') {
            // Check for placeholders and fill the first one
            setTimeout(() => {
              checkForPlaceholders();
              if (Object.keys(promptInputs).length > 0) {
                const firstInputKey = Object.keys(promptInputs)[0];
                setPromptInputs(prev => ({
                  ...prev,
                  [firstInputKey]: message.highlightedText
                }));
              }
            }, 100);
          }
        } else {
          // If we're on a different chat, navigate to the new one
          navigate(`/chats/${message.chatId}`);
        }
      }
    };

    // Add message listener
    browser.runtime.onMessage.addListener(handleMessage);

    // Cleanup
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, [roomId, inputMode, promptInputs, navigate]);

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
                className={`message ${message.role === 'user' ? 'message-user' : 'message-assistant'} ${
                  index === room.messages.length - 1 && message.role === 'assistant' && isMessageSending ? 'message-streaming' : ''
                }`}
              >
                {message.role !== 'user' && (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
                {message.role === 'user' && (
                  <>{message.content}</>
                )}
                {message.role === 'assistant' && !isMessageSending && (
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
                </div>
              </div>
            </div>
          )}
          <div className="input-area">
            {validationError && (
              <div className="validation-error">{validationError}</div>
            )}
            {inputMode === 'freeText' ? (
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask me anything..."
                disabled={isModelLoading || isMessageSending || !engineRef.current}
                rows={3}
              />
            ) : (
              <div className="prompt-input-container">
                <div className="prompt-display">
                  {isEditing ? (
                    <textarea
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          setIsEditing(false);
                          checkForPlaceholders();
                        }
                      }}
                      onBlur={() => {
                        setIsEditing(false);
                        checkForPlaceholders();
                      }}
                      className="prompt-edit-textarea"
                      rows={3}
                      autoFocus
                    />
                  ) : (
                    <div className="prompt-text">
                      {input.split(/(\{[^{}]+\})/).map((part, index) => {
                        // Check if this part is a placeholder
                        const isPlaceholder = part.match(/^\{[^{}]+\}$/);
                        if (isPlaceholder) {
                          // Find the index of this placeholder
                          const placeholderRegex = /\{([^{}]+)\}/g;
                          const matches = [...input.matchAll(placeholderRegex)];
                          const placeholderIndex = matches.findIndex(match => match[0] === part);
                          
                          // Get the value for this placeholder
                          const placeholderKey = `input${placeholderIndex}`;
                          const placeholderValue = promptInputs[placeholderKey] || '';
                          
                          return (
                            <span key={index} className="prompt-placeholder">
                              {placeholderValue || part}
                            </span>
                          );
                        } else {
                          return <span key={index}>{part}</span>;
                        }
                      })}
                    </div>
                  )}
                </div>
                <div className="prompt-actions prompt-actions-row">
                  <button 
                    type="button" 
                    className="edit-prompt-button icon-tooltip-btn"
                    onClick={() => setIsEditing(true)}
                    aria-label="Edit prompt"
                  >
                    <Pencil size={16} />
                    <span className="icon-tooltip">Edit prompt</span>
                  </button>
                  {Object.keys(promptInputs).length > 0 && (
                    <button
                      type="button"
                      className="toggle-placeholders-button icon-tooltip-btn"
                      onClick={() => setShowPlaceholders(!showPlaceholders)}
                      aria-label={showPlaceholders ? 'Hide Inputs' : 'Show Inputs'}
                    >
                      {showPlaceholders ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span className="icon-tooltip">{showPlaceholders ? 'Hide Inputs' : 'Show Inputs'}</span>
                    </button>
                  )}
                </div>
                {showPlaceholders && Object.keys(promptInputs).length > 0 && (
                  <div className="prompt-inputs">
                    <h4>Placeholder Values:</h4>
                    {Object.entries(promptInputs).map(([key, value], index) => {
                      // Find the placeholder name at this index
                      const placeholderRegex = /\{([^{}]+)\}/g;
                      const matches = [...input.matchAll(placeholderRegex)];
                      const placeholderName = matches[index] ? matches[index][1] : `Placeholder ${index + 1}`;
                      
                      return (
                        <div key={key} className="prompt-input-field">
                          <label>{placeholderName}:</label>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => handlePromptInputChange(key, e.target.value)}
                            placeholder={`Value for ${placeholderName}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <div className="input-toolbar">
              <div className="flex items-center">
                <button
                  onClick={() => navigate('/chats')}
                  className="back-button"
                >
                  ←
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="settings-button"
                  type="button"
                >
                  <Settings size={16} />
                </button>
                <div className="input-mode-slider-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="input-mode-slider">
                    <button
                      type="button"
                      className={`slider-option${inputMode === 'freeText' ? ' selected' : ''}`}
                      onClick={() => handleInputModeChange('freeText')}
                    >
                      Text
                    </button>
                    <button
                      type="button"
                      className={`slider-option${inputMode === 'prompt' ? ' selected' : ''}`}
                      onClick={() => handleInputModeChange('prompt')}
                    >
                      Prompt
                    </button>
                  </div>
                  {(inputMode === 'prompt' && !isModelLoading) && (
                    <select 
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                      value=""
                      className="template-select toolbar-template-select"
                      style={{ minWidth: 140 }}
                    >
                      <option value="">Select a template</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              {isModelLoading && (
                <span className="text-sm text-gray-500">Initializing model...</span>
              )}
              <button
                type="submit"
                disabled={isModelLoading || isMessageSending || !input.trim() || !engineRef.current}
                className="send-button"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatDetail; 