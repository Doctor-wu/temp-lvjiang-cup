import React from 'react';

const Hairline: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`v4-hair${className ? ` ${className}` : ''}`} aria-hidden="true" />
);

export default Hairline;
