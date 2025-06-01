import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PromptManager, PromptTemplate } from './PromptManager';
import ModelManager, { DEFAULT_SYSTEM_PROMPT } from '../ModelManagement/ModelManager';
import { StorageKey } from '../../constants';
import { Edit, Trash2, Plus, Info } from 'lucide-react';
import SearchBar from '../../components/SearchBar';
import './PromptList.css';
import browser from 'webextension-polyfill';

const PromptList: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [systemPromptSaved, setSystemPromptSaved] = useState(false);

  useEffect(() => {
    loadTemplates();
    // Load the current system prompt from storage
    const loadSystemPrompt = async () => {
      const systemprompt = await ModelManager.getSystemPrompt();
      if (systemprompt) {
        setSystemPrompt(systemprompt);
      }
    };
    loadSystemPrompt();
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

  const handleSaveSystemPrompt = async () => {
    try {
      await browser.storage.local.set({ [StorageKey.GLOBAL_SYSTEM_PROMPT]: systemPrompt.trim() });
      setSystemPromptSaved(true);
      setTimeout(() => setSystemPromptSaved(false), 2000);
    } catch (error) {
      console.error('Error saving system prompt:', error);
    }
  };

  const filteredTemplates = templates.filter(template => 
    template.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    template.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="prompt-list-container">
      {!showSystemPrompt && (
        <div className="prompt-list-header">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search templates..."
          />
          <div className="header-buttons">
            <button onClick={() => setShowSystemPrompt(!showSystemPrompt)} className="action-button">
              <Info size={16} />
              <span>System Prompt</span>
            </button>
            <button onClick={() => navigate('/prompts/new')} className="add-button">
              <Plus size={16} />
              <span>Add Template</span>
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
          {filteredTemplates.map((template) => (
            <div key={template.id} className="template-card">
              <div className="template-card-content">
                <div className="template-card-header">
                  <div className="template-card-title">
                    <h3>{template.title}</h3>
                  </div>
                  <div className="template-card-actions">
                    <button
                      onClick={() => navigate(`/prompts/edit/${template.id}`)}
                      className="action-button"
                    >
                      <Edit size={16} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="action-button danger"
                    >
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
                <div className="template-card-info">
                  <div className="template-description">
                    <p style={{ whiteSpace: 'pre-wrap' }}>{template.content}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredTemplates.length === 0 && (
            <div className="no-templates">
              {templates.length === 0 
                ? "No prompt templates yet. Click 'Add Template' to create one."
                : "No templates match your search criteria."}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PromptList; 