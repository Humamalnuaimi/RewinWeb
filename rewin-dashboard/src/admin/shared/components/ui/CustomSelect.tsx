import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string, option?: SelectOption | undefined) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, placeholder = 'Select…', disabled }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => options.find(o => o.value === value), [options, value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const handleChoose = (opt: SelectOption) => {
    onChange(opt.value, opt);
    setOpen(false);
  };

  return (
    <div className={`select-wrap ${disabled ? 'is-disabled' : ''}`}>
      <button ref={btnRef} type="button" className="select-display" onClick={() => !disabled && setOpen(v => !v)} aria-haspopup="listbox" aria-expanded={open}>
        <div className="select-text">
          <div className="select-label">{selected?.label || placeholder}</div>
          {selected?.subLabel && <div className="select-sublabel">{selected.subLabel}</div>}
        </div>
        <span className={`caret ${open ? 'up' : 'down'}`} aria-hidden>▾</span>
      </button>
      {open && (
        <div ref={menuRef} className="select-menu" role="listbox" tabIndex={-1}>
          {options.length === 0 && (
            <div className="select-empty">No options</div>
          )}
          {options.map(opt => (
            <button key={opt.value} className={`option ${opt.value === value ? 'active' : ''}`} role="option" aria-selected={opt.value === value} onClick={() => handleChoose(opt)}>
              <div className="opt-label">{opt.label}</div>
              {opt.subLabel && <div className="opt-sublabel">{opt.subLabel}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
