import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface ThemedSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

const ThemedSelect: React.FC<ThemedSelectProps> = ({ value, onChange, options, ariaLabel, className, disabled }) => {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<number>(-1);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => options.find(o => o.value === value) || options[0], [options, value]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setOpen(true);
      setHighlighted(Math.max(0, options.findIndex(o => o.value === value)));
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(options.length - 1, (h === -1 ? 0 : h + 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(0, (h === -1 ? 0 : h - 1)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = options[highlighted];
      if (opt) {
        onChange(opt.value);
        setOpen(false);
      }
    }
  };

  return (
    <div ref={wrapRef} className={`select-control ${open ? 'open' : ''} ${className || ''}`.trim()}>
      <button
        type="button"
        className="select-display"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={onKeyDown}
        disabled={disabled}
      >
        <span className="select-display-text">{selected?.label}</span>
        <svg className="select-caret" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <ul className="select-menu" role="listbox">
          {options.map((opt, idx) => {
            const selected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={selected}
                className={`select-option ${selected ? 'selected' : ''} ${idx === highlighted ? 'highlighted' : ''}`.trim()}
                onMouseEnter={() => setHighlighted(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                <span className="option-label">{opt.label}</span>
                {selected && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ThemedSelect;
