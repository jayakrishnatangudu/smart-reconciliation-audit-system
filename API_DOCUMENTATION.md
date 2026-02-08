# API Documentation - Smart Reconciliation & Audit System

## Base URL
```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication

All API endpoints (except `/auth/login`) require a JWT token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

---

## API Endpoints

### 🔐 Authentication

#### 1. Login
**Endpoint:** `POST /auth/login`  
**Access:** Public  
**Description:** Authenticate user and receive JWT token

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "Admin@123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "Admin"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

#### 2. Register User
**Endpoint:** `POST /auth/register`  
**Access:** Private (Admin only)  
**Description:** Create a new user account

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "Analyst"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Analyst"
  }
}
```

---

#### 3. Get Current User
**Endpoint:** `GET /auth/me`  
**Access:** Private  
**Description:** Get currently authenticated user details

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "Admin"
  }
}
```

---

### 📤 File Upload

#### 4. Upload File for Preview
**Endpoint:** `POST /upload/preview`  
**Access:** Private (Admin, Analyst)  
**Description:** Upload a file and get first 20 rows for column mapping

**Request:** Multipart form data
```
file: <your_file.csv>
```

**Success Response (200):**
```json
{
  "success": true,
  "fileName": "transactions.csv",
  "tempFilePath": "1709123456789-abc123-transactions.csv",
  "totalRows": 5000,
  "preview": [
    {
      "Transaction ID": "TXN0000001",
      "Amount": "1500.50",
      "Ref Number": "REF12345",
      "Date": "2024-01-15"
    }
  ],
  "columns": ["Transaction ID", "Amount", "Ref Number", "Date"]
}
```

---

#### 5. Submit File for Processing
**Endpoint:** `POST /upload/submit`  
**Access:** Private (Admin, Analyst)  
**Description:** Submit file with column mapping for processing

**Request Body:**
```json
{
  "tempFilePath": "1709123456789-abc123-transactions.csv",
  "columnMapping": {
    "transactionId": "Transaction ID",
    "amount": "Amount",
    "referenceNumber": "Ref Number",
    "date": "Date"
  }
}
```

**Success Response (202):**
```json
{
  "success": true,
  "message": "File upload accepted and queued for processing",
  "uploadJobId": "65c7f8e9d4b2a1234567890a",
  "queueJobId": "upload-65c7f8e9d4b2a1234567890a",
  "status": "Pending"
}
```

**Idempotent Response (200):**
```json
{
  "success": true,
  "message": "File already processed",
  "uploadJobId": "65c7f8e9d4b2a1234567890a",
  "status": "Completed",
  "existing": true
}
```

---

#### 6. Get Upload Status
**Endpoint:** `GET /upload/status/:jobId`  
**Access:** Private  
**Description:** Get real-time status of an upload job

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "65c7f8e9d4b2a1234567890a",
    "fileName": "transactions.csv",
    "fileHash": "a3b5c7d9...",
    "status": "Processing",
    "progressPercent": 45,
    "totalRecords": 50000,
    "processedRecords": 22500,
    "failedRecords": 0,
    "matchedRecords": 0,
    "partiallyMatchedRecords": 0,
    "unmatchedRecords": 0,
    "duplicateRecords": 0,
    "startedAt": "2024-02-28T10:30:00.000Z",
    "uploadedBy": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Admin User",
      "email": "admin@example.com"
    }
  },
  "queueStatus": {
    "state": "active",
    "progress": 45,
    "attemptsMade": 1,
    "failedReason": null
  }
}
```

---

#### 7. Get All Uploads
**Endpoint:** `GET /upload/all`  
**Access:** Private  
**Description:** Get list of all upload jobs with filtering

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `status` (optional): Pending|Processing|Completed|Failed|PartiallyFailed
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Example:** `GET /upload/all?status=Completed&page=1&limit=10`

**Success Response (200):**
```json
{
  "success": true,
  "count": 10,
  "total": 156,
  "page": 1,
  "pages": 16,
  "data": [
    {
      "_id": "65c7f8e9d4b2a1234567890a",
      "fileName": "transactions.csv",
      "status": "Completed",
      "totalRecords": 50000,
      "matchedRecords": 45000,
      "partiallyMatchedRecords": 3000,
      "unmatchedRecords": 1500,
      "duplicateRecords": 500,
      "createdAt": "2024-02-28T10:00:00.000Z",
      "completedAt": "2024-02-28T10:15:00.000Z",
      "uploadedBy": {
        "name": "Admin User",
        "email": "admin@example.com"
      }
    }
  ]
}
```

