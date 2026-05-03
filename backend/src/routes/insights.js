const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT i.*,
        COALESCE(
          json_agg(json_build_object('id', t.id, 'name', t.name)) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tags
      FROM insights i
      LEFT JOIN insight_tags it ON it.insight_id = i.id
      LEFT JOIN tags t ON t.id = it.tag_id
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT i.*,
        COALESCE(
          json_agg(json_build_object('id', t.id, 'name', t.name)) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tags
      FROM insights i
      LEFT JOIN insight_tags it ON it.insight_id = i.id
      LEFT JOIN tags t ON t.id = it.tag_id
      WHERE i.id = $1
      GROUP BY i.id
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, body } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO insights (title, body) VALUES ($1, $2) RETURNING *',
      [title, body]
    );
    res.status(201).json({ ...rows[0], tags: [] });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { title, body } = req.body;
    const { rows } = await pool.query(
      'UPDATE insights SET title=$1, body=$2 WHERE id=$3 RETURNING *',
      [title, body, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM insights WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// Insight tag attach/detach
router.post('/insight-tags', async (req, res, next) => {
  try {
    const { insight_id, tag_id } = req.body;
    await pool.query(
      'INSERT INTO insight_tags (insight_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [insight_id, tag_id]
    );
    res.status(201).json({ insight_id, tag_id });
  } catch (err) { next(err); }
});

router.delete('/insight-tags', async (req, res, next) => {
  try {
    const { insight_id, tag_id } = req.body;
    await pool.query(
      'DELETE FROM insight_tags WHERE insight_id = $1 AND tag_id = $2',
      [insight_id, tag_id]
    );
    res.status(204).send();
  } catch (err) { next(err); }
});

// Get tags for a specific insight
router.get('/for-insight/:insight_id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT t.* FROM tags t JOIN insight_tags it ON it.tag_id = t.id WHERE it.insight_id = $1 ORDER BY t.name',
      [req.params.insight_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
