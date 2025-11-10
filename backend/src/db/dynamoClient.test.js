/**
 * Simple test for the KVClient
 * This is a basic test to verify the Vercel KV functionality
 */

import KVClient from './dynamoClient.js';

// Mock Vercel KV for testing
const mockStore = new Map();

const mockKV = {
  get: async (key) => {
    return mockStore.get(key) || null;
  },
  set: async (key, value) => {
    mockStore.set(key, value);
    return 'OK';
  }
};

// Mock the @vercel/kv module
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
global.kv = mockKV;

async function testKVClient() {
  console.log('Testing KVClient...');
  
  try {
    // Test saving an entry
    const entry = {
      userId: 'user123',
      entryId: 'entry456',
      name: 'Test Entry',
      ciphertext: 'encrypted-data',
      iv: 'iv-data',
      authTag: 'auth-tag'
    };
    
    const savedEntry = await KVClient.saveEntry(entry);
    console.log('✅ Save entry test PASSED');
    
    // Test retrieving an entry
    const retrievedEntry = await KVClient.getEntry('user123', 'entry456');
    console.log('Retrieved entry:', retrievedEntry);
    
    if (retrievedEntry && retrievedEntry.entryId === 'entry456') {
      console.log('✅ Get entry test PASSED');
    } else {
      console.log('❌ Get entry test FAILED');
    }
    
    // Test listing entries
    const entries = await KVClient.listEntries('user123');
    console.log('Listed entries:', entries);
    
    if (entries.length > 0 && entries[0].entryId === 'entry456') {
      console.log('✅ List entries test PASSED');
    } else {
      console.log('❌ List entries test FAILED');
    }
  } catch (error) {
    console.error('❌ KVClient test FAILED with error:', error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testKVClient();
}

export default testKVClient;