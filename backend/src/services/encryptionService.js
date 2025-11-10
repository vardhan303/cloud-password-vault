import crypto from 'crypto';

/**
 * Encryption Service using AES-256-GCM encryption
 */
class EncryptionService {
  /**
   * Get the master encryption key from environment
   */
  static getMasterKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable not set');
    }
    // Derive a 32-byte key from the environment variable
    return crypto.createHash('sha256').update(key).digest();
  }

  /**
   * Encrypts plaintext using AES-256-GCM
   * @param {string} plaintext - The plaintext to encrypt
   * @returns {Object} Encrypted data including ciphertext, iv, and authTag
   */
  static async encrypt(plaintext) {
    try {
      // Get master key
      const key = this.getMasterKey();
      
      // Generate a random IV (Initialization Vector)
      const iv = crypto.randomBytes(12);
      
      // Create cipher
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      
      // Encrypt the plaintext
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Get the authentication tag
      const authTag = cipher.getAuthTag();
      
      return {
        ciphertext: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypts ciphertext using AES-256-GCM
   * @param {Object} encryptedData - Object containing ciphertext, iv, and authTag
   * @returns {string} Decrypted plaintext
   */
  static async decrypt(encryptedData) {
    try {
      const { ciphertext, iv, authTag } = encryptedData;
      
      // Get master key
      const key = this.getMasterKey();
      
      // Decode base64 values
      const ivBuffer = Buffer.from(iv, 'base64');
      const authTagBuffer = Buffer.from(authTag, 'base64');
      
      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
      decipher.setAuthTag(authTagBuffer);
      
      // Decrypt the ciphertext
      let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

}

export default EncryptionService;