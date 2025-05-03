import React, { useState, useEffect } from 'react';
import { CreateMLCEngine, ModelRecord, prebuiltAppConfig } from '@mlc-ai/web-llm';
import { useNavigate } from 'react-router-dom';
import { modelList, getModelInfo } from './ModelManager';
import './ModelSelection.css';

// Extend ModelRecord to include size
interface ExtendedModelRecord extends ModelRecord {
  size?: number;
}

// Helper function to format bytes to human readable size
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface DownloadProgress {
  [key: string]: number;
}

interface ModelInfo {
  modelId: string;
  modelLib: string;
  requiredFeatures: string[];
  timestamp: string;
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
    const downloadedModels = JSON.parse(localStorage.getItem('downloadedModels') || '[]');
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
      const downloadedModels = JSON.parse(localStorage.getItem('downloadedModels') || '[]');
      const modelInfo = {
        name: selectedModel.model_id,
        displayName: selectedModel.model_lib
      };
      
      if (!downloadedModels.some((m: any) => m.name === modelInfo.name)) {
        downloadedModels.push(modelInfo);
        localStorage.setItem('downloadedModels', JSON.stringify(downloadedModels));
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
      <div className="flex justify-between items-center mb-6">
        <h1>Select a Model</h1>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Back to Home
        </button>
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
  );
};

export default ModelSelection; 