'use client';
import { SocketProvider } from '@/context/SocketContext';

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return <SocketProvider>{children}</SocketProvider>;
}
