#!/bin/bash

# Setup script for Railway deployment
echo "Setting up Cloud Password Vault for Railway deployment..."

# Create necessary directories
mkdir -p backend/logs
mkdir -p frontend/logs

# Install backend dependencies
cd backend
npm install --production
cd ..

# Install frontend dependencies
cd frontend
npm install --production
cd ..

echo "Setup complete! Ready for Railway deployment."