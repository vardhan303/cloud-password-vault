import express from 'express';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /auth/login
 * User login endpoint
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Simple validation
  if (!username || !password) {
    return res.status(400).json({ 
      error: 'Bad Request', 
      message: 'Username and password are required' 
    });
  }
  
  // In a real application, you would validate credentials against a database
  // For this demo, we'll accept any non-empty username/password
  
  // Create a user object
  const user = {
    id: 'user_' + Date.now(),
    userId: 'user_' + Date.now(),
    email: username + '@example.com',
    name: username
  };
  
  // Generate JWT token
  const token = generateToken(user);
  
  res.status(200).json({ 
    success: true,
    message: 'Login successful',
    token,
    user
  });
});

/**
 * POST /auth/register
 * User registration endpoint
 */
router.post('/register', (req, res) => {
  const { username, password, email } = req.body;
  
  // Simple validation
  if (!username || !password || !email) {
    return res.status(400).json({ 
      error: 'Bad Request', 
      message: 'Username, password, and email are required' 
    });
  }
  
  // In a real application, you would save the user to a database
  // For this demo, we'll just generate a token
  
  // Create a user object
  const user = {
    id: 'user_' + Date.now(),
    userId: 'user_' + Date.now(),
    email,
    name: username
  };
  
  // Generate JWT token
  const token = generateToken(user);
  
  res.status(201).json({ 
    success: true,
    message: 'Registration successful',
    token,
    user
  });
});

export default router;