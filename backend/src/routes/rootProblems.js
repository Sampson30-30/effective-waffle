const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM root_problems ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM root_problems WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get('/:id/projects', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM projects WHERE root_problem_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, thesis } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO root_problems (name, thesis) VALUES ($1, $2) RETURNING *',
      [name, thesis]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, thesis } = req.body;
    const { rows } = await pool.query(
      'UPDATE root_problems SET name = $1, thesis = $2 WHERE id = $3 RETURNING *',
      [name, thesis, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM root_problems WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
