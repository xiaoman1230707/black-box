import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt', () => ({
  compare: () => Promise.resolve(true),
}));

describe('AuthService', () => {
  it('returns a numeric user id while keeping JWT generation internal', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 25,
          name: 'p6-user',
          password: 'hash',
          avatars: [],
        }),
      },
    } as unknown as PrismaService;
    const jwt = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
    } as unknown as JwtService;
    const result = await new AuthService(prisma, jwt).login({
      name: 'p6-user',
      password: 'Password123',
    });

    expect(result.user.id).toBe(25);
    expect(typeof result.user.id).toBe('number');
  });
});
