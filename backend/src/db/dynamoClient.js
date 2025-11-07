import { PutItemCommand, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { dynamoDbDocClient, tableName } from '../config/aws.js';

/**
 * DynamoDB Data Access Layer for VaultEntries
 */
class DynamoDBClient {
  /**
   * Save a vault entry to DynamoDB
   * @param {Object} entry - The vault entry to save
   * @returns {Promise<Object>} The saved item
   */
  static async saveEntry(entry) {
    const params = {
      TableName: tableName,
      Item: {
        userId: { S: entry.userId },
        entryId: { S: entry.entryId },
        name: { S: entry.name },
        encryptedDataKey: { S: entry.encryptedDataKey },
        ciphertext: { S: entry.ciphertext },
        iv: { S: entry.iv },
        authTag: { S: entry.authTag },
        createdAt: { S: new Date().toISOString() },
        updatedAt: { S: new Date().toISOString() }
      }
    };

    try {
      await dynamoDbDocClient.send(new PutItemCommand(params));
      return entry;
    } catch (error) {
      console.error('Error saving entry to DynamoDB:', error);
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
    const params = {
      TableName: tableName,
      Key: {
        userId: { S: userId },
        entryId: { S: entryId }
      }
    };

    try {
      const result = await dynamoDbDocClient.send(new GetItemCommand(params));
      return result.Item ? this.unmarshallItem(result.Item) : null;
    } catch (error) {
      console.error('Error retrieving entry from DynamoDB:', error);
      throw new Error('Failed to retrieve entry');
    }
  }

  /**
   * List all vault entries for a user (metadata only)
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} Array of vault entries (metadata only)
   */
  static async listEntries(userId) {
    const params = {
      TableName: tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': { S: userId }
      },
      ProjectionExpression: 'userId, entryId, name, createdAt, updatedAt'
    };

    try {
      const result = await dynamoDbDocClient.send(new QueryCommand(params));
      return result.Items ? result.Items.map(item => this.unmarshallItem(item)) : [];
    } catch (error) {
      console.error('Error listing entries from DynamoDB:', error);
      throw new Error('Failed to list entries');
    }
  }

  /**
   * Convert DynamoDB item to plain JavaScript object
   * @param {Object} item - The DynamoDB item
   * @returns {Object} The unmarshalled item
   */
  static unmarshallItem(item) {
    const unmarshalled = {};
    for (const [key, value] of Object.entries(item)) {
      // Extract the value based on DynamoDB data type
      if (value.S !== undefined) {
        unmarshalled[key] = value.S;
      } else if (value.N !== undefined) {
        unmarshalled[key] = Number(value.N);
      } else if (value.BOOL !== undefined) {
        unmarshalled[key] = value.BOOL;
      } else if (value.L !== undefined) {
        unmarshalled[key] = value.L.map(this.unmarshallItem);
      } else if (value.M !== undefined) {
        unmarshalled[key] = this.unmarshallItem(value.M);
      } else {
        unmarshalled[key] = value;
      }
    }
    return unmarshalled;
  }
}

export default DynamoDBClient;