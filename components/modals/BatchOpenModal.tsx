import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { FaCheck, FaTimes, FaArrowUp, FaArrowDown } from 'react-icons/fa';

interface BatchOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (count: number, fromTop: boolean, openAll: boolean) => void;
  totalLinks: number;
}

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; }> = ({ checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-emerald-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
    </label>
);

const SegmentedControl: React.FC<{ value: string; onChange: (value: string) => void; options: {label: string, value: string, icon: React.ReactNode}[] }> = ({ value, onChange, options }) => (
    <div className="flex w-full bg-slate-800 rounded-2xl p-1 space-x-1">
        {options.map(option => (
            <button
                key={option.value}
                onClick={() => onChange(option.value)}
                className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-2xl transition-all duration-200 focus:outline-none ${value === option.value ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:bg-slate-700'}`}>
                {option.icon}
                <span className="ml-2">{option.label}</span>
            </button>
        ))}
    </div>
);

export const BatchOpenModal: React.FC<BatchOpenModalProps> = ({ isOpen, onClose, onConfirm, totalLinks }) => {
  const [count, setCount] = useState<string>('10');
  const [from, setFrom] = useState<'top' | 'bottom'>('top');
  const [openAll, setOpenAll] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setCount('10');
      setFrom('top');
      setOpenAll(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    const num = parseInt(count, 10);
    if (!openAll && (isNaN(num) || num <= 0)) {
      alert('Please enter a valid number.');
      return;
    }
    onConfirm(openAll ? totalLinks : num, from === 'top', openAll);
    onClose();
  };

  const fromOptions = [
      { label: 'From Top', value: 'top', icon: <FaArrowUp/> },
      { label: 'From Bottom', value: 'bottom', icon: <FaArrowDown/> }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Batch Open Settings">
      <div className="p-4 sm:p-6 bg-slate-800 rounded-2xl">
        <div className="space-y-6 text-slate-300">
          
          <div className="flex items-center justify-between bg-slate-700/50 p-4 rounded-2xl transition-all duration-300">
            <label htmlFor="openAll" className="font-medium text-slate-100 text-lg">
              Open All Links
              <p className="text-xs text-slate-400 mt-1">Overrides all other settings.</p>
            </label>
            <ToggleSwitch checked={openAll} onChange={setOpenAll} />
          </div>

          <div className={`transition-opacity duration-300 ${openAll ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <fieldset disabled={openAll} className="space-y-5">
              <div className="border-t border-slate-700 my-4"></div>

              <div>
                <label htmlFor="linkCount" className="block text-sm font-medium text-slate-300 mb-2">
                  Number of links to open
                </label>
                <input
                  type="number"
                  id="linkCount"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  placeholder={`Max: ${totalLinks}`}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200 shadow-inner"
                />
              </div>

              <div>
                <span className="block text-sm font-medium text-slate-300 mb-2">Direction</span>
                <SegmentedControl value={from} onChange={(val) => setFrom(val as 'top' | 'bottom')} options={fromOptions} />
              </div>
            </fieldset>
          </div>

          <div className="flex justify-end space-x-4 pt-5">
            <button
              onClick={onClose}
              className="flex items-center justify-center px-5 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-2xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <FaTimes className="mr-2" />
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center justify-center px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-lg shadow-emerald-700/30"
            >
              <FaCheck className="mr-2" />
              Confirm & Open
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
