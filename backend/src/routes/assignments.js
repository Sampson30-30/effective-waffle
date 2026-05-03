const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/', async (req, res) => {
  const { task_id } = req.query;
  const { rows } = task_id
    ? await pool.query('SELECT * FROM assignments WHERE task_id = $1', [task_id])
    : await pool.query('SELECT * FROM assignments');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { task_id, assignee_name } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO assignments (task_id, assignee_name) VALUES ($1, $2) RETURNING *',
    [task_id, assignee_name]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM assignments WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

module.exports = router;
