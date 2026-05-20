'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
const emailService = require('./email-service');

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production.');
  }
  return 'dev_only_jwt_secret_change_me';
}

const JWT_SECRET = getJwtSecret();

function signToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

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

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, house } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existingEmail = await db.getUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await db.createUser(username, email, passwordHash, house);
    const user = await db.getUserById(userId);

    const token = signToken(user);

    return res.status(201).json({
      success: true,
      token,
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      token,
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a reset link has been sent.'
      });
    }

    const resetToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.setResetToken(user.id, resetToken, expiresAt);

    const emailSent = await emailService.sendPasswordResetEmail(user.email, resetToken);

    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send reset email.' });
    }

    return res.status(200).json({
      success: true,
      message: 'If the email exists, a reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot-password error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updated = await db.updateUserPassword(decoded.userId, hashedPassword);

    if (!updated) {
      return res.status(400).json({ error: 'User not found or password could not be updated.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Password has been successfully reset.'
    });
  } catch (error) {
    console.error('Reset-password error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Reset token has expired.' });
    }
    return res.status(400).json({ error: 'Invalid token or internal server error.' });
  }
});

module.exports = router;
