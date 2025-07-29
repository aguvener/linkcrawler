import React from 'react';

interface ProgressBarProps {
    current: number;
    total: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
    const percentage = Math.min(100, (current / total) * 100);

    return (
        <div className="w-full bg-slate-800 rounded-full h-5 relative overflow-hidden border border-slate-700">
            <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-bold text-white">
                <span>{current.toLocaleString()} messages</span>
                <span className="hidden sm:block">{percentage.toFixed(3)}%</span>
                <span>Goal: {total.toLocaleString()}</span>
            </div>
        </div>
    );
};
