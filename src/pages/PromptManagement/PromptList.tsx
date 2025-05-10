import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PromptManager, PromptTemplate } from './PromptManager';
import { DEFAULT_SYSTEM_PROMPT } from '../ModelManagement/ModelManager';
import { StorageKey } from '../../constants';
import './PromptList.css';

const PromptList: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  useEffect(() => {
    loadTemplates();
    // Load the current system prompt from localStorage
    const savedPrompt = localStorage.getItem(StorageKey.GLOBAL_SYSTEM_PROMPT);
    if (savedPrompt) {
      setSystemPrompt(savedPrompt);
    }
  }, []);

  const loadTemplates = async () => {
    const loadedTemplates = await PromptManager.getPromptTemplates();
    setTemplates(loadedTemplates);
  };

  const handleDeleteTemplate = async (id: string) => {
    await PromptManager.deletePromptTemplate(id);
    // Update state immediately by filtering out the deleted template
    setTemplates(templates.filter(template => template.id !== id));
  };

  const handleSaveSystemPrompt = () => {
    localStorage.setItem(StorageKey.GLOBAL_SYSTEM_PROMPT, systemPrompt.trim());
    setShowSystemPrompt(false);
  };

  return (
    <div className="prompt-list-container">
      {!showSystemPrompt && (
        <div className="prompt-list-header">
          <h1>Prompt Templates</h1>
          <div className="header-buttons">
            <button onClick={() => setShowSystemPrompt(!showSystemPrompt)} className="add-button">
              {showSystemPrompt ? 'Hide System Prompt' : 'Edit System Prompt'}
            </button>
            <button onClick={() => navigate('/prompts/new')} className="add-button">
              Add Template
            </button>
          </div>
        </div>
      )}
      <br/>

      {showSystemPrompt ? (
        <div className="system-prompt-section">
          <h2>System Prompt</h2>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter a system prompt to guide the model's behavior..."
            className="system-prompt-textarea"
            rows={8}
          />
          <div className="system-prompt-actions">
            <button onClick={() => setShowSystemPrompt(false)} className="cancel-button">
              Cancel
            </button>
            <button onClick={handleSaveSystemPrompt} className="save-button">
              Save System Prompt
            </button>
          </div>
        </div>
      ) : (
        <div className="templates-list">
          {templates.map((template) => (
            <div key={template.id} className="template-item">
              <div className="template-info">
                <h3>{template.title}</h3>
                <p>{template.content}</p>
              </div>
              <div className="template-actions">
                <button
                  onClick={() => navigate(`/prompts/edit/${template.id}`)}
                  className="edit-button"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="delete-button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="no-templates">
              No prompt templates yet. Click "Add Template" to create one.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PromptList; 