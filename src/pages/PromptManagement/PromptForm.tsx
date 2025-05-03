import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PromptManager, PromptTemplate } from './PromptManager';
import './PromptForm.css';

const PromptForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadTemplate = async () => {
      if (id) {
        setIsLoading(true);
        const templates = await PromptManager.getPromptTemplates();
        const template = templates.find(t => t.id === id);
        if (template) {
          setTitle(template.title);
          setContent(template.content);
        }
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [id]);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;

    if (id) {
      // Edit mode
      await PromptManager.addPromptTemplate(title, content);
      await PromptManager.deletePromptTemplate(id);
    } else {
      // Create mode
      await PromptManager.addPromptTemplate(title, content);
    }

    navigate('/prompts');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="prompt-form-container">
      <div className="prompt-form-header">
        <button onClick={() => navigate('/prompts')} className="back-button">
          Back
        </button>
        <h1>{id ? 'Edit Prompt Template' : 'New Prompt Template'}</h1>
      </div>

      <div className="prompt-form">
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter template title"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter template content"
            className="form-textarea"
          />
        </div>

        <div className="form-buttons">
          <button onClick={() => navigate('/prompts')} className="cancel-button">
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className="save-button"
            disabled={!title.trim() || !content.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptForm; 