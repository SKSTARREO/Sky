const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

// Cloudinary Configuration (Sahi cloud name 'kaia1ga5' ke sath)
cloudinary.config({
    cloud_name: 'kaia1ga5',
    api_key: '964276561231151',
    api_secret: 'Odp6sSN7DjiyFHkPPslTNtYm9h8'
});

const uploadDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

export const config = {
    api: {
        bodyParser: false,
    },
};

const runMiddleware = (req, res, fn) => {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) return reject(result);
            return resolve(result);
        });
    });
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await runMiddleware(req, res, upload.single('video'));

        if (!req.file) {
            return res.status(400).json({ error: 'No video uploaded!' });
        }

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: 'video',
            folder: 'vercel_streamer'
        });

        // Clean up temp file
        fs.unlinkSync(req.file.path);

        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        
        // Direct Cloudinary secure URL ya watch player link generate karein
        const streamLink = result.secure_url;

        res.status(200).json({ 
            success: true, 
            shortLink: streamLink 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Upload failed' });
    }
}
