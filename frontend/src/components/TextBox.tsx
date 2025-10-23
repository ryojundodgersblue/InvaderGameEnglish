import React from 'react';
import './TextBox.css'; // 専用CSS

type Props = {
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'password';
  placeholder?: string;
};

const TextBox: React.FC<Props> = React.memo(
  ({ value, onChange, type = 'text', placeholder }) => (
    <input
      className="textbox"
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
    />
  )
);

export default TextBox;
