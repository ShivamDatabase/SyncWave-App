'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { toast } from '@/components/ui/Toaster';

interface AdminUser {
    _id: string;
    name: string;
    email: string;
    role: 'admin' | 'moderator' | 'user';
    isBanned: boolean;
    createdAt: string;
}

interface AdminRoom {
    _id: string;
    name: string;
    code: string;
    admin: { name: string; email: string };
    users: any[];
    playlist: any[];
    createdAt: string;
}

export default function AdminDashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [rooms, setRooms] = useState<AdminRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'users' | 'rooms'>('users');

    useEffect(() => {
        if (authLoading) return;
        if (!user || user.role !== 'admin') {
            toast('Access denied. Admins only.', 'error');
            router.push('/');
            return;
        }
        
        Promise.all([
            api.get('/admin/users'),
            api.get('/admin/rooms')
        ]).then(([usersRes, roomsRes]) => {
            setUsers(usersRes.data.users);
            setRooms(roomsRes.data.rooms);
            setLoading(false);
        }).catch(err => {
            toast(err.response?.data?.message || 'Error loading dashboard', 'error');
            setLoading(false);
        });
    }, [user, authLoading, router]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            const res = await api.put(`/admin/users/${userId}`, { role: newRole });
            setUsers(users.map(u => u._id === userId ? { ...u, role: res.data.user.role } : u));
            toast('Role updated completely', 'success');
        } catch (err: any) {
            toast(err.response?.data?.message || 'Update failed', 'error');
        }
    };

    const handleBanToggle = async (userId: string, currentBanStatus: boolean) => {
        try {
            const res = await api.put(`/admin/users/${userId}`, { isBanned: !currentBanStatus });
            setUsers(users.map(u => u._id === userId ? { ...u, isBanned: res.data.user.isBanned } : u));
            toast(`User ${!currentBanStatus ? 'banned' : 'unbanned'} successfully`, 'success');
        } catch (err: any) {
            toast(err.response?.data?.message || 'Update failed', 'error');
        }
    };

    const handleDeleteRoom = async (roomId: string) => {
        if (!window.confirm('Are you sure you want to delete this room completely?')) return;
        try {
            await api.delete(`/admin/rooms/${roomId}`);
            setRooms(rooms.filter(r => r._id !== roomId));
            toast('Room deleted', 'success');
        } catch (err: any) {
            toast(err.response?.data?.message || 'Delete failed', 'error');
        }
    };

    if (authLoading || loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading Dashboard...</div>;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: 1000 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        <button className="btn-ghost" onClick={() => router.push('/')}>← Back</button>
                        <h1 style={{ margin: 0, fontSize: 28 }}>Admin Dashboard</h1>
                    </div>
                    <span className="tag" style={{ background: 'var(--accent)', color: '#fff' }}>Super Admin</span>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
                    <button 
                        onClick={() => setActiveTab('users')}
                        style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === 'users' ? 'var(--accent)' : 'transparent'}`, color: activeTab === 'users' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                    >
                        Users ({users.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('rooms')}
                        style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === 'rooms' ? 'var(--accent)' : 'transparent'}`, color: activeTab === 'rooms' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                    >
                        Active Rooms ({rooms.length})
                    </button>
                </div>

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: 13 }}>
                                    <th style={{ padding: '12px 16px' }}>Name</th>
                                    <th style={{ padding: '12px 16px' }}>Email</th>
                                    <th style={{ padding: '12px 16px' }}>Joined</th>
                                    <th style={{ padding: '12px 16px' }}>Role</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u._id} style={{ borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                                            {u.name} {user?._id === u._id && '(You)'}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{u.email}</td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <select 
                                                value={u.role} 
                                                onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                                disabled={user?._id === u._id}
                                                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: '#fff', padding: '4px 8px', borderRadius: 4, outline: 'none' }}
                                            >
                                                <option value="user">User</option>
                                                <option value="moderator">Moderator</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            <button 
                                                onClick={() => handleBanToggle(u._id, u.isBanned)}
                                                disabled={user?._id === u._id}
                                                style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: user?._id === u._id ? 'not-allowed' : 'pointer', background: u.isBanned ? 'var(--bg-hover)' : 'rgba(239, 68, 68, 0.1)', color: u.isBanned ? 'var(--text-muted)' : 'var(--danger)' }}
                                            >
                                                {u.isBanned ? 'PARDON' : 'BAN'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Rooms Tab */}
                {activeTab === 'rooms' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {rooms.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No active rooms</p> : null}
                        {rooms.map(room => (
                            <div key={room._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{room.name}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                        Code: <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{room.code}</span>
                                        {' • '} Admin: {room.admin?.name || 'Unknown'}
                                        {' • '} {room.users.length} connected
                                        {' • '} {room.playlist.length} songs
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button className="btn btn-secondary" onClick={() => router.push(`/room/${room.code}`)}>Join</button>
                                    <button 
                                        onClick={() => handleDeleteRoom(room._id)}
                                        style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', cursor: 'pointer' }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
