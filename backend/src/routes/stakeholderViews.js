const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/', async (req, res, next) => {
  try {
    const { project_id } = req.query;
    if (!project_id) return res.status(400).json({ error: 'project_id required' });
    const { rows } = await pool.query(
      'SELECT * FROM stakeholder_views WHERE project_id = $1 ORDER BY created_at ASC',
      [project_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { project_id, audience, description } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO stakeholder_views (project_id, audience, description) VALUES ($1, $2, $3) RETURNING *',
      [project_id, audience, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { audience, description } = req.body;
    const { rows } = await pool.query(
      'UPDATE stakeholder_views SET audience=$1, description=$2 WHERE id=$3 RETURNING *',
      [audience, description, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM stakeholder_views WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
