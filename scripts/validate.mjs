import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import yaml from "js-yaml";
import Ajv from "ajv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const yamlText = await readFile(path.join(ROOT, "plugin-registry.yaml"), "utf8");
const schemaText = await readFile(path.join(__dirname, "registry-schema.json"), "utf8");

const data = yaml.load(yamlText);
const schema = JSON.parse(schemaText);

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

if (!validate(data)) {
  console.error("Registry validation failed:");
  for (const err of validate.errors) {
    console.error(`  ${err.instancePath}: ${err.message}`);
  }
  process.exit(1);
}

const allKeys = [];
for (const tier of ["core", "post_types", "syndicators", "endpoints"]) {
  for (const entry of data[tier] || []) {
    if (allKeys.includes(entry.key)) {
      console.error(`Duplicate key across tiers: ${entry.key}`);
      process.exit(1);
    }
    allKeys.push(entry.key);
  }
}

console.log(`Registry valid: ${allKeys.length} plugins across ${Object.keys(data).length} tiers`);
