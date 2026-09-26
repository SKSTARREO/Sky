const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

const app = express();
app.use(express.json());

// Cloudinary Configuration (Aapki details ke sath configured)
cloudinary.config({
    cloud_name: 'Kala1ga5',
    api_key: '964276561231151',
    api_secret: 'Odp6sSN7DjiyFHkPPslTNtYm9h8'
});

// Temporary storage for multer before uploading to Cloudinary
const uploadDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

// In-memory database for short links mapping
global.videoDB = global.videoDB || {};

// 1. Upload Endpoint (Directly uploads to Cloudinary)
app.post('/api/upload', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video uploaded!' });
        }

        // Upload file to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: 'video',
            folder: 'vercel_streamer'
        });

        // Delete temporary local file
        fs.unlinkSync(req.file.path);

        const videoId = uuidv4().slice(0, 8); // Short ID
        global.videoDB[videoId] = {
            secure_url: result.secure_url,
            public_id: result.public_id
        };

        const host = req.headers['x-forwarded-host'] || req.get('host');
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const shortLink = `${protocol}://${host}/watch/${videoId}`;

        res.json({ success: true, shortLink, videoId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Cloudinary upload failed!' });
    }
});

// 2. Watch Page Route (Streams video via Cloudinary URL)
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
