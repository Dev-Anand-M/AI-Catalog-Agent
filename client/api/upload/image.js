import { getUserIdFromRequest } from '../_lib/auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { image } = req.body;
    if (!image || !image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image data' });
    }

    // Convert base64 to buffer
    const base64Data = image.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${userId}-${timestamp}.jpg`;

    // Upload to Supabase Storage
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/product-images/${filename}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'image/jpeg'
        },
        body: buffer
      }
    );

    if (!uploadRes.ok) {
      const error = await uploadRes.text();
      console.error('Supabase upload error:', error);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    // Return public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/${filename}`;
    res.json({ url: publicUrl });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}
