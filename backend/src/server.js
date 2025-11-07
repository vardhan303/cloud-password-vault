import app from './app.js';
import vaultRoutes from './routes/vault.js';
import authRoutes from './routes/auth.js';
import authMiddleware from './middleware/auth.js';
import './config/aws.js';

// Root route
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Welcome to Cloud Password Vault API',
    version: '1.0.0',
    documentation: 'https://github.com/your-repo/cloud-password-vault'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Cloud Password Vault API is running' });
});

// Auth routes (no authentication required)
app.use('/auth', authRoutes);

// Protected routes
app.use('/vault', authMiddleware, vaultRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Cloud Password Vault API running on port ${PORT}`);
});

export default app;