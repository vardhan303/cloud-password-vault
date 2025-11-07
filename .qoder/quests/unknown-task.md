# Railway Platform Migration Design

## Objective

Migrate the cloud-password-vault application from AWS infrastructure to Railway platform, replacing all AWS-specific services with Railway-native or Railway-compatible alternatives while maintaining the core functionality of secure password storage with envelope encryption.

## Current Architecture Analysis

### Existing AWS Dependencies

| Component | Current Implementation | Purpose |
|-----------|----------------------|---------|
| Database | AWS DynamoDB | NoSQL database storing encrypted vault entries with userId as partition key and entryId as sort key |
| Encryption | AWS KMS (Key Management Service) | Envelope encryption - generates data encryption keys and encrypts/decrypts them |
| Authentication | Firebase + Google OAuth + JWT | User authentication and session management |
| Hosting | Docker containers | Application containerization for backend and frontend |

### Data Model

| Field | Type | Description |
|-------|------|-------------|
| userId | String | Partition key - identifies the user |
| entryId | String | Sort key - unique identifier for each vault entry |
| name | String | User-friendly name for the secret |
| encryptedDataKey | String (Base64) | Data encryption key encrypted by master key |
| ciphertext | String (Base64) | Encrypted secret data |
| iv | String (Base64) | Initialization vector for AES-GCM |
| authTag | String (Base64) | Authentication tag for AES-GCM integrity verification |
| createdAt | ISO String | Timestamp of creation |
| updatedAt | ISO String | Timestamp of last update |

## Railway Platform Strategy

### Service Replacement Mapping

| AWS Service | Railway Alternative | Justification |
|------------|-------------------|---------------|
| DynamoDB | PostgreSQL (Railway Database) | Railway provides managed PostgreSQL with automatic backups, scaling, and high availability |
| KMS | Application-level encryption with Railway environment variables | Store master encryption key securely in Railway environment variables; implement envelope encryption in application code |
| IAM Roles | Railway environment variables | Manage secrets and configuration through Railway's secure environment variable system |
| Container hosting | Railway deployment | Native support for Dockerfile-based deployments with automatic builds and deployments |

### Encryption Strategy Evolution

#### From AWS KMS to Application-Level Encryption

**Current Flow (AWS KMS):**
1. Request data encryption key from KMS
2. KMS generates plaintext key and encrypted version
3. Use plaintext key for AES-GCM encryption
4. Store encrypted data key with ciphertext
5. For decryption: send encrypted key to KMS for decryption
6. Use decrypted key to decrypt ciphertext

**New Flow (Application-Level):**
1. Retrieve master key from Railway environment variable
2. Generate random data encryption key (DEK) locally using crypto.randomBytes
3. Encrypt DEK with master key using AES-256-GCM
4. Use DEK for encrypting vault secret with AES-256-GCM
5. Store encrypted DEK with ciphertext
6. For decryption: decrypt DEK using master key, then decrypt ciphertext using DEK

**Security Considerations:**
- Master key must be 256-bit (32 bytes) random value stored in Railway environment
- Master key should be rotated periodically through Railway dashboard
- DEK rotation strategy: generate new DEK for each secret entry
- Memory zeroing: clear sensitive keys from memory after use
- Master key never leaves the application runtime environment

## Database Migration Design

### Schema Transformation

#### PostgreSQL Table Structure

**Table Name:** vault_entries

| Column | Data Type | Constraints | Description |
|--------|-----------|------------|-------------|
| user_id | VARCHAR(255) | NOT NULL | User identifier |
| entry_id | UUID | PRIMARY KEY | Unique entry identifier |
| name | VARCHAR(500) | NOT NULL | Secret name/label |
| encrypted_data_key | TEXT | NOT NULL | Base64-encoded encrypted DEK |
| ciphertext | TEXT | NOT NULL | Base64-encoded encrypted secret |
| iv | VARCHAR(24) | NOT NULL | Base64-encoded initialization vector (12 bytes) |
| auth_tag | VARCHAR(24) | NOT NULL | Base64-encoded authentication tag (16 bytes) |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL DEFAULT NOW() | Last update timestamp |

