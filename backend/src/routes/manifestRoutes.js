import express from 'express';
import Manifest from '../models/Manifest.js';

const router = express.Router();

/**
 * GET /api/manifests
 * List all manifests (summary view)
 */
router.get('/', async (req, res) => {
  try {
    const manifests = await Manifest.find()
      .select('id version compiled_at config')
      .sort({ compiled_at: -1 });
    res.json(manifests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/manifests/:id
 * Get a single manifest with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const manifest = await Manifest.findOne({ id: req.params.id });
    if (!manifest) {
      return res.status(404).json({ error: 'Manifest not found' });
    }
    res.json(manifest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/manifests/region/:region
 * Get active manifest for a region
 */
router.get('/region/:region', async (req, res) => {
  try {
    const manifest = await Manifest.findOne({ 
      'config.region': { $regex: new RegExp(req.params.region, 'i') }
    }).sort({ compiled_at: -1 });
    
    if (!manifest) {
      return res.status(404).json({ error: 'No manifest found for region' });
    }
    res.json(manifest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/manifests
 * Create or update a manifest (upsert by id)
 */
router.post('/', async (req, res) => {
  try {
    const manifestData = req.body;
    
    if (!manifestData.id) {
      return res.status(400).json({ error: 'Manifest id is required' });
    }

    // Convert compiled_at string to Date if needed
    if (typeof manifestData.compiled_at === 'string') {
      manifestData.compiled_at = new Date(manifestData.compiled_at);
    }

    // Upsert: update if exists, create if not
    const manifest = await Manifest.findOneAndUpdate(
      { id: manifestData.id },
      manifestData,
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json(manifest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/manifests/:id
 * Delete a manifest
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await Manifest.findOneAndDelete({ id: req.params.id });
    if (!result) {
      return res.status(404).json({ error: 'Manifest not found' });
    }
    res.json({ message: 'Manifest deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