---

#### 8. Get Upload Statistics
**Endpoint:** `GET /upload/stats`  
**Access:** Private (Admin only)  
**Description:** Get aggregated statistics for uploads

**Query Parameters:**
- `startDate` (optional)
- `endDate` (optional)

**Success Response (200):**
```json
{
  "success": true,
  "stats": {
    "byStatus": [
      {
        "_id": "Completed",
        "count": 120,
        "totalRecords": 5500000,
        "totalMatched": 4800000,
        "totalPartiallyMatched": 500000,
        "totalUnmatched": 150000,
        "totalDuplicates": 50000
      },
      {
        "_id": "Failed",
        "count": 5,
        "totalRecords": 0
      }
    ],
    "overall": {
      "totalUploads": 156,
      "totalRecords": 7200000,
      "avgRecordsPerUpload": 46153.85
    }
  }
}
```

---

#### 9. Retry Failed Upload
**Endpoint:** `POST /upload/retry/:jobId`  
**Access:** Private (Admin only)  
**Description:** Retry a failed or partially failed upload job

**Success Response (200):**
```json
{
  "success": true,
  "message": "Upload job queued for retry",
  "uploadJobId": "65c7f8e9d4b2a1234567890a",
  "queueJobId": "upload-65c7f8e9d4b2a1234567890a-retry-1"
}
```

---

### 🔄 Reconciliation

#### 10. Get Reconciliation Results
**Endpoint:** `GET /reconciliation/results/:uploadJobId`  
**Access:** Private  
**Description:** Get reconciliation results for a specific upload job

**Query Parameters:**
- `matchStatus` (optional): Matched|Partially Matched|Not Matched|Duplicate|Failed
- `page` (optional)
- `limit` (optional)

**Success Response (200):**
```json
{
  "success": true,
  "count": 50,
  "total": 50000,
  "page": 1,
  "pages": 1000,
  "data": [
    {
      "_id": "65c7f9a1d4b2a1234567890b",
      "uploadJobId": "65c7f8e9d4b2a1234567890a",
      "recordId": "65c7f9a0d4b2a1234567890c",
      "uploadedRecord": {
        "transactionId": "TXN0001",
        "amount": 1500.50,
        "referenceNumber": "REF12345",
        "date": "2024-01-15T00:00:00.000Z"
      },
      "systemRecord": {
        "transactionId": "TXN0001",
        "amount": 1500.50,
        "referenceNumber": "REF12345",
        "date": "2024-01-15T00:00:00.000Z"
      },
      "matchStatus": "Matched",
      "matchedRule": "Exact Match - Transaction ID and Amount",
      "mismatchedFields": [],
      "confidence": 100,
      "createdAt": "2024-02-28T10:05:00.000Z"
    },
    {
      "_id": "65c7f9a2d4b2a1234567890d",
      "matchStatus": "Partially Matched",
      "matchedRule": "Partial Match - 2% Amount Variance",
      "mismatchedFields": [
        {
          "field": "amount",
          "systemValue": 1500,
          "uploadedValue": 1530,
          "variance": "2.0%"
        }
      ],
      "confidence": 90
    }
  ]
}
```

---

#### 11. Get Reconciliation Summary
**Endpoint:** `GET /reconciliation/summary/:uploadJobId`  
**Access:** Private  
**Description:** Get summary statistics for reconciliation results

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "uploadJobId": "65c7f8e9d4b2a1234567890a",
    "summary": {
      "totalRecords": 50000,
      "matched": 45000,
      "partiallyMatched": 3000,
      "unmatched": 1500,
      "duplicate": 500,
      "failed": 0
    },
    "matchRate": 90.0,
    "duplicateRate": 1.0
  }
}
```

---

#### 12. Manual Correction
**Endpoint:** `PUT /reconciliation/correct/:resultId`  
**Access:** Private (Admin, Analyst)  
**Description:** Manually correct a reconciliation result

**Request Body:**
```json
{
  "correctedData": {
    "amount": 1500.00
  },
  "reason": "Corrected decimal error"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Record corrected successfully",
  "data": {
    "recordId": "65c7f9a0d4b2a1234567890c",
    "oldValue": { "amount": 1530 },
    "newValue": { "amount": 1500 },
    "correctedBy": "507f1f77bcf86cd799439011"
  }
}
```

---

#### 13. Reprocess Upload
**Endpoint:** `POST /reconciliation/reprocess/:uploadJobId`  
**Access:** Private (Admin only)  
**Description:** Reprocess an upload with updated rules

**Success Response (200):**
```json
{
  "success": true,
  "message": "Upload queued for reprocessing",
  "newJobId": "65c7fabed4b2a1234567890e"
}
```

---

### 🔧 Matching Rules

#### 14. Get All Matching Rules
**Endpoint:** `GET /rules`  
**Access:** Private  
**Description:** Get all matching rules

**Query Parameters:**
- `enabled` (optional): true|false
- `ruleType` (optional): EXACT_MATCH|PARTIAL_MATCH|REFERENCE_MATCH

**Success Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "65c7fb12d4b2a1234567890f",
      "ruleName": "Exact Match - Transaction ID and Amount",
      "description": "Matches records with identical transaction ID and amount",
      "ruleType": "EXACT_MATCH",
      "priority": 100,
      "enabled": true,
      "exactMatchFields": ["transactionId", "amount"],
      "createdBy": {
        "name": "System",
        "email": "system@example.com"
      },
      "createdAt": "2024-02-28T00:00:00.000Z",
      "updatedAt": "2024-02-28T00:00:00.000Z"
    }
  ]
}
```

