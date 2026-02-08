# System Architecture Documentation

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │         React SPA (Vite + TailwindCSS)                  │    │
│  │  - Dashboard  - Upload  - Reconciliation  - Audit       │    │
│  │  - Role-based UI  - Real-time updates (Socket.IO)      │    │
│  └─────────────────────────────────────────────────────────┘    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS/WSS
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           Express.js Server + Socket.IO                  │    │
│  │                                                           │    │
│  │  ┌───────────┐  ┌──────────┐  ┌────────────┐           │    │
│  │  │   Auth    │  │  Upload  │  │Reconcile   │           │    │
│  │  │Middleware │  │Controller│  │Controller  │           │    │
│  │  └───────────┘  └──────────┘  └────────────┘           │    │
│  │                                                           │    │
│  │  ┌───────────┐  ┌──────────┐  ┌────────────┐           │    │
│  │  │   Rules   │  │  Audit   │  │   Error    │           │    │
│  │  │Controller │  │Controller│  │  Handler   │           │    │
│  │  └───────────┘  └──────────┘  └────────────┘           │    │
│  └─────────────────────────────────────────────────────────┘    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                     QUEUE & WORKER LAYER                          │
│  ┌─────────────────┐              ┌────────────────────┐         │
│  │   Bull Queue    │◄────────────►│  Worker Process    │         │
│  │   (Redis)       │              │                    │         │
│  │                 │              │ - File Processing  │         │
│  │ Job Types:      │              │ - Reconciliation   │         │
│  │ • File Upload   │              │ - Error Recovery   │         │
│  │ • Reconciliation│              │ - Progress Tracking│         │
│  └─────────────────┘              └────────────────────┘         │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                                │
│  ┌──────────────────┐  ┌────────────────────┐                   │
│  │ File Processing  │  │ Reconciliation V2  │                   │
│  │ Service          │  │ Service            │                   │
│  │                  │  │                    │                   │
│  │ • CSV/Excel      │  │ • Rule Engine      │                   │
│  │ • File Hash      │  │ • Match Detection  │                   │
│  │ • Validation     │  │ • Duplicate Check  │                   │
│  │ • Batch Process  │  │ • Error Handling   │                   │
│  └──────────────────┘  └────────────────────┘                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                     DATA PERSISTENCE LAYER                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              MongoDB (Document Database)             │        │
│  │                                                       │        │
│  │  Collections:                                         │        │
│  │  • users              (Authentication)                │        │
│  │  • uploadjobs         (Job Tracking)                  │        │
│  │  • records            (Transaction Data)              │        │
│  │  • reconciliationresults (Match Results)              │        │
│  │  • auditlogs          (Immutable Audit Trail)         │        │
│  │  • matchingrules      (Configurable Rules)            │        │
│  │                                                       │        │
│  │  Indexes:                                             │        │
│  │  • Compound indexes for performance                   │        │
│  │  • Unique constraints                                 │        │
│  │  • Text indexes for search                            │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              Redis (Queue & Cache)                   │        │
│  │                                                       │        │
│  │  • Bull queue jobs                                    │        │
│  │  • Job progress tracking                              │        │
│  │  • Failed job retry queue                             │        │
│  │  • Session cache (future)                             │        │
│  └─────────────────────────────────────────────────────┘        │
└────────────────────────────────────────────────────────────────-─┘
```

## Request Flow Diagrams

### 1. File Upload Flow

```
User → Frontend → Backend → Queue → Worker → Database
 │         │          │        │       │         │
 │         │          │        │       │         │
 1. Click  2. POST   3. Hash  4. Add  5. Process 6. Save
 Upload    /upload   file     to     file      results
           /preview           queue   async
```

### 2. Reconciliation Flow

```
Worker Process
     │
     ├─ Load Rules from DB (cached)
     │
     ├─ For each record:
     │   │
     │   ├─ Check for duplicates
     │   │   • Within upload
     │   │   • Across all uploads
     │   │
     │   ├─ Apply matching rules (priority order)
     │   │   1. EXACT_MATCH
     │   │   2. PARTIAL_MATCH
     │   │   3. REFERENCE_MATCH
     │   │
     │   ├─ Create ReconciliationResult
     │   │
     │   └─ Create AuditLog
     │
     └─ Update UploadJob statistics
```

### 3. Authentication & Authorization Flow

```
Client Request
     │
     ▼
┌─────────────┐
│ auth        │ Verify JWT Token
│ middleware  │ Load User from DB
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ authorize   │ Check user role
│ middleware  │ Verify permissions
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Controller  │ Execute business logic
│ Handler     │
└─────────────┘
```

## Data Flow

### Upload Processing Data Flow

```
1. File Upload
   ├─ Calculate SHA-256 hash → Check idempotency
   ├─ Create UploadJob (status: Pending)
   ├─ Add to Bull queue
   └─ Return 202 Accepted

2. Worker Processing
   ├─ Start MongoDB transaction
   ├─ Update status → Processing
   ├─ Parse CSV/Excel
   ├─ Validate & map columns
   ├─ Insert records in batches
   │   ├─ Batch size: 1000
   │   ├─ Track failures per row
   │   └─ Yield to event loop per batch
   ├─ Run reconciliation
   ├─ Update statistics
   ├─ Commit transaction
   └─ Update status → Completed/Failed/PartiallyFailed

3. Real-time Updates
   ├─ Worker emits progress via Socket.IO
   ├─ Frontend receives updates
   └─ UI updates progress bar & status
