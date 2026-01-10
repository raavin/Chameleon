import express from 'express';
import ResearchArtifact from '../models/ResearchArtifact.js';

const router = express.Router();

/**
 * GET /api/artifacts
 * List all research artifacts (summary without cached_content)
 */
router.get('/', async (req, res) => {
  try {
    const artifacts = await ResearchArtifact.find()
      .select('-cached_content')  // Exclude large text field
      .sort({ createdAt: -1 });
    res.json(artifacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/artifacts/:id
 * Get a single artifact with full content
 */
router.get('/:id', async (req, res) => {
  try {
    const artifact = await ResearchArtifact.findOne({ id: req.params.id });
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }
    res.json(artifact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/artifacts/search
 * Full-text search on artifacts
 */
router.get('/search/:query', async (req, res) => {
  try {
    const artifacts = await ResearchArtifact.find(
      { $text: { $search: req.params.query } },
      { score: { $meta: 'textScore' } }
    )
    .select('-cached_content')
    .sort({ score: { $meta: 'textScore' } })
    .limit(20);
    
    res.json(artifacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/artifacts
 * Create or update a research artifact
 */
router.post('/', async (req, res) => {
  try {
    const artifactData = req.body;

    if (!artifactData.id) {
      return res.status(400).json({ error: 'Artifact id is required' });
    }

    const artifact = await ResearchArtifact.findOneAndUpdate(
      { id: artifactData.id },
      artifactData,
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json(artifact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/artifacts/:id
 * Delete an artifact
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await ResearchArtifact.findOneAndDelete({ id: req.params.id });
    if (!result) {
      return res.status(404).json({ error: 'Artifact not found' });
    }
    res.json({ message: 'Artifact deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
