'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface User {
    _id: string;
    name: string;
    email: string;
    avatar: string;
}

interface AuthCtx {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const t = localStorage.getItem('sw_token');
        if (t) {
            setToken(t);
            api.get('/auth/me')
                .then((r) => setUser(r.data.user))
                .catch(() => { localStorage.removeItem('sw_token'); setToken(null); })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const r = await api.post('/auth/login', { email, password });
        localStorage.setItem('sw_token', r.data.token);
        setToken(r.data.token);
        setUser(r.data.user);
    }, []);

    const register = useCallback(async (name: string, email: string, password: string) => {
        const r = await api.post('/auth/register', { name, email, password });
        localStorage.setItem('sw_token', r.data.token);
        setToken(r.data.token);
        setUser(r.data.user);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('sw_token');
        setToken(null);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