**Indexes:**
- PRIMARY KEY on entry_id
- INDEX on user_id for efficient user-based queries
- COMPOSITE INDEX on (user_id, created_at) for sorted listings

**Database Access Pattern Changes:**

| Operation | DynamoDB Query | PostgreSQL Query |
|-----------|---------------|------------------|
| Create Entry | PutItem | INSERT INTO vault_entries |
| Get Single Entry | GetItem with composite key | SELECT WHERE entry_id = ? AND user_id = ? |
| List User Entries | Query with partition key | SELECT WHERE user_id = ? ORDER BY created_at DESC |
| Update Entry | UpdateItem | UPDATE vault_entries SET ... WHERE entry_id = ? |

### Data Access Layer Refactoring

The DynamoDBClient class will be replaced with PostgreSQLClient class providing identical interface but different implementation.

**Method Signatures (unchanged interface):**
- saveEntry(entry) → Promise<Object>
- getEntry(userId, entryId) → Promise<Object | null>
- listEntries(userId) → Promise<Array>

**Implementation Strategy:**
- Use pg (node-postgres) library for PostgreSQL connectivity
- Implement connection pooling for performance
- Use parameterized queries to prevent SQL injection
- Maintain transaction support for data consistency
- Implement automatic reconnection on connection failure

## Encryption Service Refactoring

### Master Key Management

**Environment Variable Configuration:**

| Variable | Purpose | Format | Example |
|----------|---------|--------|---------|
| MASTER_ENCRYPTION_KEY | 256-bit master key for DEK encryption | Hex string (64 characters) | a1b2c3d4...6364 |
| MASTER_KEY_VERSION | Version identifier for key rotation | Integer | 1 |

**Key Generation Process:**
- Generate using cryptographically secure random number generator
- Store in Railway project environment variables
- Never commit to version control
- Back up securely in separate secure storage

### Encryption Service Interface

**Class: EncryptionService**

**Method: encrypt(plaintext)**

Input: String plaintext to encrypt

Output:
```
{
  ciphertext: Base64 string,
  encryptedDataKey: Base64 string,
  iv: Base64 string,
  authTag: Base64 string,
  keyVersion: Integer
}
```

Process Flow:
1. Generate random 256-bit data encryption key (DEK)
2. Generate random 12-byte initialization vector (IV) for DEK encryption
3. Encrypt DEK with master key using AES-256-GCM
4. Generate random 12-byte IV for data encryption
5. Encrypt plaintext with DEK using AES-256-GCM
6. Return all components needed for decryption
7. Zero out sensitive buffers in memory

**Method: decrypt(encryptedData)**

Input:
```
{
  ciphertext: Base64 string,
  encryptedDataKey: Base64 string,
  iv: Base64 string,
  authTag: Base64 string,
  keyVersion: Integer (optional)
}
```

Output: Decrypted plaintext string

Process Flow:
1. Retrieve master key based on keyVersion (support key rotation)
2. Decrypt encrypted DEK using master key and AES-256-GCM
3. Decrypt ciphertext using decrypted DEK and AES-256-GCM
4. Verify authentication tag for integrity
5. Zero out sensitive buffers in memory
6. Return plaintext

**Security Features:**
- Use crypto.timingSafeEqual for authentication tag comparison
- Implement rate limiting for decryption attempts
- Log failed decryption attempts for security monitoring
- Support multiple master key versions for rotation without data migration

## Application Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| DATABASE_URL | PostgreSQL connection string provided by Railway | Yes | - |
| MASTER_ENCRYPTION_KEY | 256-bit hex-encoded master encryption key | Yes | - |
| MASTER_KEY_VERSION | Current master key version | Yes | 1 |
| JWT_SECRET | Secret for JWT token signing | Yes | - |
| PORT | Application server port | No | 4000 |
| FRONTEND_URL | Frontend application URL | No | Railway-provided URL |
| NODE_ENV | Environment identifier | No | production |
| SESSION_SECRET | Session encryption secret | Yes | - |
| GOOGLE_CLIENT_ID | Google OAuth client ID | Yes | - |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret | Yes | - |

### Railway Service Configuration

**Backend Service:**
- Root directory: /backend
- Build command: npm install
- Start command: npm start
- Port: 4000 (Railway automatically assigns public URL)
- Health check endpoint: /health
- Required Railway plugins: PostgreSQL

