const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
app.use(express.json());

// In-memory database for short links mapping
global.videoDB = global.videoDB || {};

// Save link endpoint (Frontend direct upload ke baad URL yahan save hoga)
app.post('/api/save-link', (req, res) => {
    try {
        const { secure_url } = req.body;
        if (!secure_url) {
            return res.status(400).json({ error: 'No URL provided!' });
        }

        const videoId = uuidv4().slice(0, 8); // Short ID
        global.videoDB[videoId] = { secure_url };

        const host = req.headers['x-forwarded-host'] || req.get('host');
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const shortLink = `${protocol}://${host}/watch/${videoId}`;

        res.json({ success: true, shortLink, videoId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save link' });
    }
});

// Watch Page Route (Streams video via Cloudinary URL)
app.get('/watch/:id', (req, res) => {
    const videoId = req.params.id;
    const videoData = global.videoDB[videoId];

    if (!videoData) {
        return res.status(404).send('<!DOCTYPE html><html><body style="background:#0f172a;color:#fff;text-align:center;font-family:sans-serif;padding-top:40vh;"><h2>Video not found or link expired!</h2></body></html>');
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Watch Video - Streamer</title>
            <style>
                body { background: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .container { width: 90%; max-width: 800px; text-align: center; }
                video { width: 100%; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); background: #000; outline: none; }
                h2 { margin-bottom: 20px; font-weight: 400; color: #38bdf8; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Streaming Video</h2>
                <video controls autoplay playsinline>
                    <source src="${videoData.secure_url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
        </body>
        </html>
    `);
});

// Static frontend serve karne ke liye
app.use(express.static(path.join(__dirname, '../public')));

// Local testing ke liye
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