---

#### 15. Get Single Rule
**Endpoint:** `GET /rules/:id`  
**Access:** Private  
**Description:** Get details of a specific matching rule

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "65c7fb12d4b2a1234567890f",
    "ruleName": "Partial Match - 2% Amount Variance",
    "ruleType": "PARTIAL_MATCH",
    "priority": 80,
    "enabled": true,
    "partialMatchConfig": {
      "amountVariancePercent": 2,
      "dateVarianceDays": 0,
      "requiredFields": ["referenceNumber"]
    }
  }
}
```

---

#### 16. Create Matching Rule
**Endpoint:** `POST /rules`  
**Access:** Private (Admin only)  
**Description:** Create a new matching rule

**Request Body:**
```json
{
  "ruleName": "Custom Tolerance Rule",
  "description": "5% variance for weekend transactions",
  "ruleType": "PARTIAL_MATCH",
  "priority": 75,
  "enabled": true,
  "partialMatchConfig": {
    "amountVariancePercent": 5,
    "dateVarianceDays": 1,
    "requiredFields": ["referenceNumber"]
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Matching rule created successfully",
  "data": {
    "_id": "65c7fc34d4b2a1234567891a",
    "ruleName": "Custom Tolerance Rule",
    "ruleType": "PARTIAL_MATCH",
    "priority": 75,
    "enabled": true
  }
}
```

---

#### 17. Update Matching Rule
**Endpoint:** `PUT /rules/:id`  
**Access:** Private (Admin only)  
**Description:** Update an existing matching rule

**Request Body:**
```json
{
  "priority": 85,
  "partialMatchConfig": {
    "amountVariancePercent": 3
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Matching rule updated successfully",
  "data": {
    "_id": "65c7fc34d4b2a1234567891a",
    "priority": 85
  }
}
```

---

#### 18. Delete Matching Rule
**Endpoint:** `DELETE /rules/:id`  
**Access:** Private (Admin only)  
**Description:** Delete a matching rule

**Success Response (200):**
```json
{
  "success": true,
  "message": "Matching rule deleted successfully"
}
```

---

#### 19. Toggle Rule Status
**Endpoint:** `PATCH /rules/:id/toggle`  
**Access:** Private (Admin only)  
**Description:** Enable or disable a matching rule

**Success Response (200):**
```json
{
  "success": true,
  "message": "Rule enabled successfully",
  "data": {
    "_id": "65c7fc34d4b2a1234567891a",
    "enabled": true
  }
}
```

---

#### 20. Reorder Rules
**Endpoint:** `PUT /rules/reorder`  
**Access:** Private (Admin only)  
**Description:** Update priorities of multiple rules

**Request Body:**
```json
{
  "ruleOrders": [
    { "id": "65c7fc34d4b2a1234567891a", "priority": 100 },
    { "id": "65c7fc35d4b2a1234567891b", "priority": 90 },
    { "id": "65c7fc36d4b2a1234567891c", "priority": 80 }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Rules reordered successfully"
}
```

---

### 📋 Audit Logs

#### 21. Get Audit Logs
**Endpoint:** `GET /audit/logs`  
**Access:** Private  
**Description:** Get audit logs with filtering

**Query Parameters:**
- `startDate` (optional)
- `endDate` (optional)
- `action` (optional): CREATE|UPDATE|DELETE|RECONCILE|UPLOAD|MANUAL_CORRECTION
- `entityType` (optional): Record|UploadJob|ReconciliationResult
- `userId` (optional): Filter by user ID
- `page` (optional)
- `limit` (optional)

**Success Response (200):**
```json
{
  "success": true,
  "count": 50,
  "total": 15000,
  "page": 1,
  "pages": 300,
  "data": [
    {
      "_id": "65c7fd88d4b2a1234567891d",
      "action": "UPLOAD",
      "entityType": "UploadJob",
      "newValue": {
        "fileName": "transactions.csv",
        "totalRecords": 50000
      },
      "changedBy": {
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "source": "SYSTEM",
      "timestamp": "2024-02-28T10:00:00.000Z",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0..."
    }
  ]
}
```

---

#### 22. Get Audit Timeline for Record
**Endpoint:** `GET /audit/timeline/:recordId`  
**Access:** Private  
**Description:** Get chronological audit trail for a specific record

**Success Response (200):**
```json
{
  "success": true,
  "recordId": "65c7f9a0d4b2a1234567890c",
  "timeline": [
    {
      "timestamp": "2024-02-28T10:05:00.000Z",
      "action": "CREATE",
      "user": "Admin User",
      "details": "Record created during upload"
    },
    {
      "timestamp": "2024-02-28T10:06:00.000Z",
      "action": "RECONCILE",
      "user": "System",
      "details": "Matched with status: Matched"
    },
    {
      "timestamp": "2024-02-28T11:30:00.000Z",
      "action": "MANUAL_CORRECTION",
      "user": "Analyst User",
      "details": "Amount corrected from 1530 to 1500"
    }
  ]
}
```

---

#### 23. Export Audit Logs
**Endpoint:** `GET /audit/export`  
**Access:** Private (Admin only)  
**Description:** Export audit logs as CSV

**Query Parameters:** (same as Get Audit Logs)

**Success Response (200):**
```csv
Content-Type: text/csv
Content-Disposition: attachment; filename="audit-logs-2024-02-28.csv"

Timestamp,Action,Entity Type,User,IP Address,Details
2024-02-28T10:00:00Z,UPLOAD,UploadJob,admin@example.com,192.168.1.100,File uploaded
...
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created |
| 202 | Accepted | Async request accepted |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Rate Limiting

Upload endpoints are rate-limited:
- **File uploads**: 20 per minute per user
- **API requests**: 100 per minute per user

Rate limit response:
```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "retryAfter": 45
}
```

---

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)

**Response includes:**
```json
{
  "count": 50,
  "total": 5000,
  "page": 1,
  "pages": 100,
  "data": [...]
}
```

---

## WebSocket Events (Socket.IO)

Connect to: `ws://localhost:5000`

**Client Events:**
```javascript
socket.on('connect', () => {
  // Authenticate
  socket.emit('authenticate', { token: 'your_jwt_token' });
});

// Subscribe to upload job updates
socket.emit('subscribe-upload', { uploadJobId: '65c7f8e9d4b2a1234567890a' });
```

**Server Events:**
```javascript
// Upload progress update
socket.on('upload-progress', (data) => {
  console.log(data);
  // {
  //   uploadJobId: '65c7f8e9d4b2a1234567890a',
  //   status: 'Processing',
  //   progressPercent: 45,
  //   processedRecords: 22500,
  //   totalRecords: 50000
  // }
});

// Upload completed
socket.on('upload-completed', (data) => {
  console.log(data);
  // {
  //   uploadJobId: '65c7f8e9d4b2a1234567890a',
  //   status: 'Completed',
  //   statistics: { ... }
  // }
});
```

---

## Example Workflows

### Complete Upload Flow

```javascript
// 1. Upload file for preview
const preview = await fetch('/api/upload/preview', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
  body: formData
}).then(r => r.json());

// 2. Submit with column mapping
const submission = await fetch('/api/upload/submit', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tempFilePath: preview.tempFilePath,
    columnMapping: {
      transactionId: 'Transaction ID',
      amount: 'Amount',
      referenceNumber: 'Ref Number',
      date: 'Date'
    }
  })
}).then(r => r.json());

// 3. Poll for status or subscribe via WebSocket
const checkStatus = async () => {
  const status = await fetch(`/api/upload/status/${submission.uploadJobId}`, {
    headers: { 'Authorization': 'Bearer ' + token }
  }).then(r => r.json());
  
  if (status.data.status === 'Completed') {
    // Get results
    const results = await fetch(`/api/reconciliation/results/${submission.uploadJobId}`, {
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(r => r.json());
  }
};
```

---

**API Version**: 2.0.0  
**Last Updated**: February 2026
