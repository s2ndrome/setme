import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL (or POSTGRES_URL) 환경변수가 설정되지 않았습니다.');
}

// neon()'s tagged-template query resolves directly to an array of rows
// (no .rows/.rowCount wrapper like node-postgres/@vercel/postgres).
export const sql = neon(connectionString);
