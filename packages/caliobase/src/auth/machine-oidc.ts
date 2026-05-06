import { Issuer } from 'openid-client';
import {
  createLocalJWKSet,
  createRemoteJWKSet,
  decodeJwt,
  JSONWebKeySet,
  jwtVerify,
  JWTPayload,
} from 'jose';

export const MachineOidcIssuersToken = Symbol('MachineOidcIssuers');

export type MachineOidcSubjectBinding = {
  /** Exact value from the configured subject claim. Defaults to the JWT `sub` claim. */
  subject: string;
  /** Existing Caliobase machine/user id to impersonate after OIDC verification. */
  userId: string;
  /** Existing Caliobase organization id to scope the issued Caliobase JWT. */
  organizationId: string;
  /** Human-readable label returned in exchange responses. */
  name?: string;
};

export type MachineOidcIssuer = {
  /** Optional stable label for logs/responses. */
  name?: string;
  /** Expected OIDC issuer (`iss`). */
  issuer: string;
  /** Expected audience (`aud`) for incoming machine OIDC JWTs. */
  audience: string | string[];
  /** Optional explicit JWKS URI. If omitted, OIDC discovery is used. */
  jwksUri?: string;
  /** Optional static JWKS, useful for tests or private issuers without discovery. */
  jwks?: JSONWebKeySet;
  /** Claim used to select a subject binding. Defaults to `sub`. */
  subjectClaim?: string;
  /** Exact subject bindings allowed to mint Caliobase JWTs. */
  subjects: MachineOidcSubjectBinding[];
};

export type MachineOidcIdentitySummary = {
  id: string;
  name: string;
  issuer: string;
  subject: string;
  audience: string | string[];
  organizationId: string;
  userId: string;
};

type KeySet = ReturnType<typeof createRemoteJWKSet>;

export class MachineOidcVerifier {
  private readonly jwksUriCache = new Map<string, Promise<string>>();
  private readonly keySetCache = new Map<string, KeySet>();
  private readonly staticKeySetCache = new WeakMap<MachineOidcIssuer, KeySet>();

  constructor(private readonly issuers: MachineOidcIssuer[]) {}

  async verify(token: string) {
    const unverifiedPayload = decodeJwt(token);
    const issuerValue = getStringClaim(unverifiedPayload, 'iss');

    if (!issuerValue) {
      throw new Error('OIDC token missing issuer');
    }

    const issuer = this.issuers.find(
      (candidate) => candidate.issuer === issuerValue
    );

    if (!issuer) {
      throw new Error('OIDC issuer is not trusted');
    }

    const { payload } = await jwtVerify(token, await this.getKeySet(issuer), {
      issuer: issuer.issuer,
      audience: issuer.audience,
    });

    const subjectClaim = issuer.subjectClaim ?? 'sub';
    const subject = getStringClaim(payload, subjectClaim);

    if (!subject) {
      throw new Error(`OIDC token missing '${subjectClaim}' claim`);
    }

    const binding = issuer.subjects.find(
      (candidate) => candidate.subject === subject
    );

    if (!binding) {
      throw new Error('OIDC subject is not allowed');
    }

    return { issuer, payload, subject, binding };
  }

  private async getKeySet(issuer: MachineOidcIssuer): Promise<KeySet> {
    if (issuer.jwks) {
      const cached = this.staticKeySetCache.get(issuer);
      if (cached) {
        return cached;
      }

      const keySet = createLocalJWKSet(issuer.jwks);
      this.staticKeySetCache.set(issuer, keySet);
      return keySet;
    }

    const jwksUri = await this.getJwksUri(issuer);
    const cached = this.keySetCache.get(jwksUri);
    if (cached) {
      return cached;
    }

    const keySet = createRemoteJWKSet(new URL(jwksUri));
    this.keySetCache.set(jwksUri, keySet);
    return keySet;
  }

  private async getJwksUri(issuer: MachineOidcIssuer) {
    if (issuer.jwksUri) {
      return issuer.jwksUri;
    }

    let discovery = this.jwksUriCache.get(issuer.issuer);
    if (!discovery) {
      discovery = Issuer.discover(issuer.issuer).then((discoveredIssuer) => {
        const jwksUri = discoveredIssuer.metadata.jwks_uri;
        if (!jwksUri) {
          throw new Error('OIDC issuer discovery did not include jwks_uri');
        }
        return jwksUri;
      });
      this.jwksUriCache.set(issuer.issuer, discovery);
    }

    return discovery;
  }
}

export function createMachineOidcIdentitySummary(input: {
  issuer: MachineOidcIssuer;
  subject: string;
  binding: MachineOidcSubjectBinding;
}): MachineOidcIdentitySummary {
  const issuerName = input.issuer.name ?? input.issuer.issuer;
  return {
    id: `oidc:${issuerName}:${input.subject}`,
    name: input.binding.name ?? input.subject,
    issuer: input.issuer.issuer,
    subject: input.subject,
    audience: input.issuer.audience,
    organizationId: input.binding.organizationId,
    userId: input.binding.userId,
  };
}

function getStringClaim(payload: JWTPayload, key: string) {
  const value = payload[key];
  return typeof value === 'string' ? value : null;
}
