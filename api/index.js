require('dotenv').config();
   const express = require('express');
   const multer = require('multer');
   const cors = require('cors');
   const crypto = require('crypto');
   const dbPool = require('./db');
   const app = express();

   // Configure multer to store files in memory
   const upload = multer({
     storage: multer.memoryStorage(),
     limits: { fileSize: 5 * 1024 * 1024 },
     fileFilter: (req, file, cb) => {
       if (file.mimetype.startsWith('image/')) {
         cb(null, true);
       } else {
         cb(new Error('Only image files are allowed!'), false);
       }
     }
   });

   // CORS Configuration
   const allowedOrigins = [
     'http://localhost:5200',
     process.env.FRONTEND_URL
   ].filter(Boolean);

   app.use(cors({
     origin: (origin, callback) => {
       if (!origin) return callback(null, true);
       if (allowedOrigins.indexOf(origin) !== -1) {
         return callback(null, true);
       } else {
         const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
         return callback(new Error(msg), false);
       }
     },
     credentials: true
   }));

   app.use(express.json());

   // POST /api/upload
   app.post('/api/upload', upload.single('image'), async (req, res) => {
     try {
       if (!req.file) {
         return res.status(400).json({ success: false, message: 'No image file uploaded' });
       }
       const { originalname, mimetype, size, buffer } = req.file;
       const shareId = crypto.randomBytes(16).toString('hex');
       const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
       const query = `
         INSERT INTO images (share_id, original_name, mimetype, size, image_data, expiry_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id
       `;
       const values = [shareId, originalname, mimetype, size, buffer, expiryDate];
       const result = await dbPool.query(query, values);
       if (result.rows.length > 0) {
         res.json({ success: true, shareId });
       } else {
         res.status(500).json({ success: false, message: 'Failed to save image metadata' });
       }
     } catch (error) {
       console.error('Upload error:', error);
       res.status(500).json({ success: false, message: error.message || 'Upload failed' });
     }
   });

   // GET /share/:shareId
   app.get('/share/:shareId', async (req, res) => {
     try {
       const { shareId } = req.params;
       const query = `
         SELECT image_data, mimetype, expiry_date 
         FROM images 
         WHERE share_id = $1 AND expiry_date > NOW()
       `;
       const result = await dbPool.query(query, [shareId]);
       if (result.rows.length === 0) {
         return res.status(404).json({ success: false, message: 'Image not found or expired' });
       }
       const { image_data, mimetype } = result.rows[0];
       res.set('Content-Type', mimetype);
       res.set('Cache-Control', 'public, max-age=3600');
       res.send(image_data);
     } catch (error) {
       console.error('Share error:', error);
       res.status(500).json({ success: false, message: 'Server error' });
     }
   });

   // DELETE /api/delete/:shareId
   app.delete('/api/delete/:shareId', async (req, res) => {
     try {
       const { shareId } = req.params;
       const query = 'DELETE FROM images WHERE share_id = $1 RETURNING id';
       const result = await dbPool.query(query, [shareId]);
       if (result.rows.length > 0) {
         res.json({ success: true });
       } else {
         res.status(404).json({ success: false, message: 'Image not found' });
       }
     } catch (error) {
       console.error('Delete error:', error);
       res.status(500).json({ success: false, message: 'Delete failed' });
     }
   });

   // Health check
   app.get('/health', (req, res) => {
     res.json({ status: 'OK' });
   });

   // Error handling middleware
   app.use((err, req, res, next) => {
     console.error('Error:', err.message);
     res.status(500).json({ success: false, message: 'Internal server error' });
   });

   module.exports = app;