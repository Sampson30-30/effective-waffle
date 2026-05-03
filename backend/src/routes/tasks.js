const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/', async (req, res, next) => {
  try {
    const { project_id, search } = req.query;
    let rows;
    if (search) {
      ({ rows } = await pool.query(
        `SELECT t.*, p.name AS project_name
         FROM tasks t JOIN projects p ON p.id = t.project_id
         WHERE t.title ILIKE $1
         ORDER BY t.created_at DESC
         LIMIT 20`,
        [`%${search}%`]
      ));
    } else if (project_id) {
      ({ rows } = await pool.query(
        'SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC',
        [project_id]
      ));
    } else {
      ({ rows } = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC'));
    }
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { project_id, title, description, status, priority, due_date } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO tasks (project_id, title, description, status, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [project_id, title, description, status || 'todo', priority || 'medium', due_date || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { title, description, status, priority, due_date } = req.body;
    const { rows } = await pool.query(
      `UPDATE tasks SET title=$1, description=$2, status=$3, priority=$4, due_date=$5
       WHERE id=$6 RETURNING *`,
      [title, description, status, priority, due_date || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
