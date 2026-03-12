'use client';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketCtx {
    socket: Socket | null;
    connected: boolean;
}

const SocketContext = createContext<SocketCtx>({ socket: null, connected: false });

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const { token } = useAuth();
    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!token) {
            socketRef.current?.disconnect();
            socketRef.current = null;
            setConnected(false);
            return;
        }

        const s = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
            auth: { token },
            transports: ['websocket'],
        });

        s.on('connect', () => setConnected(true));
        s.on('disconnect', () => setConnected(false));
        socketRef.current = s;

        return () => {
            s.disconnect();
            setConnected(false);
        };
    }, [token]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    return useContext(SocketContext);
}
