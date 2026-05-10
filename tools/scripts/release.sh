#!/usr/bin/env bash
set -euo pipefail

RELEASE_SPECIFIER="patch"
PREID=""
DRY_RUN="false"
MODE="prepare"

usage() {
  cat <<'USAGE'
Usage: npm run release -- [prepare|publish|tag] [patch|minor|major|prerelease|prepatch|preminor|premajor|<version>] [--preid <id>|--preid=<id>] [--dry-run]

Modes:
  prepare  Run tests/builds and create the release version-bump commit for a PR.
           This does not publish to npm and does not push to main.
  publish  Build and publish package versions that do not already exist on npm.
           CI publishing uses npm trusted publishing via GitHub Actions OIDC.
  tag      Create any missing release git tags for the versions on disk.
           This does not publish to npm.

Default mode is prepare.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    prepare|publish|tag)
      MODE="$1"
      shift
      ;;
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

NX_VERSION_ARGS=("$RELEASE_SPECIFIER" "--git-tag=false" "--git-push=false")
NX_PUBLISH_ARGS=("--outputStyle=static")

if [[ -n "$PREID" ]]; then
  NX_VERSION_ARGS+=("--preid" "$PREID")
fi

if [[ "$DRY_RUN" == "true" ]]; then
  NX_VERSION_ARGS+=("--dry-run")
  NX_PUBLISH_ARGS+=("--dry-run")
fi

release_project_specs() {
  node <<'NODE'
const { readdirSync, readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

for (const dirent of readdirSync('packages', { withFileTypes: true })) {
  if (!dirent.isDirectory()) continue;
  const packageJsonPath = join('packages', dirent.name, 'package.json');
  const projectJsonPath = join('packages', dirent.name, 'project.json');
  if (!existsSync(packageJsonPath) || !existsSync(projectJsonPath)) continue;

  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const project = JSON.parse(readFileSync(projectJsonPath, 'utf8'));
  if (!pkg.name || !pkg.version || pkg.private) continue;

  console.log(`${project.name || dirent.name}\t${pkg.name}\t${pkg.version}`);
}
NODE
}

publish_missing_versions() {
  local missing_projects=()
  local project package_name version spec view_output

  while IFS=$'\t' read -r project package_name version; do
    spec="${package_name}@${version}"
    if view_output=$(npm view "$spec" version --json 2>&1); then
      echo "Already published: $spec" >&2
      continue
    fi

    if [[ "$view_output" != *"E404"* ]]; then
      echo "$view_output" >&2
      exit 1
    fi

    echo "Will publish: $spec" >&2
    missing_projects+=("$project")
  done < <(release_project_specs)

  if [[ "${#missing_projects[@]}" -eq 0 ]]; then
    echo "All workspace package versions already exist on npm; nothing to publish."
    return 0
  fi

  local projects_csv
  projects_csv=$(IFS=,; echo "${missing_projects[*]}")
  npx nx release publish --projects="$projects_csv" "${NX_PUBLISH_ARGS[@]}"
}

tag_published_versions() {
  local tags=()
  local project package_name version tag

  while IFS=$'\t' read -r project package_name version; do
    tag="${project}-${version}"
    if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
      echo "Tag already exists: $tag"
      continue
    fi

    echo "Creating tag: $tag for $package_name@$version"
    git tag -a "$tag" -m "$tag"
    tags+=("refs/tags/$tag")
  done < <(release_project_specs)

  if [[ "${#tags[@]}" -eq 0 ]]; then
    echo "All release tags already exist; nothing to push."
    return 0
  fi

  git push origin "${tags[@]}"
}

case "$MODE" in
  prepare)
    git fetch --all --tags
    npm run test
    npm run build
    npx nx release version "${NX_VERSION_ARGS[@]}"
    ;;
  publish)
    npm run build
    publish_missing_versions
    ;;
  tag)
    tag_published_versions
    ;;
  *)
    echo "Error: unknown release mode '$MODE'" >&2
    exit 1
    ;;
esac
