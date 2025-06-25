import React from 'react';
import './Button.css'; // 必要なら専用CSS

type Props = {
  onClick: () => void;
  children: React.ReactNode;
};

const Button: React.FC<Props> = React.memo(({ onClick, children }) => (
  <button className="btn" onClick={onClick}>
    {children}
  </button>
));

export default Button;