**Frontend Service:**
- Root directory: /frontend
- Build command: npm install && npm run build
- Start command: npm run preview
- Port: 5173
- Environment variable: VITE_API_URL (set to backend Railway URL)

**PostgreSQL Database:**
- Railway-managed PostgreSQL instance
- Automatic daily backups
- Connection pooling enabled
- SSL/TLS encryption enforced

## Deployment Strategy

### Initial Setup Phase

1. **Railway Project Creation**
   - Create new Railway project
   - Add PostgreSQL plugin to project
   - Note the DATABASE_URL connection string

2. **Environment Configuration**
   - Generate master encryption key using secure random generator
   - Add all required environment variables to Railway
   - Configure separate variables for backend and frontend services

3. **Database Initialization**
   - Create vault_entries table using provided schema
   - Create indexes for performance optimization
   - Set up automated backup schedule

### Code Migration Phase

**Files Requiring Modification:**

| File Path | Change Type | Description |
|-----------|------------|-------------|
| backend/src/config/aws.js | Replace | Create new railway.js config file for PostgreSQL connection |
| backend/src/db/dynamoClient.js | Rewrite | Implement PostgreSQLClient with same interface |
| backend/src/services/encryptionService.js | Refactor | Replace KMS calls with application-level encryption |
| backend/package.json | Update | Replace AWS SDK dependencies with pg library |
| docker-compose.yml | Remove/Update | Remove DynamoDB local, update for PostgreSQL if needed |
| backend/src/app.js | Update | Update database connection initialization |

**New Dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| pg | ^8.11.0 | PostgreSQL client for Node.js |
| pg-pool | ^3.6.0 | Connection pooling for PostgreSQL |

**Removed Dependencies:**
- @aws-sdk/client-dynamodb
- @aws-sdk/client-kms
- @aws-sdk/lib-dynamodb

### Deployment Execution

**Backend Deployment:**
1. Connect GitHub repository to Railway
2. Configure build settings for backend service
3. Set root directory to /backend
4. Deploy and verify health check endpoint
5. Monitor logs for connection and encryption issues

**Frontend Deployment:**
1. Create separate service in Railway project
2. Set root directory to /frontend
3. Configure VITE_API_URL to backend Railway URL
4. Deploy and verify connectivity to backend

**OAuth Configuration Update:**
- Update Google OAuth callback URL to Railway backend URL
- Update CORS origin in backend to Railway frontend URL
- Test authentication flow end-to-end

### Rollback Strategy

**Contingency Plan:**
- Maintain AWS infrastructure until Railway deployment is fully verified
- Keep database migration scripts reversible
- Document manual rollback procedures
- Test rollback in staging environment before production migration

## API Contract Preservation

### Endpoint Compatibility

All existing API endpoints maintain identical request/response contracts:

**POST /vault/create**
- Request: { name: string, secret: string }
- Response: { success: boolean, entryId: string, name: string, createdAt: string }

**GET /vault/:id**
- Response: { success: boolean, entryId: string, name: string, secret: string, createdAt: string, updatedAt: string }

**GET /vault**
- Response: { success: boolean, count: number, entries: Array<{ entryId, name, createdAt, updatedAt }> }

**POST /auth/login**
- Request: { username: string, password: string }
- Response: { success: boolean, token: string, user: object }

**POST /auth/register**
- Request: { username: string, password: string, email: string }
- Response: { success: boolean, token: string, user: object }

### Frontend Compatibility

No changes required to frontend application except:
- Update VITE_API_URL environment variable to point to Railway backend
- Update OAuth redirect URLs to Railway frontend URL

## Testing Strategy

### Migration Testing Phases

**Phase 1: Local Development Testing**
- Set up local PostgreSQL instance
- Implement and test new encryption service with master key
- Verify data access layer with PostgreSQL
- Test full CRUD operations locally

**Phase 2: Railway Staging Environment**
- Deploy to Railway staging project
- Migrate subset of test data
- Perform end-to-end testing
- Load testing with realistic traffic patterns
- Security testing for encryption/decryption

