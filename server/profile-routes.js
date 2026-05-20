'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { requireAuth } = require('./auth-middleware');

const router = express.Router();

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    avatar: row.avatar_url,
    house: row.house,
    wins: row.wins,
    losses: row.losses,
    points: row.points
  };
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await db.getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    console.error('GET profile error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/', requireAuth, async (req, res) => {
  try {
    const { username, avatarUrl, newPassword } = req.body;
    const userId = req.userId;

    const updates = {};

    if (username !== undefined && username !== '') {
      const trimmed = String(username).trim();
      if (trimmed.length < 3 || trimmed.length > 50) {
        return res.status(400).json({ error: 'Username must be 3–50 characters.' });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        return res.status(400).json({ error: 'Username may only contain letters, numbers, and underscores.' });
      }
      const taken = await db.isUsernameTaken(trimmed, userId);
      if (taken) {
        return res.status(409).json({ error: 'Username is already taken.' });
      }
      updates.username = trimmed;
    }

    if (avatarUrl !== undefined && avatarUrl !== '') {
      const trimmedUrl = String(avatarUrl).trim();
      if (!isValidUrl(trimmedUrl)) {
        return res.status(400).json({ error: 'Avatar must be a valid http(s) URL.' });
      }
      updates.avatarUrl = trimmedUrl;
    }

    if (newPassword) {
      if (String(newPassword).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }
      const hash = await bcrypt.hash(newPassword, 10);
      await db.updateUserPassword(userId, hash);
    }

    if (updates.username !== undefined || updates.avatarUrl !== undefined) {
      const ok = await db.updateUserProfile(userId, updates);
      if (!ok && Object.keys(updates).length > 0) {
        return res.status(400).json({ error: 'Nothing to update.' });
      }
    }

    const user = await db.getUserById(userId);
    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: publicUser(user)
    });
  } catch (error) {
    console.error('PUT profile error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
