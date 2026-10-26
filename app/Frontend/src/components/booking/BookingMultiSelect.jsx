import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export default function BookingMultiSelect({ label, accessibleLabel, options, values, onChange, disabled = false, allLabel = "Tất cả", hint, hideLabel = false }) {
  const panelId = useId();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.filter((item) => values.includes(item.value));
  const isAll = !selected.length || selected.length === options.length;
  const summary = isAll ? allLabel : selected.length === 1 ? selected[0].label : `${selected.length} đã chọn`;
  const groups = [...new Set(options.map((item) => item.group).filter(Boolean))];

  useEffect(() => {
    if (!isOpen) return;
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
    };
  }, [isOpen]);

  const toggle = (value) => {
    const next = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
    onChange(next);
  };
  const renderOption = (item) => <label key={item.value} className="staff-lookup-filter-option">
    <input type="checkbox" checked={values.includes(item.value)} onChange={() => toggle(item.value)}
      aria-label={item.group ? `${item.label} — ${item.group}` : item.label} /><span>{item.label}</span>
  </label>;

  return <div className="staff-lookup-filter" ref={rootRef} onKeyDown={(event) => {
    if (event.key === "Escape" && isOpen) {
      event.preventDefault(); event.stopPropagation(); setIsOpen(false); buttonRef.current.focus();
    }
  }}>
    <button type="button" ref={buttonRef} className="staff-lookup-filter-trigger" aria-label={accessibleLabel}
      aria-expanded={isOpen} aria-controls={isOpen ? panelId : undefined}
      disabled={disabled} title={disabled ? hint : `${label}: ${selected.length ? selected.map((item) => item.group ? `${item.label} (${item.group})` : item.label).join(", ") : allLabel}`}
      onClick={() => setIsOpen((previous) => !previous)}>
      <span>{!hideLabel && `${label}: `}{summary}</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    {isOpen && <div id={panelId} className="staff-lookup-filter-options" role="group" aria-label={`Chọn nhiều ${label.toLocaleLowerCase("vi-VN")}`}>
      <button type="button" className="staff-lookup-filter-all" onClick={() => onChange([])}>
        Tất cả{isAll && <Check size={16} aria-hidden="true" />}
      </button>
      <div className="staff-lookup-filter-option-list">{groups.length ? groups.map((group) =>
        <fieldset key={group} className="staff-lookup-filter-group"><legend>{group}</legend>{options.filter((item) => item.group === group).map(renderOption)}</fieldset>)
        : options.map(renderOption)}</div>
      {hint && <p className="staff-lookup-filter-hint">{hint}</p>}
    </div>}
  </div>;
}

