import express from 'express';
import mongoose from 'mongoose';
import Manifest from '../models/Manifest.js';
import { buildManifestReorderOperations } from '../utils/manifestOrder.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/manifests
 * List all manifests (summary view)
 */
router.get('/', async (req, res) => {
  try {
    const visibilityFilter = req.user
      ? {
          $or: [
            { created_by: req.user.id },
            { visibility: 'PUBLIC' },
            { visibility: { $exists: false } },
            { created_by: { $exists: false } }
          ]
        }
      : {
          $or: [
            { visibility: 'PUBLIC' },
            { visibility: { $exists: false } },
            { created_by: { $exists: false } }
          ]
        };

    const manifests = await Manifest.find(visibilityFilter)
      .sort({ order: 1, compiled_at: -1 });
    res.json(manifests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/manifests/marketplace
 * Browse public manifests with search filters
 */
router.get('/marketplace', async (req, res) => {
  try {
    const { q, region, domain } = req.query;
    const visibilityOrOwner = req.user
      ? {
          $or: [
            { created_by: req.user.id },
            { visibility: 'PUBLIC' },
            { visibility: { $exists: false } },
            { created_by: { $exists: false } }
          ]
        }
      : {
          $or: [
            { visibility: 'PUBLIC' },
            { visibility: { $exists: false } },
            { created_by: { $exists: false } }
          ]
        };

    const filters = [visibilityOrOwner];

    if (region) {
      filters.push({ 'config.region': { $regex: new RegExp(region, 'i') } });
    }

    if (domain) {
      filters.push({ 'domains.title': { $regex: new RegExp(domain, 'i') } });
    }

    if (q) {
      const regex = new RegExp(q, 'i');
      filters.push({
        $or: [
          { id: regex },
          { 'config.region': regex },
          { 'domains.title': regex },
          { 'domains.sections.title': regex },
          { 'domains.fields.label': regex }
        ]
      });
    }

    const manifests = await Manifest.find({ $and: filters })
      .sort({ compiled_at: -1 });
    res.json(manifests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/manifests/reorder
 * Reorder manifests
 */
router.put('/reorder', requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    let operations;
    try {
      operations = buildManifestReorderOperations(ids);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (operations.length > 0) {
          await Manifest.bulkWrite(operations, { session });
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('Transaction numbers are only allowed')) {
        if (operations.length > 0) {
          await Manifest.bulkWrite(operations);
        }
      } else {
        throw err;
      }
    } finally {
      session.endSession();
    }

    res.json({ message: 'Manifests reordered successfully' });
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
    if (
      manifest.visibility === 'PRIVATE' &&
      manifest.author?.id &&
      (!req.user || (req.user.id !== manifest.author.id && req.user.role !== 'ADMIN'))
    ) {
      return res.status(403).json({ error: 'Manifest is private' });
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
router.post('/', requireAuth, async (req, res) => {
  try {
    const manifestData = req.body;
    
    console.log('[MANIFEST API] POST received, id:', manifestData.id);
    console.log('[MANIFEST API] Domains count:', manifestData.domains?.length);
    
    if (!manifestData.id) {
      console.error('[MANIFEST API] No ID provided');
      return res.status(400).json({ error: 'Manifest id is required' });
    }

    if (manifestData.visibility && !['PUBLIC', 'PRIVATE'].includes(manifestData.visibility)) {
      return res.status(400).json({ error: 'Invalid visibility value' });
    }

    const existing = await Manifest.findOne({ id: manifestData.id }).select('created_by author visibility');
    if (!manifestData.visibility) {
      manifestData.visibility = existing?.visibility || 'PRIVATE';
    }

    // Convert compiled_at string to Date if needed
    if (typeof manifestData.compiled_at === 'string') {
      manifestData.compiled_at = new Date(manifestData.compiled_at);
    }

    if (existing?.created_by) {
      manifestData.created_by = existing.created_by;
      manifestData.author = existing.author;
    } else if (req.user) {
      manifestData.created_by = req.user.id;
      manifestData.author = {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
      };
    }

    // Upsert: update if exists, create if not
    console.log('[MANIFEST API] Upserting to MongoDB...');
    const manifest = await Manifest.findOneAndUpdate(
      { id: manifestData.id },
      manifestData,
      { upsert: true, new: true, runValidators: true }
    );

    console.log('[MANIFEST API] Saved successfully, _id:', manifest._id);
    res.status(201).json(manifest);
  } catch (err) {
    console.error('[MANIFEST API] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/manifests/:id/visibility
 * Update manifest visibility (owner/admin only)
 */
router.patch('/:id/visibility', requireAuth, async (req, res) => {
  try {
    const { visibility } = req.body;
    if (!['PUBLIC', 'PRIVATE'].includes(visibility)) {
      return res.status(400).json({ error: 'Visibility must be PUBLIC or PRIVATE' });
    }

    const manifest = await Manifest.findOne({ id: req.params.id });
    if (!manifest) {
      return res.status(404).json({ error: 'Manifest not found' });
    }

    if (manifest.author?.id && manifest.author.id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not allowed to change visibility' });
    }

    if (!manifest.author?.id) {
      manifest.author = {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
      };
    }
    if (!manifest.created_by) {
      manifest.created_by = req.user.id;
    }

    manifest.visibility = visibility;
    await manifest.save();
    res.json(manifest);
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
