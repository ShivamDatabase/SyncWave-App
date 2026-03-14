'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface UseVoiceChatOptions {
  socket: Socket | null;
  roomCode: string;
  userId: string;
  users: Array<{ _id: string; socketId: string; name: string }>;
}

export function useVoiceChat({ socket, roomCode, userId, users }: UseVoiceChatOptions) {
  const [isMuted, setIsMuted] = useState(true); // start muted
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const [micError, setMicError] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserTimer = useRef<NodeJS.Timeout | null>(null);

  const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

  const stopSpeakingDetection = useCallback(() => {
    if (analyserTimer.current) clearInterval(analyserTimer.current);
  }, []);

  const startSpeakingDetection = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);

      analyserTimer.current = setInterval(() => {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        const speaking = avg > 15;
        socket?.emit('voice:speaking', { roomCode, isSpeaking: speaking });
        setSpeakingUsers(prev => {
          const next = new Set(prev);
          if (speaking) next.add(userId);
          else next.delete(userId);
          return next;
        });
      }, 200);
    } catch { /* AudioContext may not be available */ }
  }, [socket, roomCode, userId]);

  const createPeer = useCallback((targetSocketId: string, initiator: boolean) => {
    if (peersRef.current.has(targetSocketId)) return peersRef.current.get(targetSocketId)!;

    const pc = new RTCPeerConnection({ iceServers });

    // Add local stream tracks
    streamRef.current?.getTracks().forEach(t => pc.addTrack(t, streamRef.current!));

    pc.onicecandidate = (e) => {
      if (e.candidate) socket?.emit('voice:ice-candidate', { targetSocketId, candidate: e.candidate });
    };

    pc.ontrack = (e) => {
      const audio = new Audio();
      audio.srcObject = e.streams[0];
      audio.play().catch(() => {});
    };

    if (initiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socket?.emit('voice:offer', { roomCode, targetSocketId, offer });
      });
    }

    peersRef.current.set(targetSocketId, pc);
    return pc;
  }, [socket, roomCode]);

  const startVoice = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      stream.getAudioTracks().forEach(t => t.enabled = !isMuted);
      startSpeakingDetection(stream);

      // Connect to all existing users
      users.forEach(u => {
        if (u._id !== userId && u.socketId) createPeer(u.socketId, true);
      });
      
      setIsJoined(true);
      sessionStorage.setItem(`voice_joined_${roomCode}`, 'true');
    } catch (e: any) {
      setMicError(e.message || 'Microphone access denied');
    }
  }, [users, userId, isMuted, startSpeakingDetection, createPeer, roomCode]);

  // Auto-reconnect on mount if they were in voice before refresh
  useEffect(() => {
    if (socket && sessionStorage.getItem(`voice_joined_${roomCode}`) === 'true') {
      startVoice();
    }
  }, [socket, roomCode, startVoice]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      streamRef.current?.getAudioTracks().forEach(t => t.enabled = !next);
      return next;
    });
  }, []);

  // Socket voice events
  useEffect(() => {
    if (!socket) return;

    socket.on('voice:offer', async ({ fromSocketId, offer }) => {
      const pc = createPeer(fromSocketId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('voice:answer', { targetSocketId: fromSocketId, answer });
    });

    socket.on('voice:answer', async ({ fromSocketId, answer }) => {
      const pc = peersRef.current.get(fromSocketId);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('voice:ice-candidate', async ({ fromSocketId, candidate }) => {
      const pc = peersRef.current.get(fromSocketId);
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on('voice:speaking', ({ userId: uid, isSpeaking }: { userId: string; isSpeaking: boolean }) => {
      setSpeakingUsers(prev => {
        const next = new Set(prev);
        if (isSpeaking) next.add(uid);
        else next.delete(uid);
        return next;
      });
    });

    socket.on('voice:peer-disconnected', ({ socketId }: { socketId: string }) => {
      const pc = peersRef.current.get(socketId);
      if (pc) { pc.close(); peersRef.current.delete(socketId); }
    });

    return () => {
      socket.off('voice:offer');
      socket.off('voice:answer');
      socket.off('voice:ice-candidate');
      socket.off('voice:speaking');
      socket.off('voice:peer-disconnected');
    };
  }, [socket, createPeer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeakingDetection();
      streamRef.current?.getTracks().forEach(t => t.stop());
      peersRef.current.forEach(pc => pc.close());
      audioCtxRef.current?.close();
    };
  }, [stopSpeakingDetection]);

  return { isMuted, toggleMute, speakingUsers, micError, startVoice, isJoined };
}
