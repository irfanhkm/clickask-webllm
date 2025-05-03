import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_SYSTEM_PROMPT } from './ModelManager';
import './ModelSelection.css';

const SystemPromptManager: React.FC = () => {
  const navigate = useNavigate();
  const [systemPrompt, setSystemPrompt] = useState<string>(DEFAULT_SYSTEM_PROMPT);

  useEffect(() => {
    // Load the current system prompt from localStorage
    const savedPrompt = localStorage.getItem('globalSystemPrompt');
    if (savedPrompt) {
      setSystemPrompt(savedPrompt);
    }
  }, []);

  const handleSave = () => {
    // Save the system prompt to localStorage
    localStorage.setItem('globalSystemPrompt', systemPrompt.trim());
    alert('System prompt saved successfully!');
  };

  return (
    <div className="model-selection">
        <div className="system-prompt-section mb-4 w-full max-w-2xl">
        <label className="block text-sm font-medium text-gray-700 mb-2">
            Global System Prompt
        </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter a system prompt to guide the model's behavior..."
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            rows={8}
          />
        </div>

        <button
          className="download-button"
          onClick={handleSave}
        >
          Save System Prompt
        </button>
    </div>
  );
};

export default SystemPromptManager; 