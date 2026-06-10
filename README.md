# indiekit-plugin-registry

Central catalog of Indiekit plugins as a git submodule in `indiekit-cloudron`.

## Status

**Currently consumed by:** `indiekit-cloudron` only (as a git submodule, read by `scripts/compose-site.mjs`).

**Planned for:** `indiekit-deploy` integration (not yet implemented).

## Files

- `plugin-registry.yaml` — the catalog itself
- `scripts/validate.mjs` — schema validation (run by CI, Ajv with `registry-schema.json`)

## Schema

Four tiers, each with these fields per entry:

| Field | Type | Purpose |
|-------|------|---------|
| `key` | string | Identifier used in `sites/*/config/plugins.yaml` (kebab-case) |
| `package` | string | npm package name (`@scope/name`) |
| `version` | string | semver range — **omitted when `overridden: true`** |
| `overridden` | boolean | `true` if `indiekit-cloudron/package.json` `overrides` field swaps this for an `@rmdes/*` fork |
| `library` | boolean | `true` for helper libraries (imported by plugins, not loaded as plugins; install only) |
| `default_enabled` | boolean | Whether this plugin is enabled by default when a site doesn't explicitly list it |

**Tiers:**

- `core` — always installed and loaded; cannot be disabled per-site
- `post_types` — content type plugins; per-site can enable/disable
- `syndicators` — cross-posting targets; per-site can enable/disable
- `endpoints` — feature endpoints; per-site can enable/disable

## Consumption Flow

1. `indiekit-cloudron/Makefile` provides `registry-update` and `registry-status` targets
2. `make registry-update` pulls latest from submodule's origin/main
3. `scripts/compose-site.mjs` merges `plugin-registry.yaml` with `sites/<site>/config/plugins.yaml`
   - `core` plugins are implicit (always included)
   - Per-site `plugins.yaml` can enable/disable optional tiers
   - Result: `.compiled/indiekit.config.js` with merged plugin list
4. Cloudron's `Dockerfile` installs all `package` names from all tiers

## Overridden Plugins

Entries with `overridden: true` have NO `version:` field here. Their versions live in `indiekit-cloudron/package.json`'s `overrides` section:

```json
{
  "overrides": {
    "@indiekit/endpoint-auth": "npm:@rmdes/indiekit-endpoint-auth@^1.0.0-beta.30",
    "@indiekit/endpoint-share": "npm:@rmdes/indiekit-endpoint-share@^1.0.3"
  }
}
```

When npm resolves the upstream package name, it installs the fork under the same name. The default plugin loader calls `import("@indiekit/endpoint-share")` and gets the fork's code transparently.

**Rule:** Do NOT bump version for `overridden: true` entries here; instead, update the override in `indiekit-cloudron/package.json`.

## How to Bump a Plugin Version

### Non-overridden plugins

1. Edit `plugin-registry.yaml`, update the `version:` field for the plugin
2. Run `node scripts/validate.mjs` to verify
3. Commit and push to origin/main
4. In `indiekit-cloudron`, update the submodule pointer:
   ```bash
   make registry-update
   git add plugin-registry
   git commit -m "chore: bump plugin-registry to <newcommit>"
   ```

### Overridden plugins

1. **Do NOT edit `plugin-registry.yaml`** — the entry stays at `overridden: true` with no version
2. Update the override in `indiekit-cloudron/package.json`:
   ```json
   {
     "overrides": {
       "@indiekit/endpoint-auth": "npm:@rmdes/indiekit-endpoint-auth@^1.0.0-beta.31"
     }
   }
   ```
3. Commit in `indiekit-cloudron`, then build and deploy as normal

## How to Add a New Plugin

1. Add a new entry to the appropriate tier in `plugin-registry.yaml`
2. Set `default_enabled: false` unless it's truly universal
3. If the plugin is a helper library (imported by other plugins, not a plugin itself), set `library: true`
4. Run `node scripts/validate.mjs` to verify schema compliance
5. Commit, push to origin/main
6. In `indiekit-cloudron`, update submodule: `make registry-update && git add plugin-registry`
