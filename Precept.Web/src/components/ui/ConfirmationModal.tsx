import React from 'react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  danger = false
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center animate-fade-in-up">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      ></div>

      {/* Modal Content - Liquid Glass Effect */}
      <div className="relative w-full max-w-md mx-4 overflow-hidden rounded-3xl bg-dashboard-bg/40 backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_40px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.5)] flex flex-col transform transition-all animate-scale-up">
        {/* Decorative Top Glow */}
        <div className={`absolute top-0 left-0 w-full h-1 ${danger ? 'bg-gradient-to-r from-transparent via-[#f87171] to-transparent shadow-[0_0_15px_rgba(248,113,113,0.8)]' : 'bg-gradient-to-r from-transparent via-accent-teal to-transparent shadow-[0_0_15px_rgba(45,212,191,0.8)]'}`}></div>

        <div className="p-6 md:p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${danger ? 'bg-[#f87171]/10 text-[#f87171] border-[#f87171]/20 shadow-[inset_0_0_20px_rgba(248,113,113,0.1)]' : 'bg-accent-teal/10 text-accent-teal border-accent-teal/20 shadow-[inset_0_0_20px_rgba(45,212,191,0.1)]'}`}>
              <i className={`fa-solid ${danger ? 'fa-triangle-exclamation' : 'fa-circle-question'} text-2xl`}></i>
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">{title}</h2>
          </div>
          
          <p className="text-sm text-text-secondary leading-relaxed mb-8">
            {message}
          </p>

          <div className="flex gap-3 justify-end">
            <button 
              type="button" 
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-white border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
            >
              {cancelText}
            </button>
            <button 
              type="button" 
              onClick={() => {
                onConfirm();
              }}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                danger 
                  ? 'bg-[#f87171] text-black shadow-[0_0_15px_rgba(248,113,113,0.3)] hover:bg-[#f87171]/90' 
                  : 'bg-accent-teal text-dashboard-bg shadow-[0_0_15px_rgba(45,212,191,0.3)] hover:bg-accent-teal/90'
              }`}
            >
              <i className={`fa-solid ${danger ? 'fa-trash' : 'fa-check'} text-xs`}></i>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
