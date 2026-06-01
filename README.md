# indiekit-plugin-registry

Shared catalog of Indiekit plugins consumed by `indiekit-cloudron` and `indiekit-deploy`.

## Files

- `plugin-registry.yaml` — the catalog itself
- `scripts/validate.mjs` — schema validation (run by CI)

## How to bump a plugin version

1. Edit `plugin-registry.yaml`, update the `version:` field for the plugin
2. Run `node scripts/validate.mjs` to verify
3. Commit, push
4. In each consuming repo (`indiekit-cloudron`, `indiekit-deploy`), update the
   submodule pointer:
   ```
   cd plugin-registry && git pull origin main
   cd .. && git add plugin-registry && git commit -m "chore: bump plugin-registry"
   ```

## How to add a new plugin

1. Add a new entry to the appropriate tier in `plugin-registry.yaml`
2. Set `default_enabled: false` unless it's truly universal
3. If the plugin is a helper library (imported by other plugins, not a plugin
   itself), set `library: true` so it's installed but not listed in the
   indiekit.config.js plugins array
4. Validate, commit, push, update submodule in consumers
