/**
 * Simple test for the EncryptionService
 * This is a basic test to verify the encryption/decryption functionality
 */

import EncryptionService from './encryptionService.js';

// Set a test encryption key
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing-purposes-must-be-32-chars'

async function testEncryptionService() {
  console.log('Testing EncryptionService...');
  
  try {
    // Test encryption
    const plaintext = 'This is a secret password!';
    console.log('Original plaintext:', plaintext);
    
    const encryptedData = await EncryptionService.encrypt(plaintext);
    console.log('Encrypted data:', encryptedData);
    
    // Test decryption
    const decryptedText = await EncryptionService.decrypt(encryptedData);
    console.log('Decrypted text:', decryptedText);
    
    // Verify the decrypted text matches the original
    if (plaintext === decryptedText) {
      console.log('✅ Encryption/Decryption test PASSED');
    } else {
      console.log('❌ Encryption/Decryption test FAILED');
      console.log('Expected:', plaintext);
      console.log('Actual:', decryptedText);
    }
  } catch (error) {
    console.error('❌ EncryptionService test FAILED with error:', error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testEncryptionService();
}

export default testEncryptionService;