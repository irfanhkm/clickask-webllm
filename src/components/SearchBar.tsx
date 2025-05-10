import React from 'react';
import { Search } from 'lucide-react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder,
  className = ''
}) => {
  return (
    <div className={`${styles['search-container']} ${className}`} style={{marginRight: '10px'}}>
      <div className={styles['search-input-wrapper']}>
        <Search size={16} className={styles['search-icon']} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={styles['search-input']}
        />
      </div>
    </div>
  );
};

export default SearchBar; 