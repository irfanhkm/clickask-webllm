import React, { useState, useEffect } from 'react';
import { CreateMLCEngine, ModelRecord, prebuiltAppConfig } from '@mlc-ai/web-llm';
import { useNavigate } from 'react-router-dom';
import { modelList, getModelInfo, ModelManager } from './ModelManager';
import { StorageKey } from '../../constants';
import './ModelSelection.css';

// Extend ModelRecord to include size
interface ExtendedModelRecord extends ModelRecord {
  size?: number;
}

interface DownloadProgress {
  [key: string]: number;
}

const ModelSelection: React.FC = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<ExtendedModelRecord[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelRecord | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({});
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isDownloaded, setIsDownloaded] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    // Check for downloaded models
    const downloadedModels = JSON.parse(localStorage.getItem(StorageKey.DOWNLOADED_MODELS) || '[]');
    const downloadedMap = downloadedModels.reduce((acc: {[key: string]: boolean}, model: any) => {
      acc[model.name] = true;
      return acc;
    }, {});
    setIsDownloaded(downloadedMap);

    // Filter models that match our available models list
    console.log(prebuiltAppConfig.model_list);
    const filteredModels = prebuiltAppConfig.model_list.filter(model => 
      modelList.some(m => m.name === model.model_id)
    );
    setModels(filteredModels);
  }, []);

  const handleModelSelect = (modelId: string) => {
    const model = models.find(m => m.model_id === modelId);
    if (model) {
      setSelectedModel(model);
    }
  };

  const handleDownload = async () => {
    if (!selectedModel) return;

    try {
      setDownloadProgress({ [selectedModel.model_id]: 0 });
      setIsDownloading(true);

      // Initialize WebLLM engine - this will handle IndexedDB caching automatically
      const engine = await CreateMLCEngine(selectedModel.model_id, {
        initProgressCallback: (report: { progress: number }) => {
          if (report.progress) {
            setDownloadProgress((prev) => ({
              ...prev,
              [selectedModel.model_id]: Math.floor(report.progress * 10000) / 100,
            }));
          }
        },
      });

      // Save the downloaded model info to localStorage
      const downloadedModels = JSON.parse(localStorage.getItem(StorageKey.DOWNLOADED_MODELS) || '[]');
      const modelInfo = {
        name: selectedModel.model_id,
        displayName: selectedModel.model_lib
      };
      
      if (!downloadedModels.some((m: any) => m.name === modelInfo.name)) {
        downloadedModels.push(modelInfo);
        localStorage.setItem(StorageKey.DOWNLOADED_MODELS, JSON.stringify(downloadedModels));
      }

      // Navigate to chat after successful download
      navigate('/chats');
    } catch (error) {
      console.error('Error downloading model:', error);
    } finally {
      setIsDownloading(false);
      setDownloadProgress({});
      setSelectedModel(null);
    }
  };

  return (
    <div className="model-selection">
      <div className="flex justify-between items-center">
        <h1>Select a Model</h1>
      </div>
      <div className="model-list">
        {models.map((model) => {
          const modelInfo = getModelInfo(model.model_id);
          return (
            <div
              key={model.model_id}
              className={`model-card ${selectedModel?.model_id === model.model_id ? 'selected' : ''}`}
              onClick={() => handleModelSelect(model.model_id)}
            >
              <h3>{model.model_id}</h3>
              <p>{model.model_lib}</p>
            </div>
          );
        })}
      </div>
      
      <div className="model-actions">
        <button
          className="download-button"
          onClick={handleDownload}
          disabled={!selectedModel || isDownloading || isDownloaded[selectedModel.model_id]}
        >
          {selectedModel && isDownloaded[selectedModel.model_id] 
            ? "Already Downloaded"
            : isDownloading 
              ? selectedModel && downloadProgress[selectedModel.model_id] === 0
                ? "Initializing model download..."
                : `Downloading... ${selectedModel ? downloadProgress[selectedModel.model_id] || 0 : 0}%` 
              : 'Download Model'}
        </button>
      </div>
    </div>
  );
};

export default ModelSelection; 