```

## Security Architecture

```
┌─────────────────────────────────────────────────┐
│             Security Layers                      │
├─────────────────────────────────────────────────┤
│ 1. Transport: HTTPS/TLS                         │
│ 2. Authentication: JWT with expiry              │
│ 3. Authorization: Role-based middleware         │
│ 4. Input Validation: Schema validation          │
│ 5. Rate Limiting: Per-user API throttling       │
│ 6. File Validation: Type & size checks          │
│ 7. SQL Injection: NoSQL query sanitization      │
│ 8. Audit Logging: Immutable audit trail         │
│ 9. Error Handling: No sensitive data leakage    │
└─────────────────────────────────────────────────┘
```

## Scalability Architecture

### Horizontal Scaling

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐         ┌─────────┐       ┌─────────┐
    │ Server  │         │ Server  │       │Server   │
    │Instance1│         │Instance2│  ...  │Instance │
    └────┬────┘         └────┬────┘       └────┬────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                     ┌───────▼────────┐
                     │  Redis Queue   │
                     └───────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐         ┌─────────┐       ┌─────────┐
    │ Worker  │         │ Worker  │       │Worker   │
    │Instance1│         │Instance2│  ...  │Instance │
    └────┬────┘         └────┬────┘       └────┬────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                     ┌───────▼────────┐
                     │MongoDB Cluster │
                     │ (Replica Set)  │
                     └────────────────┘
```

### Vertical Scaling Recommendations

- **Server**: 4-8 GB RAM, 2-4 CPUs
- **Worker**: 8-16 GB RAM, 4-8 CPUs
- **MongoDB**: 16+ GB RAM, SSD storage
- **Redis**: 4-8 GB RAM

## Database Schema Design Principles

### 1. Indexing Strategy
- Compound indexes on frequently queried field combinations
- Index on foreign keys for joins
- Index on status fields for filtering
- Text indexes for search functionality

### 2. Data Integrity
- Required fields enforced at schema level
- Immutable timestamps on audit logs
- Schema-level validation for enums
- Unique constraints on critical fields

### 3. Performance Optimizations
- Batch inserts for bulk data
- MongoDB transactions for atomicity
- Pagination for large result sets
- Aggregation pipelines for analytics

## Error Handling Architecture

```
Error Occurs
    │
    ▼
Custom Error Class
    │
    ├─ ValidationError (400)
    ├─ AuthenticationError (401)
    ├─ AuthorizationError (403)
    ├─ NotFoundError (404)
    ├─ ConflictError (409)
    └─ DatabaseError (500)
    │
    ▼
Central Error Handler
    │
    ├─ Log error details
    ├─ Format error response
    ├─ Hide stack trace in production
    └─ Send JSON response
```

## Audit Trail Architecture

### Immutability Enforcement

```
┌────────────────────────────────────┐
│        AuditLog Model              │
├────────────────────────────────────┤
│ • timestamp: immutable: true       │
│ • Pre-save hooks prevent updates   │
│ • No update/delete routes exposed  │
│ • Database-level constraints       │
└────────────────────────────────────┘

Every action logged:
• CREATE    - Record creation
• UPDATE    - Record modification
• DELETE    - Record deletion
• RECONCILE - Reconciliation performed
• UPLOAD    - File uploaded
• MANUAL_CORRECTION - Manual edit
• UNAUTHORIZED_ACCESS_ATTEMPT
```

## Monitoring & Observability

### Metrics to Track

1. **Performance Metrics**
   - API response times
   - Queue job processing time
   - Database query performance
   - File upload/processing duration

2. **Business Metrics**
   - Records processed per day
   - Match rate statistics
   - Duplicate detection rate
   - Failed uploads count

3. **System Health**
   - CPU/Memory usage
   - Queue length
   - Database connections
   - Redis memory usage

### Logging Strategy

```
Development:
- Console logs with timestamps
- Detailed error stack traces
- Request/response logging

Production:
- File-based logs (PM2)
- Error-only logging
- Structured JSON logs
- Log rotation
- External monitoring (DataDog, New Relic)
```

## Deployment Architecture

### Production Setup

```
┌──────────────────────────────────────────────┐
│              Nginx Reverse Proxy              │
│  • SSL Termination                            │
│  • Load Balancing                             │
│  • Static file serving                        │
└────────────────┬─────────────────────────────┘
                 │
        ┌────────┴────────┐
        │    PM2 Cluster  │
        │  • Server (x2)  │
        │  • Worker (x1)  │
        └─────────────────┘

External Services:
• MongoDB Atlas (managed)
• Redis Labs (managed)
• CloudFlare (CDN)
• AWS S3 (file storage - future)
```

## Performance Benchmarks

### Expected Performance (Single Instance)

| Metric | Value |
|--------|-------|
| API Response Time | < 200ms (p95) |
| File Upload Processing | 50k records in 2-5 min |
| Concurrent Uploads | 10 |
| Reconciliation Speed | ~300 records/sec |
| Database Queries | < 50ms (indexed) |
| Queue Throughput | 100 jobs/min |

### Optimization Techniques Used

1. **Batch Processing** - 1000 records per batch
2. **Async I/O** - Non-blocking file operations
3. **Database Indexes** - Compound indexes
4. **Connection Pooling** - MongoDB connection pool
5. **Queue System** - Offload heavy processing
6. **Caching** - Rules cache with TTL
7. **Pagination** - Prevent large data transfers

---

## Future Enhancements

1. **Fuzzy Matching** - Implement Levenshtein distance
2. **Multi-tenancy** - Organization-based data isolation
3. **Advanced Analytics** - ML-based anomaly detection
4. **Export Functionality** - PDF/Excel reports
5. **Email Notifications** - Job completion alerts
6. **S3 Integration** - Cloud file storage
7. **GraphQL API** - Alternative to REST
8. **Real-time Collaboration** - Multi-user reconciliation

---

**Document Version**: 2.0.0  
**Last Updated**: February 2026
