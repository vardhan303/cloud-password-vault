/**
 * Simple test for the EncryptionService
 * This is a basic test to verify the encryption/decryption functionality
 */

import EncryptionService from './encryptionService.js';

// Mock AWS KMS client for testing
const mockKmsClient = {
  send: async (command) => {
    if (command.constructor.name === 'GenerateDataKeyCommand') {
      // Return a mock data key response
      return {
        Plaintext: Buffer.from('mock-plaintext-data-key-32-bytes-long'),
        CiphertextBlob: Buffer.from('mock-encrypted-data-key')
      };
    } else if (command.constructor.name === 'DecryptCommand') {
      // Return a mock decrypt response
      return {
        Plaintext: Buffer.from('mock-plaintext-data-key-32-bytes-long')
      };
    }
  }
};

// Replace the actual KMS client with the mock for testing
// In a real test environment, you would use a proper mocking library
const originalKmsClient = global.kmsClient;
global.kmsClient = mockKmsClient;

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
  } finally {
    // Restore the original KMS client
    global.kmsClient = originalKmsClient;
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testEncryptionService();
}

export default testEncryptionService;