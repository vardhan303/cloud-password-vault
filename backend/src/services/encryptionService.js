import { GenerateDataKeyCommand, DecryptCommand } from '@aws-sdk/client-kms';
import { kmsClient } from '../config/aws.js';
import crypto from 'crypto';

/**
 * Encryption Service using AWS KMS envelope encryption with AES-GCM
 */
class EncryptionService {
  /**
   * Generates a data key using AWS KMS and encrypts plaintext with it
   * @param {string} plaintext - The plaintext to encrypt
   * @returns {Object} Encrypted data including ciphertext, encryptedDataKey, iv, and authTag
   */
  static async encrypt(plaintext) {
    try {
      // Generate a data key using AWS KMS
      const generateDataKeyCommand = new GenerateDataKeyCommand({
        KeyId: process.env.KMS_KEY_ID,
        KeySpec: 'AES_256'
      });

      const dataKeyResponse = await kmsClient.send(generateDataKeyCommand);
      
      // Extract the plaintext and encrypted data keys
      const plaintextDataKey = dataKeyResponse.Plaintext; // This is the unencrypted data key
      const encryptedDataKey = dataKeyResponse.CiphertextBlob; // This is the encrypted data key
      
      // Generate a random IV (Initialization Vector)
      const iv = crypto.randomBytes(12);
      
      // Create cipher using the plaintext data key
      const cipher = crypto.createCipherGCM('aes-256-gcm', plaintextDataKey, iv);
      
      // Encrypt the plaintext
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Get the authentication tag
      const authTag = cipher.getAuthTag();
      
      // Zero out plaintext data key for security
      this.zeroBuffer(plaintextDataKey);
      
      return {
        ciphertext: encrypted,
        encryptedDataKey: encryptedDataKey.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypts ciphertext using AWS KMS to decrypt the data key first
   * @param {Object} encryptedData - Object containing ciphertext, encryptedDataKey, iv, and authTag
   * @returns {string} Decrypted plaintext
   */
  static async decrypt(encryptedData) {
    try {
      const { ciphertext, encryptedDataKey, iv, authTag } = encryptedData;
      
      // Decode base64 values
      const encryptedDataKeyBuffer = Buffer.from(encryptedDataKey, 'base64');
      const ivBuffer = Buffer.from(iv, 'base64');
      const authTagBuffer = Buffer.from(authTag, 'base64');
      
      // Decrypt the data key using AWS KMS
      const decryptCommand = new DecryptCommand({
        CiphertextBlob: encryptedDataKeyBuffer
      });
      
      const decryptResponse = await kmsClient.send(decryptCommand);
      const plaintextDataKey = decryptResponse.Plaintext;
      
      // Create decipher using the decrypted data key
      const decipher = crypto.createDecipherGCM('aes-256-gcm', plaintextDataKey, ivBuffer);
      decipher.setAuthTag(authTagBuffer);
      
      // Decrypt the ciphertext
      let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Zero out plaintext data key for security
      this.zeroBuffer(plaintextDataKey);
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Securely zeros out a buffer to prevent plaintext data from lingering in memory
   * @param {Buffer} buffer - Buffer to zero out
   */
  static zeroBuffer(buffer) {
    if (Buffer.isBuffer(buffer)) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = 0;
      }
    }
  }
}

export default EncryptionService;