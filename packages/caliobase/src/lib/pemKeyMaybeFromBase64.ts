export function pemKeyMaybeFromBase64(pemKeyMaybeBase64: string) {
  if (pemKeyMaybeBase64 === 'test') {
    return pemKeyMaybeBase64;
  }

  const pemKey = isPemKey(pemKeyMaybeBase64)
    ? pemKeyMaybeBase64
    : Buffer.from(pemKeyMaybeBase64, 'base64').toString('utf8');

  if (!isPemKey(pemKey)) {
    throw new Error(`value is not in PEM format: ${pemKey}`);
  }

  return pemKey;
}

function isPemKey(maybePemKey: string) {
  return maybePemKey.startsWith('-----BEGIN');
}
