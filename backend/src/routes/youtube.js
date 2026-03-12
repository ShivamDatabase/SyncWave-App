const express = require('express');
const axios = require('axios');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/search', protect, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ message: 'Query required' });

        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
            return res.status(503).json({ message: 'YouTube API key not configured. Please add YOUTUBE_API_KEY to .env' });
        }

        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                part: 'snippet',
                q,
                type: 'video',
                maxResults: 10,
                key: apiKey,
            },
        });

        const results = response.data.items.map((item) => ({
            youtubeId: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url,
            channel: item.snippet.channelTitle,
        }));

        res.json({ results });
    } catch (err) {
        res.status(500).json({ message: err.response?.data?.error?.message || err.message });
    }
});

module.exports = router;
