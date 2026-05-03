const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, description, root_problem_id, phase } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO projects (name, description, root_problem_id, phase) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, root_problem_id || null, phase || 'discovery']
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, root_problem_id, phase } = req.body;
    const { rows } = await pool.query(
      'UPDATE projects SET name=$1, description=$2, root_problem_id=$3, phase=$4 WHERE id=$5 RETURNING *',
      [name, description, root_problem_id || null, phase || 'discovery', req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// Lightweight patch for toggling phase without requiring full body
router.patch('/:id/phase', async (req, res, next) => {
  try {
    const { phase } = req.body;
    const { rows } = await pool.query(
      'UPDATE projects SET phase=$1 WHERE id=$2 RETURNING *',
      [phase, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
