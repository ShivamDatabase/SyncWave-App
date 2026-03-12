'use client';
import { useState, useEffect, useCallback } from 'react';
import styles from './Toaster.module.css';

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

const listeners: Array<(t: Toast) => void> = [];
let nextId = 0;

export function toast(message: string, type: Toast['type'] = 'info') {
    const t: Toast = { id: nextId++, message, type };
    listeners.forEach((l) => l(t));
}

export function Toaster() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        const handler = (t: Toast) => {
            setToasts((prev) => [...prev, t]);
            setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3500);
        };
        listeners.push(handler);
        return () => { const i = listeners.indexOf(handler); if (i > -1) listeners.splice(i, 1); };
    }, []);

    return (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {toasts.map((t) => (
                <div key={t.id} className="fade-in" style={{
                    background: t.type === 'error' ? 'var(--danger)' : t.type === 'success' ? 'var(--green)' : 'var(--bg-card)',
                    color: '#fff',
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow)',
                    fontSize: 13,
                    fontWeight: 500,
                    minWidth: 220,
                    border: '1px solid var(--border)',
                }}>
                    {t.message}
                </div>
            ))}
        </div>
    );
}
