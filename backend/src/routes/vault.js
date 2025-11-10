import express from 'express';
import EncryptionService from '../services/encryptionService.js';
import KVClient from '../db/dynamoClient.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /vault/create
 * Encrypt and store a new secret
 */
router.post('/create', async (req, res) => {
  try {
    const { name, secret } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!name || !secret) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Name and secret are required' 
      });
    }

    // Encrypt the secret
    const encryptedData = await EncryptionService.encrypt(secret);
    
    // Create vault entry
    const entry = {
      userId,
      entryId: uuidv4(),
      name,
      ...encryptedData
    };

    // Save to Vercel KV
    await KVClient.saveEntry(entry);

    // Return success response (without sensitive data)
    res.status(201).json({
      success: true,
      message: 'Secret stored successfully',
      entryId: entry.entryId,
      name: entry.name,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating vault entry:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Failed to create vault entry' 
    });
  }
});

/**
 * GET /vault/:id
 * Retrieve and decrypt a secret
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Validate entry ID
    if (!id) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Entry ID is required' 
      });
    }

    // Retrieve entry from Vercel KV
    const entry = await KVClient.getEntry(userId, id);
    
    if (!entry) {
      return res.status(404).json({ 
        error: 'Not Found', 
        message: 'Vault entry not found' 
      });
    }

    // Prepare encrypted data for decryption (no encryptedDataKey needed)
    const encryptedData = {
      ciphertext: entry.ciphertext,
      iv: entry.iv,
      authTag: entry.authTag
    };

    // Decrypt the secret
    const decryptedSecret = await EncryptionService.decrypt(encryptedData);

    // Return decrypted secret
    res.status(200).json({
      success: true,
      entryId: entry.entryId,
      name: entry.name,
      secret: decryptedSecret,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    });
  } catch (error) {
    console.error('Error retrieving vault entry:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Failed to retrieve vault entry' 
    });
  }
});

/**
 * GET /vault
 * List all secret entries for a user (metadata only)
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;

    // List entries from Vercel KV
    const entries = await KVClient.listEntries(userId);

    // Return list of entries (metadata only)
    res.status(200).json({
      success: true,
      count: entries.length,
      entries: entries.map(entry => ({
        entryId: entry.entryId,
        name: entry.name,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error listing vault entries:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Failed to list vault entries' 
    });
  }
});

export default router;