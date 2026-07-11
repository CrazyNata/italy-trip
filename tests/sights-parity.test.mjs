import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/features/sights/Sights.tsx", import.meta.url), "utf8");

assert.match(source, /Проверьте точки и меняйте порядок стрелками или перетаскиванием маркеров\./);
assert.match(source, /Перетащите место между разделами или нажмите/);
assert.match(source, /width: "min\(100%, 540px\)"/);
assert.match(source, /height: 230/);
assert.doesNotMatch(source, /<textarea/);
assert.doesNotMatch(source, /CoordinateInputs/);
assert.doesNotMatch(source, /Открыть ↗/);
assert.doesNotMatch(source, /value=\{sight\.name\}/);
assert.doesNotMatch(source, /value=\{sight\.subcategory\}/);
