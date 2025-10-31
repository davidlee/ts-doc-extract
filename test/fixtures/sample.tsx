// Sample TSX/React file for testing

import React from 'react';

/**
 * Button component props
 */
export interface ButtonProps {
  /** Button label text */
  label: string;

  /** Click handler */
  onClick: () => void;

  /** Optional variant */
  variant?: 'primary' | 'secondary';
}

/**
 * A reusable button component
 * @param props - Component props
 * @returns Button element
 */
export function Button({ label, onClick, variant = 'primary' }: ButtonProps): JSX.Element {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {label}
    </button>
  );
}

// Internal helper component
function InternalIcon(): JSX.Element {
  return <span>→</span>;
}
