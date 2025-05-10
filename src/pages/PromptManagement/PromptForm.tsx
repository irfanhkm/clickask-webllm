import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PromptManager, PromptTemplate } from './PromptManager';
import PromptGuidelines from './PromptGuidelines';
import './PromptForm.css';

const PromptForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [existingTemplates, setExistingTemplates] = useState<PromptTemplate[]>([]);

  useEffect(() => {
    const loadTemplate = async () => {
      setIsLoading(true);
      // Load all templates to check for uniqueness
      const templates = await PromptManager.getPromptTemplates();
      setExistingTemplates(templates);
      
      if (id) {
        const template = templates.find(t => t.id === id);
        if (template) {
          setTitle(template.title);
          setContent(template.content);
        }
      }
      setIsLoading(false);
    };

    loadTemplate();
  }, [id]);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    
    // Validate that the prompt contains at least one placeholder in the format {placeholder}
    const placeholderRegex = /\{[^}]+\}/;
    if (!placeholderRegex.test(content)) {
      setValidationError('Prompt template must contain at least one placeholder in the format {placeholder}');
      return;
    }
    
    // Validate that the title is unique (excluding the current template if editing)
    const trimmedTitle = title.trim();
    const isDuplicate = existingTemplates.some(template => 
      template.title.toLowerCase() === trimmedTitle.toLowerCase() && 
      template.id !== id
    );
    
    if (isDuplicate) {
      setValidationError('A template with this title already exists. Please use a different title.');
      return;
    }
    
    setValidationError('');

    if (id) {
      // Edit mode
      await PromptManager.savePromptTemplate({ id, title: trimmedTitle, content });
      await PromptManager.deletePromptTemplate(id);
    } else {
      // Create mode
      await PromptManager.savePromptTemplate({ id: Date.now().toString(), title: trimmedTitle, content });
    }

    navigate('/prompts');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="prompt-form-container">
      <div className="prompt-form">
        <PromptGuidelines />
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setValidationError('');
            }}
            placeholder="Enter template title"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setValidationError('');
            }}
            placeholder="Enter template content with at least one {placeholder}"
            className="form-textarea"
          />
          {validationError && <div className="validation-error">{validationError}</div>}
          <div className="helper-text">
            <span>Tip: Use placeholders like {'{code}'}, {'{error}'}, {'{task}'} to make your prompts reusable.</span>
          </div>
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