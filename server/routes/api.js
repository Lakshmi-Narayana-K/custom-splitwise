const express = require('express');
const router = express.Router();
const { swGet, swPost } = require('../splitwiseClient');
const { buildSplitwisePayload } = require('../splitEngine');

// GET /api/me
router.get('/me', async (req, res) => {
  try {
    const data = await swGet('/get_current_user');
    res.json(data.user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/groups
router.get('/groups', async (req, res) => {
  try {
    const data = await swGet('/get_groups');
    const groups = data.groups.map((g) => ({
      id: g.id,
      name: g.name,
      members: g.members.map((m) => ({
        id: m.id,
        name: `${m.first_name} ${m.last_name || ''}`.trim(),
        email: m.email,
        avatar: m.picture?.medium,
      })),
    }));
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/friends
router.get('/friends', async (req, res) => {
  try {
    const data = await swGet('/get_friends');
    const friends = data.friends.map((f) => ({
      id: f.id,
      name: `${f.first_name} ${f.last_name || ''}`.trim(),
      email: f.email,
      avatar: f.picture?.medium,
    }));
    res.json(friends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/expenses/preview
// Returns the computed breakdown without submitting
router.post('/expenses/preview', (req, res) => {
  try {
    const { total, description, groupId, currency, date, paidBy, splits } = req.body;
    const { payload, breakdown } = buildSplitwisePayload({
      total, description, groupId, currency, date, paidBy, splits,
    });
    res.json({ success: true, breakdown, payload });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/expenses
// Submits expense to Splitwise
router.post('/expenses', async (req, res) => {
  try {
    const { total, description, groupId, currency, date, paidBy, splits } = req.body;
    const { payload } = buildSplitwisePayload({
      total, description, groupId, currency, date, paidBy, splits,
    });
    const data = await swPost('/create_expense', payload);

    if (data.errors && Object.keys(data.errors).length > 0) {
      return res.status(400).json({ error: 'Splitwise rejected the expense', details: data.errors });
    }

    res.json({ success: true, expense: data.expenses?.[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
