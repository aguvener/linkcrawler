import React from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';

export interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ToastProps {
    toast: ToastMessage;
}

const Toast: React.FC<ToastProps> = ({ toast }) => {
    const icons = {
        success: <CheckCircle className="text-green-500" />,
        error: <XCircle className="text-red-500" />,
        info: <Info className="text-blue-500" />,
    };

    const colors = {
        success: 'border-green-500',
        error: 'border-red-500',
        info: 'border-blue-500',
    }

    return (
        <div
            className={`flex items-center space-x-3 bg-slate-800 border-l-4 ${colors[toast.type]} shadow-lg rounded-r-lg p-4 animate-fade-in`}
        >
            {icons[toast.type]}
            <p className="text-slate-200">{toast.message}</p>
        </div>
    );
};


interface ToastContainerProps {
    toasts: ToastMessage[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
    return (
        <div className="fixed top-24 right-4 z-50 space-y-3">
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} />
            ))}
        </div>
    );
};
