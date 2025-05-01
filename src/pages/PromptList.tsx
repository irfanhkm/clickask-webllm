import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PromptManager, PromptTemplate } from '../services/PromptManager';
import './PromptList.css';

const PromptList: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const loadedTemplates = await PromptManager.getPromptTemplates();
    setTemplates(loadedTemplates);
  };

  const handleDeleteTemplate = async (id: string) => {
    await PromptManager.deletePromptTemplate(id);
    loadTemplates();
  };

  return (
    <div className="prompt-list-container">
      <div className="prompt-list-header">
        <button onClick={() => navigate('/chats')} className="back-button">
          Back
        </button>
        <h1>Prompt Templates</h1>
        <button onClick={() => navigate('/prompts/new')} className="add-button">
          Add Template
        </button>
      </div>

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
    </div>
  );
};

export default PromptList; 