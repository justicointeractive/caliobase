#!/usr/bin/env bash
set -euo pipefail

RELEASE_SPECIFIER="patch"
PREID=""
DRY_RUN="false"

usage() {
  cat <<'USAGE'
Usage: npm run release -- [patch|minor|major|prerelease|<version>] [--preid <id>] [--dry-run]

Runs the caliobase Nx release flow:
  1. fetch tags
  2. test
  3. build
  4. version/changelog/tag packages
  5. rebuild
  6. publish to npm
  7. push commits/tags

Local releases prompt for npm OTP unless NPM_OTP is set.
CI releases use npm trusted publishing via GitHub Actions OIDC.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --preid)
      PREID="${2:-}"
      if [[ -z "$PREID" ]]; then
        echo "Error: --preid requires a value" >&2
        exit 1
      fi
      shift 2
      ;;
    --preid=*)
      PREID="${1#*=}"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    patch|minor|major|prerelease|prepatch|preminor|premajor)
      RELEASE_SPECIFIER="$1"
      shift
      ;;
    *)
      if [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
        RELEASE_SPECIFIER="$1"
        shift
      else
        echo "Error: unknown release argument '$1'" >&2
        usage >&2
        exit 1
      fi
      ;;
  esac
done

NX_VERSION_ARGS=("$RELEASE_SPECIFIER")
NX_PUBLISH_ARGS=()

if [[ -n "$PREID" ]]; then
  NX_VERSION_ARGS+=("--preid" "$PREID")
fi

if [[ "$DRY_RUN" == "true" ]]; then
  NX_VERSION_ARGS+=("--dry-run")
  NX_PUBLISH_ARGS+=("--dry-run")
fi

# Fetch tags and run tests/build
git fetch --all --tags
npm run test
npm run build

# Version bump / changelog / tags
npx nx release version "${NX_VERSION_ARGS[@]}"

# Rebuild with new versions
npm run build

if [[ "$DRY_RUN" == "true" ]]; then
  echo "Dry run complete; skipping npm publish and git push."
  exit 0
fi

if [[ "${CI:-}" != "true" ]]; then
  if [[ -z "${NPM_OTP:-}" ]]; then
    echo ""
    echo "Ready to publish to npm."
    read -r -p "Enter your npm OTP code: " NPM_OTP
  fi

  if [[ -z "${NPM_OTP:-}" ]]; then
    echo "Error: OTP is required for local releases." >&2
    exit 1
  fi
fi

if [[ -n "${NPM_OTP:-}" ]]; then
  NX_PUBLISH_ARGS+=("--otp=$NPM_OTP")
fi

# Publish to npm
npx nx release publish "${NX_PUBLISH_ARGS[@]}"

# Push release commits/tags
git push --follow-tags
