#!/bin/bash
set -e

# Fetch tags and run tests/build
git fetch --all --tags
npm run test
npm run build

# Version bump
nx release version patch

# Rebuild with new versions
npm run build

# Prompt for OTP
echo ""
echo "Ready to publish to npm."
read -p "Enter your npm OTP code: " OTP

if [ -z "$OTP" ]; then
  echo "Error: OTP is required"
  exit 1
fi

# Publish with OTP
nx release publish patch --otp="$OTP"

# Push tags
git push --follow-tags
