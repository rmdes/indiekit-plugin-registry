# CLAUDE.md — Plugin Registry

## Package Overview

`indiekit-plugin-registry` is a **data-only YAML catalog** of Indiekit plugins.
It is NOT published to npm; it's a private git submodule consumed by
`indiekit-cloudron` to manage plugin installation and per-site configuration.

**What it is:**
- `plugin-registry.yaml` — declarative catalog of 50+ plugins across 4 tiers
- `scripts/validate.mjs` — Ajv schema validator (ensures structure correctness)
- Per-repo truth for non-overridden plugin versions

**What it does:**
- Acts as the **source of truth for plugin versions** (except overridden ones)
- Enables per-site plugin enablement/disablement without forking the entire config
- Centralizes plugin metadata to avoid duplication across deployments

## Architecture

### Storage

This is a **private npm package** (not published):

```json
{
  "name": "indiekit-plugin-registry",
  "version": "0.0.0-private",
  "private": true,
  "type": "module"
}
```

### Tier System

Four tiers with different enablement policies:

| Tier | Default | Override | Use case |
|------|---------|----------|----------|
| `core` | Always on | ✗ Cannot disable | Essential plugins (`auth`, `posts`, `micropub`, `site-config`, `preset-eleventy`, etc.) |
| `post_types` | Per-default_enabled | ✓ Can disable | Content types (`article`, `note`, `photo`, `bookmark`, `reply`, etc.) |
| `syndicators` | Per-default_enabled | ✓ Can disable | Cross-posting (`mastodon`, `bluesky`, `linkedin`, `indienews`) |
| `endpoints` | Per-default_enabled | ✓ Can disable | Feature endpoints (`github`, `microsub`, `comments`, `blogroll`, etc.) |

### Entry Schema

```yaml
key: string
package: "@scope/name" or "@indiekit/name"
version: "^1.0.0" or "^1.0.0-beta.27"     # OPTIONAL — omit if overridden: true
overridden: boolean                         # true = npm overrides swaps this to @rmdes/*
library: boolean                            # true = install only, don't load as plugin
default_enabled: boolean                    # whether this is on by default
```

**Version notation:**
- Regular semver: `"^1.0.0"` (matches 1.x.x)
- Beta prereleases: `"^1.0.0-beta.27"` (needed because npm's `^1.0.0` ignores betas)

**Overridden entries:**
- **No `version:` field** — version lives in `indiekit-cloudron/package.json`'s `overrides`
- Examples: `@indiekit/endpoint-auth`, `@indiekit/endpoint-micropub`, `@indiekit/endpoint-share`
- Rule: To bump an overridden plugin, edit the override in indiekit-cloudron, NOT here

**Library entries:**
- `library: true` — installed but not listed in `indiekit.config.js` plugins array
- Example: `@rmdes/indiekit-startup-gate` (helper used by background-task plugins)
- Do NOT enable/disable per-site; always installed

## Version-Bump Workflow

### Non-overridden plugins (most common)

1. Edit `plugin-registry.yaml`, bump the `version:` field
   ```yaml
   endpoints:
     - key: cv
       package: "@rmdes/indiekit-endpoint-cv"
       version: "^1.0.28"  # was 1.0.27
   ```
2. Run `node scripts/validate.mjs` locally to check schema
3. `git commit -m "chore: bump cv plugin to ^1.0.28"`
4. `git push origin main`
5. In `indiekit-cloudron`:
   ```bash
   make registry-update
   git add plugin-registry
   git commit -m "chore: update plugin-registry (cv -> 1.0.28)"
   ```

### Overridden plugins (auth, micropub, share, etc.)

**These are NOT versioned here.**

1. Update the override in `indiekit-cloudron/package.json`:
   ```json
   {
     "overrides": {
       "@indiekit/endpoint-auth": "npm:@rmdes/indiekit-endpoint-auth@^1.0.0-beta.32"
     }
   }
   ```
2. Commit in indiekit-cloudron, then deploy normally
3. The entry in `plugin-registry.yaml` stays `overridden: true` with no version

## Validation

The validator enforces:

- **Schema**: All required fields present, correct types (string, boolean)
- **Tier structure**: `core`, `post_types`, `syndicators`, `endpoints` are objects
- **Uniqueness**: No duplicate `key` across all tiers (prevents collisions in config)
- **Conditional fields**: If `overridden: true`, then NO `version:` field. If `library: true`, then usually not listed in per-site plugins.yaml

Run validation:
```bash
npm run validate
# or
node scripts/validate.mjs
```

Output: `Registry valid: 50 plugins across 4 tiers` or detailed errors.

## Current Consumption

**Only:** `indiekit-cloudron` (as `.gitmodules` submodule)

**Not yet:** `indiekit-deploy` (planned integration for future multi-deployment support)

**In cloudron:**
- `Makefile` → `registry-update` target (pull latest)
- `scripts/compose-site.mjs` → reads `plugin-registry.yaml`, merges with per-site config
- `Dockerfile` → installs all `package` names from all tiers (via `npm install`)
- `sites/*/config/plugins.yaml` → per-site overrides (enable/disable optional tiers)
- `.compiled/indiekit.config.js` → final merged plugins list fed to Indiekit

## Key Rules

1. **Source of truth for non-overridden versions** — if a plugin is not in the `overrides` field of indiekit-cloudron, its version lives here
2. **No manual npm publishes** — this is a private catalog, never published
3. **Schema must validate** — CI runs `npm run validate` on every push
4. **Overridden plugins have no version here** — update the override in indiekit-cloudron instead
5. **Core plugins cannot be disabled** — `core` tier always loads, no per-site override possible

## Related Files

- `indiekit-cloudron/package.json` — `overrides` field for forked plugins
- `indiekit-cloudron/scripts/compose-site.mjs` — YAML merge logic
- `indiekit-cloudron/Makefile` — `registry-update` + `registry-status` targets
- `indiekit-cloudron/sites/*/config/plugins.yaml` — per-site plugin enablement
- Individual plugin repos — their `package.json` for the actual `@rmdes/*` code
