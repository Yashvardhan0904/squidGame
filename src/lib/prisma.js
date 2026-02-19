import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis;

if (!globalForPrisma.prisma) {
  // Configure connection pool for high concurrency (100+ users)
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    // Pool configuration for production load
    max: 20,                    // Maximum 20 connections in the pool
    min: 2,                     // Keep at least 2 connections ready
    idleTimeoutMillis: 30000,   // Close idle connections after 30s
    connectionTimeoutMillis: 10000, // Wait max 10s for a connection
    maxUses: 7500,              // Close connection after 7500 queries (prevents memory leaks)
  });

  // Log pool errors (don't crash the app)
  pool.on('error', (err) => {
    console.error('[Pool] Unexpected error on idle client:', err);
  });

  const adapter = new PrismaPg(pool);
  globalForPrisma.prisma = new PrismaClient({ 
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

const prisma = globalForPrisma.prisma;

export default prisma;
