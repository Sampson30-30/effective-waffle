const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/', async (req, res) => {
  const { task_id } = req.query;
  const { rows } = task_id
    ? await pool.query('SELECT * FROM comments WHERE task_id = $1 ORDER BY created_at ASC', [task_id])
    : await pool.query('SELECT * FROM comments ORDER BY created_at ASC');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { task_id, author, body } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO comments (task_id, author, body) VALUES ($1, $2, $3) RETURNING *',
    [task_id, author, body]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM comments WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

module.exports = router;
