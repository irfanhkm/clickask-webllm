import React, { useState, useEffect, useRef } from 'react';
import { CreateMLCEngine, ModelRecord, prebuiltAppConfig } from '@mlc-ai/web-llm';
import { useNavigate } from 'react-router-dom';
import { modelList, getModelInfo, ModelManager } from './ModelManager';
import { StorageKey } from '../../constants';
import { Download, Pause, Play, X, Check, Star, Info } from 'lucide-react';
import browser from 'webextension-polyfill';
import './ModelSelection.css';

// Extend ModelRecord to include size
interface ExtendedModelRecord extends ModelRecord {
  size?: number;
}

interface DownloadProgress {
  [key: string]: number;
}

interface DownloadState {
  modelId: string;
  progress: number;
  timestamp: number;
}

const ModelSelection: React.FC = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<ExtendedModelRecord[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelRecord | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({});
  const [isDownloading, setIsDownloading] = useState<{[key: string]: boolean}>({});
  const [isDownloaded, setIsDownloaded] = useState<{[key: string]: boolean}>({});
  const [defaultModel, setDefaultModel] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<{[key: string]: boolean}>({});
  const abortControllers = useRef<{[key: string]: AbortController}>({});
  const ongoingDownloads = useRef<{[key: string]: boolean}>({});

  // Load saved download states and resume downloads
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check for downloaded models
        const result = await browser.storage.local.get(StorageKey.DOWNLOADED_MODELS);
        const downloadedModels = result[StorageKey.DOWNLOADED_MODELS] || [];
        const downloadedMap = downloadedModels.reduce((acc: {[key: string]: boolean}, model: any) => {
          acc[model.name] = true;
          return acc;
        }, {});
        setIsDownloaded(downloadedMap);

        // Get default model from storage
        const defaultModelResult = await browser.storage.local.get(StorageKey.DEFAULT_MODEL);
        const savedDefaultModel = defaultModelResult[StorageKey.DEFAULT_MODEL] || '';
        setDefaultModel(savedDefaultModel);

        // Filter models that match our available models list
        console.log(prebuiltAppConfig.model_list);
        const filteredModels = prebuiltAppConfig.model_list.filter(model => 
          modelList.some(m => m.name === model.model_id)
        );
        setModels(filteredModels);
        
        // Check for incomplete downloads and resume them
        const downloadStatesResult = await browser.storage.local.get(StorageKey.DOWNLOAD_STATES);
        const savedDownloadStates = downloadStatesResult[StorageKey.DOWNLOAD_STATES] || [];
        
        if (savedDownloadStates.length > 0) {
          // Resume all incomplete downloads instead of just the most recent one
          for (const downloadState of savedDownloadStates) {
            const model = filteredModels.find(m => m.model_id === downloadState.modelId);
            
            if (model && !downloadedMap[model.model_id]) {
              // Set initial progress before starting the download
              setDownloadProgress(prev => ({ ...prev, [model.model_id]: downloadState.progress }));
              setIsDownloading(prev => ({ ...prev, [model.model_id]: true }));
              ongoingDownloads.current[model.model_id] = true;
              
              // Start the download
              handleDownload(model, downloadState.progress);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeData();
  }, []);

  // Save download progress to storage only when needed
  useEffect(() => {
    if (!isInitialized) return;
    
    // Only save download states for models that are actually downloading
    const activeDownloadStates: DownloadState[] = Object.entries(downloadProgress)
      .filter(([modelId]) => isDownloading[modelId] && !isDownloaded[modelId])
      .map(([modelId, progress]) => ({
        modelId,
        progress,
        timestamp: Date.now()
      }));

    if (activeDownloadStates.length > 0) {
      browser.storage.local.set({ [StorageKey.DOWNLOAD_STATES]: activeDownloadStates });
    } else {
      browser.storage.local.remove(StorageKey.DOWNLOAD_STATES);
    }
  }, [downloadProgress, isDownloading, isDownloaded, isInitialized]);

  const handleModelSelect = (modelId: string) => {
    const model = models.find(m => m.model_id === modelId);
    if (model) {
      setSelectedModel(model);
    }
  };

  const handleDefaultModelChange = async (modelId: string) => {
    setDefaultModel(modelId);
    await browser.storage.local.set({ [StorageKey.DEFAULT_MODEL]: modelId });
  };

  const handleDownload = async (model: ModelRecord, initialProgress: number = 0) => {
    try {
      // Create a new AbortController for this download
      const controller = new AbortController();
      abortControllers.current[model.model_id] = controller;
      
      // Set downloading state before starting
      setIsDownloading(prev => ({ ...prev, [model.model_id]: true }));
      ongoingDownloads.current[model.model_id] = true;
      
      // Initialize WebLLM engine - this will handle IndexedDB caching automatically
      const engine = await CreateMLCEngine(model.model_id, {
        initProgressCallback: (report: { progress: number }) => {
          if (report.progress) {
            const newProgress = Math.floor(report.progress * 10000) / 100;
            setDownloadProgress((prev) => ({
              ...prev,
              [model.model_id]: newProgress,
            }));
          }
        },
      });
      
      // Save the downloaded model info to storage
      const result = await browser.storage.local.get(StorageKey.DOWNLOADED_MODELS);
      const downloadedModels = result[StorageKey.DOWNLOADED_MODELS] || [];
      const modelInfo = {
        name: model.model_id,
        displayName: model.model_lib
      };
      
      if (!downloadedModels.some((m: any) => m.name === modelInfo.name)) {
        downloadedModels.push(modelInfo);
        await browser.storage.local.set({ [StorageKey.DOWNLOADED_MODELS]: downloadedModels });
      }

      // Update downloaded status
      setIsDownloaded((prev) => ({ ...prev, [model.model_id]: true }));
      
      // Check for pending template
      const templateResult = await browser.storage.local.get(StorageKey.PENDING_TEMPLATE);
      const pendingTemplate = templateResult[StorageKey.PENDING_TEMPLATE];
      
      if (pendingTemplate) {
        // Clear the pending template
        await browser.storage.local.remove(StorageKey.PENDING_TEMPLATE);
        
        // Create a new chat room with the template
        const chatTitle = pendingTemplate.title.length > 20 
          ? pendingTemplate.title.substring(0, 20) + "..."
          : pendingTemplate.title;
        
        const newChatRoom = {
          id: Date.now().toString(),
          name: chatTitle,
          modelId: model.model_id,
          messages: [],
          createdAt: Date.now(),
          lastUpdated: Date.now(),
          initialPrompt: pendingTemplate.content,
          usePromptMode: true
        };
        
        // Save the new chat room
        await browser.storage.local.set({ 
          [StorageKey.CURRENT_CHAT_ID]: newChatRoom.id 
        });
        
        // Add the chat to the list of chats
        const chatsResult = await browser.storage.local.get(StorageKey.CHATS);
        const chats = chatsResult[StorageKey.CHATS] || {};
        chats[newChatRoom.id] = newChatRoom;
        await browser.storage.local.set({ [StorageKey.CHATS]: chats });
        
        // Navigate to the new chat room
        navigate(`/chats/${newChatRoom.id}`);
      } else {
        // Navigate to chat list if no pending template
        navigate('/chats');
      }
    } catch (error: any) {
      if (error?.name != 'AbortError') {
        console.error(`Error downloading model ${model.model_id}:`, error);
      }
    } finally {
      setIsDownloading((prev) => ({ ...prev, [model.model_id]: false }));
      setIsPaused((prev) => ({ ...prev, [model.model_id]: false }));
      ongoingDownloads.current[model.model_id] = false;
      
      // Clean up the AbortController
      delete abortControllers.current[model.model_id];
      
      // Only clear progress if the download was cancelled or failed
      if (!isDownloaded[model.model_id]) {
        setDownloadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[model.model_id];
          return newProgress;
        });
      }
    }
  };

  const handleCancelDownload = async (modelId: string) => {
    if (abortControllers.current[modelId]) {
      abortControllers.current[modelId].abort();
      
      // Immediately update UI state
      setIsDownloading(prev => ({ ...prev, [modelId]: false }));
      setIsPaused(prev => ({ ...prev, [modelId]: false }));
      ongoingDownloads.current[modelId] = false;
      
      // Clear the progress
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[modelId];
        return newProgress;
      });
      
      // Clean up the AbortController
      delete abortControllers.current[modelId];
      
      // Remove from storage to allow redownload
      const result = await browser.storage.local.get(StorageKey.DOWNLOAD_STATES);
      const savedDownloadStates = result[StorageKey.DOWNLOAD_STATES] || [];
      const updatedDownloadStates = savedDownloadStates.filter((state: DownloadState) => state.modelId !== modelId);
      await browser.storage.local.set({ [StorageKey.DOWNLOAD_STATES]: updatedDownloadStates });
    }
  };

  const handlePauseResumeDownload = (modelId: string) => {
    if (isPaused[modelId]) {
      // Resume download
      setIsPaused(prev => ({ ...prev, [modelId]: false }));
      const model = models.find(m => m.model_id === modelId);
      if (model) {
        const progress = downloadProgress[modelId] || 0;
        handleDownload(model, progress);
      }
    } else {
      // Pause download
      setIsPaused(prev => ({ ...prev, [modelId]: true }));
      if (abortControllers.current[modelId]) {
        abortControllers.current[modelId].abort();
      }
    }
  };

  const getParameterSize = (modelId: string): string | null => {
    // Look for patterns like 7B, 0.5B, 360M, 1.5K, etc.
    const match = modelId.match(/(\d+(?:\.\d+)?[BKMG])/);
    if (!match) return null;
    
    const size = match[1];
    // Convert to a more readable format
    if (size.includes('B')) {
      return `${size} parameters`;
    } else if (size.includes('M')) {
      return `${size} parameters`;
    } else if (size.includes('K')) {
      return `${size} parameters`;
    }
    return null;
  };

  const getModelType = (modelId: string): string => {
    if (modelId.includes('Coder')) return 'Coding';
    if (modelId.includes('Instruct')) return 'Instruction';
    return 'General';
  };

  const formatVRAM = (mb: number): string => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)}GB`;
    }
    return `${mb}MB`;
  };

  // Tooltip content for different chip types
  const getTooltipContent = (type: string, value: string | number | null): string => {
    switch (type) {
      case 'size':
        return 'The number of parameters in the model. Larger models generally have better performance but require more resources.';
      case 'type':
        return value === 'Coding' 
          ? 'Specialized for code generation and programming tasks.' 
          : value === 'Instruction' 
            ? 'Optimized for following instructions and general conversation.' 
            : 'General-purpose model for various tasks.';
      case 'heavy':
        return 'This model requires significant computational resources. Ensure your device meets the requirements.';
      case 'vram':
        return `This model requires approximately ${value} of VRAM to run. Make sure your GPU has enough memory.`;
      default:
        return '';
    }
  };

  const isHeavyModel = (modelId: string): boolean => {
    const size = getParameterSize(modelId);
    return size !== null && size.includes('parameters');
  };

  return (
    <div className="model-selection-container">
      <div className="model-cards-list">
        {models.map((model) => {
          const modelId = model.model_id;
          const modelInfo = getModelInfo(modelId);
          const progress = downloadProgress[modelId] || 0;
          const downloading = isDownloading[modelId] || false;
          const downloaded = isDownloaded[modelId] || false;
          const paused = isPaused[modelId] || false;
          const parameterSize = getParameterSize(modelId);
          const modelType = getModelType(modelId);
          const lowResource = model.low_resource_required || false;
          const vramRequired = model.vram_required_MB || 0;
          const heavy = isHeavyModel(modelId);
          
          return (
            <div
              key={modelId}
              className={`model-card ${selectedModel?.model_id === modelId ? 'selected' : ''}`}
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest('button')) {
                  handleModelSelect(modelId);
                }
              }}
            >
              <div className="model-card-content">
                <div className="model-card-header">
                  <div className="model-card-title">
                    <input
                      type="radio"
                      id={`default-${modelId}`}
                      name="default-model"
                      checked={defaultModel === modelId}
                      onChange={() => handleDefaultModelChange(modelId)}
                      disabled={!downloaded}
                      className="default-model-radio"
                    />
                    <label htmlFor={`default-${modelId}`} className="default-model-label">
                      <h3>{modelId.split('-')[0]}</h3>
                    </label>
                  </div>
                  <div className="model-card-actions">
                    {downloaded ? (
                      <button className="action-button success" disabled>
                        <Check size={16} />
                        <span>Downloaded</span>
                      </button>
                    ) : downloading ? (
                      <div className="download-controls">
                        <button
                          className="action-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePauseResumeDownload(modelId);
                          }}
                        >
                          {paused ? <Play size={16} /> : <Pause size={16} />}
                          <span>{paused ? 'Resume' : 'Pause'}</span>
                        </button>
                        <button
                          className="action-button danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelDownload(modelId);
                          }}
                        >
                          <X size={16} />
                          <span>Cancel</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        className="action-button primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(model);
                        }}
                      >
                        <Download size={16} />
                        <span>Download</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="model-card-info">
                  <div className="model-description">
                    <p>{model.model_lib}</p>
                  </div>
                  
                  <div className="model-tags">
                    {parameterSize && (
                      <div className="tooltip-container">
                        <span className="model-tag size">{parameterSize}</span>
                        <div className="tooltip">
                          <Info size={14} />
                          <span>{getTooltipContent('size', parameterSize)}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="tooltip-container">
                      <span className="model-tag type">{modelType}</span>
                      <div className="tooltip">
                        <Info size={14} />
                        <span>{getTooltipContent('type', modelType)}</span>
                      </div>
                    </div>
                    
                    {!lowResource && (
                      <div className="tooltip-container">
                        <span className="model-tag heavy">Heavy Resource</span>
                        <div className="tooltip">
                          <Info size={14} />
                          <span>{getTooltipContent('heavy', null)}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="tooltip-container">
                      <span className="model-tag vram">VRAM: {formatVRAM(vramRequired)}</span>
                      <div className="tooltip">
                        <Info size={14} />
                        <span>{getTooltipContent('vram', formatVRAM(vramRequired))}</span>
                      </div>
                    </div>
                  </div>

                  {downloading && (
                    <div className="download-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="progress-text">{progress}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {models.length === 0 && (
          <div className="no-models">
            No models available. Please check your connection and try again.
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelSelection; 