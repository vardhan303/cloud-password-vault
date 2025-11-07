/**
 * Simple test for the DynamoDBClient
 * This is a basic test to verify the DynamoDB functionality
 */

import DynamoDBClient from './dynamoClient.js';

// Mock DynamoDB client for testing
const mockDynamoDbDocClient = {
  send: async (command) => {
    if (command.constructor.name === 'PutItemCommand') {
      // Mock successful save
      return {};
    } else if (command.constructor.name === 'GetItemCommand') {
      // Mock successful retrieval
      return {
        Item: {
          userId: { S: 'user123' },
          entryId: { S: 'entry456' },
          name: { S: 'Test Entry' },
          encryptedDataKey: { S: 'encrypted-key' },
          ciphertext: { S: 'encrypted-data' },
          iv: { S: 'iv-data' },
          authTag: { S: 'auth-tag' },
          createdAt: { S: '2023-01-01T00:00:00Z' },
          updatedAt: { S: '2023-01-01T00:00:00Z' }
        }
      };
    } else if (command.constructor.name === 'QueryCommand') {
      // Mock successful list
      return {
        Items: [
          {
            userId: { S: 'user123' },
            entryId: { S: 'entry456' },
            name: { S: 'Test Entry' },
            createdAt: { S: '2023-01-01T00:00:00Z' },
            updatedAt: { S: '2023-01-01T00:00:00Z' }
          }
        ]
      };
    }
  }
};

// Replace the actual DynamoDB client with the mock for testing
const originalDynamoDbDocClient = global.dynamoDbDocClient;
global.dynamoDbDocClient = mockDynamoDbDocClient;

// Mock table name
const originalTableName = global.tableName;
global.tableName = 'TestVaultEntries';

async function testDynamoDBClient() {
  console.log('Testing DynamoDBClient...');
  
  try {
    // Test saving an entry
    const entry = {
      userId: 'user123',
      entryId: 'entry456',
      name: 'Test Entry',
      encryptedDataKey: 'encrypted-key',
      ciphertext: 'encrypted-data',
      iv: 'iv-data',
      authTag: 'auth-tag'
    };
    
    const savedEntry = await DynamoDBClient.saveEntry(entry);
    console.log('✅ Save entry test PASSED');
    
    // Test retrieving an entry
    const retrievedEntry = await DynamoDBClient.getEntry('user123', 'entry456');
    console.log('Retrieved entry:', retrievedEntry);
    
    if (retrievedEntry && retrievedEntry.entryId === 'entry456') {
      console.log('✅ Get entry test PASSED');
    } else {
      console.log('❌ Get entry test FAILED');
    }
    
    // Test listing entries
    const entries = await DynamoDBClient.listEntries('user123');
    console.log('Listed entries:', entries);
    
    if (entries.length > 0 && entries[0].entryId === 'entry456') {
      console.log('✅ List entries test PASSED');
    } else {
      console.log('❌ List entries test FAILED');
    }
  } catch (error) {
    console.error('❌ DynamoDBClient test FAILED with error:', error);
  } finally {
    // Restore the original clients
    global.dynamoDbDocClient = originalDynamoDbDocClient;
    global.tableName = originalTableName;
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDynamoDBClient();
}

export default testDynamoDBClient;