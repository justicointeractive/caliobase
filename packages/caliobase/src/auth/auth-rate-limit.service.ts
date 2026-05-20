import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { createHash } from 'crypto';

export const AuthRateLimitOptionsToken = Symbol('AuthRateLimitOptions');

export type AuthRateLimitOperation =
  | 'passwordLogin'
  | 'otpRequest'
  | 'otpLogin'
  | 'passwordResetRequest'
  | 'passwordResetToken'
  | 'machineTokenExchange'
  | 'machineOidcExchange'
  | 'socialValidate';

export type AuthRateLimitRule = {
  limit: number;
  windowMs: number;
};

export type AuthRateLimitOptions =
  | false
  | Partial<Record<AuthRateLimitOperation, Partial<AuthRateLimitRule> | false>>;

const DEFAULT_RATE_LIMITS: Record<AuthRateLimitOperation, AuthRateLimitRule> = {
  passwordLogin: { limit: 5, windowMs: 15 * 60 * 1000 },
  otpRequest: { limit: 3, windowMs: 15 * 60 * 1000 },
  otpLogin: { limit: 5, windowMs: 15 * 60 * 1000 },
  passwordResetRequest: { limit: 3, windowMs: 15 * 60 * 1000 },
  passwordResetToken: { limit: 5, windowMs: 15 * 60 * 1000 },
  machineTokenExchange: { limit: 30, windowMs: 60 * 1000 },
  machineOidcExchange: { limit: 30, windowMs: 60 * 1000 },
  socialValidate: { limit: 10, windowMs: 5 * 60 * 1000 },
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class AuthRateLimitService {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private pruneCounter = 0;

  constructor(
    @Optional()
    @Inject(AuthRateLimitOptionsToken)
    private readonly options?: AuthRateLimitOptions
  ) {}

  async consume(
    operation: AuthRateLimitOperation,
    identity: string
  ): Promise<void> {
    const rule = this.getRule(operation);
    if (!rule || !identity) {
      return;
    }

    const now = Date.now();
    this.pruneExpiredBucketsOccasionally(now);
    const key = this.keyFor(operation, identity);
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
      return;
    }

    bucket.count += 1;

    if (bucket.count > rule.limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many authentication attempts. Please try again later.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  private getRule(operation: AuthRateLimitOperation) {
    if (this.options === false) {
      return null;
    }

    const override = this.options?.[operation];
    if (override === false) {
      return null;
    }

    return {
      ...DEFAULT_RATE_LIMITS[operation],
      ...(override ?? {}),
    };
  }

  private pruneExpiredBucketsOccasionally(now: number) {
    this.pruneCounter = (this.pruneCounter + 1) % 256;
    if (this.pruneCounter !== 0) {
      return;
    }

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }

  private keyFor(operation: AuthRateLimitOperation, identity: string) {
    return createHash('sha256')
      .update(operation)
      .update(':')
      .update(identity)
      .digest('hex');
  }
}
