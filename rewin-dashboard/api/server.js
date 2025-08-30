// FEATURE: Backend Email Server
// FILE: server.js
// PURPOSE: Express server for handling email sending via SMTP
// LAST MODIFIED: January 28, 2025

const express = require('express');
const cors = require('cors');
const sendEmailHandler = require('./send-email');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://localhost:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Rewin Email API is running',
    timestamp: new Date().toISOString()
  });
});

// Email sending endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    await sendEmailHandler(req, res);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Handle OPTIONS requests for CORS
app.options('/api/send-email', (req, res) => {
  res.status(200).json({ success: true });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Rewin Email API server running on port ${PORT}`);
  console.log(`📧 Email endpoint: http://localhost:${PORT}/api/send-email`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
