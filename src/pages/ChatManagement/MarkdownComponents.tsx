import React from 'react';
import type { Components } from 'react-markdown';
import { Copy } from 'lucide-react';

interface MarkdownComponentsProps {
  onCopyCode?: (content: string) => void;
}

export const createMarkdownComponents = ({ onCopyCode }: MarkdownComponentsProps): Components => ({
  code: ({ node, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const isInline = !className?.includes('language-');
    
    return !isInline && match ? (
      <div className="code-block">
        <div className="code-header">
          <span className="language-tag">{match[1]}</span>
          {onCopyCode && (
            <button 
              className="copy-button"
              onClick={() => onCopyCode(String(children))}
            >
              <Copy size={14} />
            </button>
          )}
        </div>
        <code className={className} {...props}>
          {children}
        </code>
      </div>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  // Add more markdown components here as needed
}); 