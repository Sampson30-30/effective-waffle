const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Returns all tasks linked to a given task_id, with their project name and link id
router.get('/', async (req, res, next) => {
  try {
    const { task_id } = req.query;
    if (!task_id) return res.status(400).json({ error: 'task_id required' });

    const { rows } = await pool.query(
      `SELECT
         tl.id AS link_id,
         t.id, t.title, t.status, t.priority, t.due_date,
         p.id AS project_id, p.name AS project_name
       FROM task_links tl
       JOIN tasks t ON t.id = CASE
         WHEN tl.task_id_a = $1 THEN tl.task_id_b
         ELSE tl.task_id_a
       END
       JOIN projects p ON p.id = t.project_id
       WHERE tl.task_id_a = $1 OR tl.task_id_b = $1
       ORDER BY tl.created_at DESC`,
      [task_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    let { task_id_a, task_id_b } = req.body;
    // Normalize so smaller id is always task_id_a
    if (task_id_a > task_id_b) [task_id_a, task_id_b] = [task_id_b, task_id_a];

    const { rows } = await pool.query(
      `INSERT INTO task_links (task_id_a, task_id_b)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [task_id_a, task_id_b]
    );
    if (!rows[0]) return res.status(409).json({ error: 'Link already exists' });
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM task_links WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
