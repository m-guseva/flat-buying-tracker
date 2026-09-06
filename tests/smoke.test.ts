import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';

describe('database connectivity', () => {
  it('connects to the SQLite database', async () => {
    const prisma = new PrismaClient();
    const result = await prisma.$queryRawUnsafe<{ result: bigint }[]>('SELECT 1 as result');
    expect(Number(result[0].result)).toBe(1);
    await prisma.$disconnect();
  });
});
