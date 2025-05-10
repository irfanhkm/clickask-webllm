import React, { useState } from 'react';
import './PromptGuidelines.css';

interface PromptGuidelinesProps {
  className?: string;
}

const PromptGuidelines: React.FC<PromptGuidelinesProps> = ({ className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`prompt-guidelines ${className}`}>
      <div 
        className="guidelines-header" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3>Prompt Writing Guidelines</h3>
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
      </div>
      
      {isExpanded && (
        <div className="guidelines-content">
          <p>
            Use these guidelines to create effective prompts for the AI assistant:
          </p>
          
          <h4>Using Placeholders</h4>
          <p>
            Placeholders allow you to specify where specific content should be inserted in your prompt.
            Use curly braces <code>{'{}'}</code> to create placeholders.
          </p>
          
          <div className="placeholder-examples">
            <div className="example">
              <h5>Example:</h5>
              <pre>Please review the following code: {'{code}'}</pre>
              <p>When used, the <code>{'{code}'}</code> will be replaced with the actual code you want to review.</p>
            </div>
          </div>
          
          <h4>Common Placeholders</h4>
          <ul>
            <li><code>{'{code}'}</code> - For inserting code snippets</li>
            <li><code>{'{error}'}</code> - For inserting error messages</li>
            <li><code>{'{task}'}</code> - For describing a task</li>
            <li><code>{'{language}'}</code> - For specifying a programming language</li>
            <li><code>{'{topic}'}</code> - For specifying a topic to learn about</li>
            <li><code>{'{content}'}</code> - For inserting any content to be processed</li>
          </ul>
          
          <h4>Creating Custom Placeholders</h4>
          <p>
            You can create your own custom placeholders by using any name inside curly braces.
            For example: <code>{'{customVariable}'}</code>
          </p>
          
          <div className="example">
            <h5>Example with multiple placeholders:</h5>
            <pre>Please help me with a {'{language}'} function that {'{task}'}. Here's my current code:\n\n{'{code}'}</pre>
            <p>This prompt uses three placeholders: <code>{'{language}'}</code>, <code>{'{task}'}</code>, and <code>{'{code}'}</code>.</p>
          </div>
          
          <h4>Tips for Effective Prompts</h4>
          <ul>
            <li>Be specific about what you want the AI to do</li>
            <li>Provide context when necessary</li>
            <li>Structure your prompt with clear sections</li>
            <li>Use numbered lists for multiple requests</li>
            <li>Specify the format you want the response in</li>
            <li>Use placeholders strategically to make your prompts reusable</li>
            <li>Keep your prompts concise but informative</li>
          </ul>
          
          <h4>Best Practices</h4>
          <ul>
            <li>Use descriptive placeholder names that indicate what content should be inserted</li>
            <li>Place placeholders in logical positions within your prompt</li>
            <li>Consider the order of placeholders to match the natural flow of the conversation</li>
            <li>Test your prompts with different content to ensure they work as expected</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default PromptGuidelines; 