**Phase 3: Production Deployment**
- Deploy to Railway production project
- Monitor performance metrics
- Verify encryption functionality
- Test disaster recovery procedures

### Validation Checklist

- [ ] PostgreSQL connection pool established successfully
- [ ] Master encryption key loaded from environment
- [ ] Vault entry creation with encryption succeeds
- [ ] Vault entry retrieval with decryption succeeds
- [ ] User-specific entry listing works correctly
- [ ] Authentication flow completes successfully
- [ ] CORS configuration allows frontend access
- [ ] Rate limiting functions properly
- [ ] Error handling provides appropriate responses
- [ ] Logging captures security events
- [ ] Database indexes optimize query performance
- [ ] Backup restoration process validated

## Security Considerations

### Encryption Security

**Strengths:**
- AES-256-GCM provides authenticated encryption
- Envelope encryption limits master key exposure
- Unique DEK per vault entry limits compromise scope
- Authentication tags prevent tampering

**Risk Mitigations:**
- Store master key only in Railway environment variables
- Implement key rotation mechanism with version support
- Monitor and alert on failed decryption attempts
- Regular security audits of encryption implementation

### Database Security

**Access Control:**
- Use Railway-managed PostgreSQL with IAM authentication
- Limit database user permissions to required operations only
- Enable SSL/TLS for all database connections
- Implement row-level security if multiple tenants in future

**Data Protection:**
- All sensitive data encrypted before storage
- Regular automated backups
- Backup encryption enabled
- Backup restoration testing

### Application Security

**Railway Platform Security:**
- Private networking between services
- Automatic SSL/TLS certificates
- DDoS protection included
- Secret management through environment variables

**Additional Measures:**
- Helmet.js for security headers
- CORS configuration restricts origins
- Rate limiting prevents abuse
- JWT token expiration and rotation
- Input validation and sanitization

## Monitoring and Observability

### Metrics to Track

| Metric | Purpose | Alert Threshold |
|--------|---------|-----------------|
| Database connection pool usage | Identify connection leaks | >80% utilization |
| Encryption operation latency | Performance degradation detection | >500ms per operation |
| Failed decryption attempts | Security incident detection | >5 failures per minute per user |
| API response time | User experience monitoring | >2 seconds for any endpoint |
| Error rate | System health indicator | >1% of requests |
| Database query time | Database performance | >100ms for reads, >200ms for writes |

### Logging Strategy

**Log Levels:**
- ERROR: Failed operations, security events
- WARN: Degraded performance, retries
- INFO: Successful operations, lifecycle events
- DEBUG: Detailed execution flow (non-production)

**Sensitive Data Handling:**
- Never log plaintext secrets
- Mask tokens and keys in logs
- Log only metadata for vault operations
- Audit log for all data access

### Railway Platform Monitoring

- Use Railway built-in metrics dashboard
- Configure alerts for service health
- Monitor build and deployment success rates
- Track resource utilization (CPU, memory, disk)

## Cost Optimization

### Railway Pricing Considerations

**Resource Allocation:**
- Backend: Start with Hobby plan, scale based on usage
- Frontend: Static hosting or minimal compute resources
- PostgreSQL: Appropriate storage tier based on data volume

**Cost-Saving Strategies:**
- Implement efficient database queries with proper indexing
- Use connection pooling to minimize database connections
- Optimize container image size for faster builds
- Implement caching where appropriate (auth tokens, etc.)
- Monitor and right-size resources based on actual usage

## Future Enhancements

### Potential Improvements

1. **Key Rotation Automation**
   - Implement automatic master key rotation schedule
   - Re-encrypt DEKs with new master key version
   - Zero-downtime key rotation process

2. **Multi-Region Deployment**
   - Deploy to multiple Railway regions for lower latency
   - Implement read replicas for database

3. **Audit Trail Enhancement**
   - Detailed audit log for all vault access
   - Compliance reporting capabilities
   - Immutable audit log storage

4. **Advanced Security Features**
   - Multi-factor authentication for vault access
   - Time-based secret expiration
   - Secret sharing with access control
   - Biometric authentication support

5. **Performance Optimization**
   - Redis caching layer for frequently accessed data
   - CDN for frontend assets
   - Database query optimization based on production patterns