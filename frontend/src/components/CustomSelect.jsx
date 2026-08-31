import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  label = '',
  icon: Icon,
  className = '',
  size = 'md', // 'sm' or 'md'
  searchable = null, // auto-enabled if options > 5 unless specified
  isClearable = false,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus search input on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const formattedOptions = options.map((opt) => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt };
    }
    return opt;
  });

  const isSearchActive = searchable !== null ? searchable : formattedOptions.length > 5;

  const filteredOptions = formattedOptions.filter((opt) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      opt.label.toLowerCase().includes(term) ||
      (opt.desc && opt.desc.toLowerCase().includes(term)) ||
      String(opt.value).toLowerCase().includes(term)
    );
  });

  const selectedOption = formattedOptions.find((opt) => opt.value === value);

  const handleSelect = (optValue) => {
    onChange(optValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  const isSmall = size === 'sm';

  return (
    <div className={`relative ${isOpen ? 'z-[9999]' : 'z-20'} ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Select Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between ${
          isSmall ? 'px-3.5 py-2.5 text-xs sm:text-sm rounded-xl min-h-[42px]' : 'px-4 py-3 text-xs sm:text-sm rounded-2xl min-h-[46px]'
        } bg-slate-950/90 hover:bg-slate-900 border ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-slate-800'
            : isOpen 
            ? 'border-amber-400 ring-2 sm:ring-4 ring-amber-400/20 shadow-lg shadow-amber-500/15 bg-slate-900' 
            : 'border-slate-800 hover:border-slate-700 shadow-inner'
        } text-left text-white transition-all duration-200 group cursor-pointer select-none`}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
          {Icon && (
            <Icon className={`${isSmall ? 'w-4 h-4' : 'w-4 h-4'} shrink-0 transition-all duration-200 ${
              isOpen ? 'text-amber-400 scale-110' : 'text-slate-400 group-hover:text-amber-400'
            }`} />
          )}
          <span className={`truncate font-semibold text-xs sm:text-sm ${selectedOption ? 'text-white' : 'text-slate-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {isClearable && selectedOption && (
            <span
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`${isSmall ? 'w-4 h-4' : 'w-4 h-4'} text-slate-400 group-hover:text-white transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-amber-400' : ''
            }`}
          />
        </div>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute z-[9999] left-0 right-0 top-full mt-2 bg-slate-900/98 backdrop-blur-2xl border border-slate-700/90 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] max-h-72 flex flex-col overflow-hidden animate-spring-in">
          
          {/* Quick Search Input */}
          {isSearchActive && (
            <div className="p-2 border-b border-slate-800/80 bg-slate-950/60 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Filter options..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition shadow-inner"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 text-slate-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto divide-y divide-slate-800/40 py-1 scrollbar-thin scrollbar-thumb-slate-700">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-5 text-xs text-slate-500 text-center flex flex-col items-center gap-1">
                <span>No matching options found</span>
                {searchTerm && <span className="text-[10px] text-slate-600 font-mono">"{searchTerm}"</span>}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400/20 text-amber-300 font-bold border-l-4 border-amber-400 pl-3'
                        : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 mr-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-slate-100 text-xs sm:text-sm">{opt.label}</span>
                        {opt.badge !== undefined && (
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 shadow-sm'
                              : 'bg-slate-800 text-amber-400 border border-slate-700'
                          }`}>
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.desc && (
                        <span className="text-[11px] text-slate-400 truncate mt-0.5 font-normal leading-tight">
                          {opt.desc}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>

        </div>
      )}
    </div>
  );
}
