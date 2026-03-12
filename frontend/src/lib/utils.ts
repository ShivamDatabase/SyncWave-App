export function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
        /youtube\.com\/v\/([^&?/]+)/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

export function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function generateAvatar(name: string): string {
    const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    const colors = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed'];
    const color = colors[name.charCodeAt(0) % colors.length];
    return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><rect width='40' height='40' rx='20' fill='${encodeURIComponent(color)}'/><text x='20' y='26' font-family='Inter,sans-serif' font-size='14' font-weight='700' fill='white' text-anchor='middle'>${initials}</text></svg>`;
}
