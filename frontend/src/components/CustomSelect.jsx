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
    <div className={`relative ${isOpen ? 'z-50' : 'z-20'} ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Select Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-950/80 hover:bg-slate-900 border ${
          isOpen 
            ? 'border-amber-400 ring-2 sm:ring-4 ring-amber-400/15 shadow-lg shadow-amber-500/10' 
            : 'border-slate-800 hover:border-slate-700'
        } rounded-2xl text-xs sm:text-sm text-left text-white transition-all duration-200 shadow-inner group cursor-pointer`}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0">
          {Icon && (
            <Icon className={`w-4 h-4 shrink-0 transition-all duration-200 ${isOpen ? 'text-amber-400 scale-110' : 'text-slate-400 group-hover:text-amber-400'}`} />
          )}
          <span className={`truncate font-medium ${selectedOption ? 'text-white' : 'text-slate-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 group-hover:text-white shrink-0 ml-2 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-amber-400' : ''
          }`}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute z-[100] left-0 right-0 top-full mt-1.5 py-1.5 bg-slate-900/98 backdrop-blur-2xl border border-slate-700/90 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-h-64 overflow-y-auto animate-spring-in divide-y divide-slate-800/40">
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm text-left transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400/15 text-amber-300 font-bold border-l-2 border-amber-400'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col min-w-0 mr-2">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{opt.label}</span>
                      {opt.badge !== undefined && (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.desc && (
                      <span className="text-[10px] text-slate-400 truncate mt-0.5 font-normal">
                        {opt.desc}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
