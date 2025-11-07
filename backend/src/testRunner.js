/**
 * Test runner for Cloud Password Vault backend
 * Runs all unit tests
 */

import testEncryptionService from './services/encryptionService.test.js';
import testDynamoDBClient from './db/dynamoClient.test.js';

async function runAllTests() {
  console.log('🧪 Running Cloud Password Vault Tests\n');
  
  try {
    // Run encryption service tests
    await testEncryptionService();
    console.log('');
    
    // Run DynamoDB client tests
    await testDynamoDBClient();
    console.log('');
    
    console.log('✅ All tests completed!');
  } catch (error) {
    console.error('❌ Tests failed with error:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export default runAllTests;