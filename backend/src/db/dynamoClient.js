import { kv } from '@vercel/kv';

/**
 * Vercel KV Data Access Layer for VaultEntries
 */
class KVClient {
  /**
   * Save a vault entry to Vercel KV
   * @param {Object} entry - The vault entry to save
   * @returns {Promise<Object>} The saved item
   */
  static async saveEntry(entry) {
    try {
      const key = `vault:${entry.userId}:${entry.entryId}`;
      const entryData = {
        ...entry,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await kv.set(key, JSON.stringify(entryData));
      
      // Also add to user's entry list
      const listKey = `vault:${entry.userId}:list`;
      const existingList = await kv.get(listKey);
      const list = existingList ? JSON.parse(existingList) : [];
      
      if (!list.includes(entry.entryId)) {
        list.push(entry.entryId);
        await kv.set(listKey, JSON.stringify(list));
      }
      
      return entryData;
    } catch (error) {
      console.error('Error saving entry to KV:', error);
      throw new Error('Failed to save entry');
    }
  }

  /**
   * Get a vault entry by userId and entryId
   * @param {string} userId - The user ID
   * @param {string} entryId - The entry ID
   * @returns {Promise<Object|null>} The retrieved item or null if not found
   */
  static async getEntry(userId, entryId) {
    try {
      const key = `vault:${userId}:${entryId}`;
      const data = await kv.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error retrieving entry from KV:', error);
      throw new Error('Failed to retrieve entry');
    }
  }

  /**
   * List all vault entries for a user (metadata only)
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} Array of vault entries (metadata only)
   */
  static async listEntries(userId) {
    try {
      const listKey = `vault:${userId}:list`;
      const list = await kv.get(listKey);
      
      if (!list) {
        return [];
      }
      
      const entryIds = JSON.parse(list);
      const entries = [];
      
      for (const entryId of entryIds) {
        const entry = await this.getEntry(userId, entryId);
        if (entry) {
          entries.push({
            userId: entry.userId,
            entryId: entry.entryId,
            name: entry.name,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt
          });
        }
      }
      
      return entries;
    } catch (error) {
      console.error('Error listing entries from KV:', error);
      throw new Error('Failed to list entries');
    }
  }
}

export default KVClient;