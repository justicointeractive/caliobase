import { HttpException, HttpStatus } from '@nestjs/common';
import { AuthRateLimitService } from './auth-rate-limit.service';

describe('auth rate limit service', () => {
  it('throws 429 after the configured operation limit is exceeded', async () => {
    const service = new AuthRateLimitService({
      passwordLogin: { limit: 2, windowMs: 60_000 },
    });

    await service.consume('passwordLogin', 'USER@example.org');
    await service.consume('passwordLogin', 'USER@example.org');

    await expect(
      service.consume('passwordLogin', 'USER@example.org')
    ).rejects.toThrow(HttpException);

    try {
      await service.consume('passwordLogin', 'USER@example.org');
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS
      );
      return;
    }

    throw new Error('expected auth rate limit to reject the request');
  });

  it('can disable a specific operation', async () => {
    const service = new AuthRateLimitService({
      passwordLogin: false,
    });

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await expect(
        service.consume('passwordLogin', 'user@example.org')
      ).resolves.toBeUndefined();
    }
  });
});
