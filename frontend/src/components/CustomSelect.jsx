import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  label = '',
  icon: Icon,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formattedOptions = options.map((opt) => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt };
    }
    return opt;
  });

  const selectedOption = formattedOptions.find((opt) => opt.value === value);

  const handleSelect = (optValue) => {
    onChange(optValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Select Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-slate-950/80 hover:bg-slate-900/90 border ${
          isOpen 
            ? 'border-amber-400 ring-4 ring-amber-400/10 shadow-lg shadow-amber-500/10 scale-[1.01]' 
            : 'border-slate-800 hover:border-slate-700'
        } rounded-2xl text-xs sm:text-sm text-left text-white transition-all duration-300 shadow-inner group cursor-pointer`}
      >
        <div className="flex items-center gap-2.5 truncate">
          {Icon && (
            <Icon className={`w-4 h-4 shrink-0 transition-all duration-300 ${isOpen ? 'text-amber-400 scale-110' : 'text-slate-400 group-hover:text-amber-400'}`} />
          )}
          <span className={`truncate font-medium transition-colors duration-200 ${selectedOption ? 'text-white' : 'text-slate-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 group-hover:text-white shrink-0 ml-2 transition-transform duration-300 ${
            isOpen ? 'rotate-180 text-amber-400' : ''
          }`}
        />
      </button>

      {/* Smooth Popover Menu with Spring In Animation */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 py-1.5 bg-slate-900/95 backdrop-blur-2xl border border-slate-800/90 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] max-h-60 overflow-y-auto animate-spring-in">
          {formattedOptions.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-500 text-center">No options available</div>
          ) : (
            formattedOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs sm:text-sm text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 text-amber-400 font-bold border-l-3 border-amber-400 pl-3.5'
                      : 'text-slate-300 hover:bg-slate-800/90 hover:text-white hover:pl-5'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="truncate">{opt.label}</div>
                    {opt.desc && <div className="text-[10px] text-slate-400 font-normal mt-0.5">{opt.desc}</div>}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0 animate-spring-in" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
