import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { KMSClient } from '@aws-sdk/client-kms';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// AWS Configuration
const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  // Add credentials if not using IAM roles
  // credentials: {
  //   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  // }
};

// Initialize AWS clients
export const kmsClient = new KMSClient(awsConfig);
export const dynamoDbClient = new DynamoDBClient(awsConfig);
export const dynamoDbDocClient = DynamoDBDocumentClient.from(dynamoDbClient);

// Export configuration
export default {
  kmsClient,
  dynamoDbClient,
  dynamoDbDocClient,
  region: awsConfig.region,
  kmsKeyId: process.env.KMS_KEY_ID,
  tableName: process.env.DYNAMO_TABLE || 'VaultEntries'
};