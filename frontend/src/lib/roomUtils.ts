
export const getActiveRoomCode = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('active_room_code');
};

export const setActiveRoomCode = (code: string | null) => {
    if (typeof window === 'undefined') return;
    if (code) {
        localStorage.setItem('active_room_code', code);
    } else {
        localStorage.removeItem('active_room_code');
    }
};

export const isVoiceJoined = (roomCode: string) => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(`voice_joined_${roomCode}`) === 'true';
};

export const setVoiceJoined = (roomCode: string, joined: boolean) => {
    if (typeof window === 'undefined') return;
    if (joined) {
        sessionStorage.setItem(`voice_joined_${roomCode}`, 'true');
    } else {
        sessionStorage.removeItem(`voice_joined_${roomCode}`);
    }
};
