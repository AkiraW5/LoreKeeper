import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-dark-100 mb-2">{title}</h3>
          <p className="text-sm text-dark-300 mb-6">{message}</p>
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="btn-secondary text-sm">
              Cancelar
            </button>
            <button onClick={onConfirm} className="btn-danger text-sm">
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
