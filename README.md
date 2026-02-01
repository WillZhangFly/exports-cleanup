# unused-exports

> Find unused exports in your codebase - clean up dead code and reduce bundle size

[![npm version](https://img.shields.io/npm/v/unused-exports.svg)](https://www.npmjs.com/package/unused-exports)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Problem

You export 100 functions. Only 20 are actually used. Dead code bloats your bundle.

## Solution

`unused-exports` scans your codebase, tracks all imports, and finds exports that are never used anywhere.

## Features

- **Fast scanning** - Uses regex-based parsing for speed
- **Bundle size estimation** - Shows potential savings in KB
- **TypeScript + JavaScript** - Works with .ts, .tsx, .js, .jsx, .mjs
- **Type-aware** - Optionally include/exclude type exports
- **CI/CD ready** - Exit code 1 when unused exports found
- **Zero config** - Just run it

## Installation

```bash
# Run directly with npx (recommended)
npx unused-exports

# Or install globally
npm install -g unused-exports
```

## Usage

### Basic Scan

```bash
# Scan current directory
npx unused-exports

# Scan specific directory
npx unused-exports ./src

# Compact output
npx unused-exports --compact
```

### Include Types

```bash
# Also check type and interface exports
npx unused-exports --include-types
```

### Show All Exports

```bash
# Show used exports too
npx unused-exports --show-used
```

## Example Output

```
🔍 Unused Exports (47 found):

Summary:
  Total exports:  120
  Unused:        47
  Used:          73
  Potential savings: 23.4 KB

📁 src/utils/helpers.ts
  ❌ formatDate() [function]
     Line 12 - exported but never imported
  ❌ calculateTax() [function]
     Line 45 - exported but never imported
  ❌ DEPRECATED_CONSTANT [const]
     Line 78 - exported but never imported

📁 src/utils/validation.ts
  ❌ validateEmail() [function]
     Line 5 - exported but never imported
  ❌ validatePhone() [function]
     Line 23 - exported but never imported

──────────────────────────────────────────────────
Potential bundle reduction: 23.4 KB

💡 Tips:
  • Remove unused exports to reduce bundle size
  • Some exports may be used dynamically (check manually)
  • Entry points and public APIs may show as "unused"

──────────────────────────────────────────────────
Cleaned up dead code? Consider supporting:
☕ https://buymeacoffee.com/willzhangfly
```

### Compact Output

```
🔍 Found 47 unused exports:

  src/utils/helpers.ts
    formatDate, calculateTax, DEPRECATED_CONSTANT
  src/utils/validation.ts
    validateEmail, validatePhone
  src/components/OldButton.tsx
    OldButton, OldButtonProps

Potential savings: 23.4 KB
```

## Comparison with Alternatives

| Feature | unused-exports | TypeScript | ESLint | ts-prune | knip |
|---------|---------------|------------|--------|----------|------|
| Find unused exports | ✅ | ❌ | ❌ | ✅ | ✅ |
| Bundle size estimate | ✅ | ❌ | ❌ | ❌ | ❌ |
| Zero config | ✅ | ❌ | ❌ | ⚠️ | ❌ |
| Fast | ✅ | ✅ | ✅ | ❌ | ⚠️ |
| CI/CD exit codes | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Actively maintained | ✅ | ✅ | ✅ | ❌ (2021) | ✅ |

## CLI Options

```
Usage: unused-exports [options] [path]

Arguments:
  path                    Directory to scan (default: ".")

Options:
  --json                  Output results as JSON
  --compact               Compact output format
  --include-types         Include type and interface exports
  --show-used             Also show used exports
  --ignore <patterns>     Additional patterns to ignore (comma-separated)
  -V, --version           Output version number
  -h, --help              Display help
```

## CI/CD Integration

```yaml
# GitHub Actions
- name: Check for unused exports
  run: npx unused-exports
  # Exits with code 1 if unused exports found

# With threshold (using jq)
- name: Check unused exports count
  run: |
    npx unused-exports --json > unused.json
    COUNT=$(cat unused.json | jq '.unusedExports')
    if [ "$COUNT" -gt 10 ]; then
      echo "Too many unused exports: $COUNT"
      exit 1
    fi
```

## Programmatic Usage

```typescript
import { analyzeExports } from 'unused-exports';

const result = await analyzeExports('./src', {
  includeTypes: false,
  exclude: ['**/*.test.ts'],
});

console.log(`Found ${result.unusedExports} unused exports`);
console.log(`Potential savings: ${result.estimatedSavings} bytes`);

// Get unused export names
for (const file of result.files) {
  for (const exp of file.exports) {
    if (exp.isUnused) {
      console.log(`${exp.export.name} in ${file.file}`);
    }
  }
}
```

## False Positives

Some exports may appear unused but are actually used:

1. **Entry points** - Main exports used by consumers of your package
2. **Dynamic imports** - `import()` expressions aren't always detected
3. **Re-exports** - `export * from './module'`
4. **Framework conventions** - Next.js pages, React components loaded by name
5. **Public APIs** - Exports meant for external use

Review results manually before removing exports.

## Ignored by Default

- `node_modules/`
- `dist/`, `build/`
- `.next/`
- `coverage/`
- `*.d.ts` (declaration files)
- `*.test.*`, `*.spec.*`
- `__tests__/`

## Requirements

- Node.js 18.0.0 or higher

## Support

This project is maintained in my free time. If it helped clean up your codebase, I'd really appreciate your support:

- ⭐ Star the repo—it helps others discover this tool
- 📢 Share with your team or on social media
- 🐛 [Report bugs or suggest features](https://github.com/willzhangfly/unused-exports/issues)
- ☕ [Buy me a coffee](https://buymeacoffee.com/willzhangfly) if you'd like to support development

Thank you to everyone who has contributed, shared feedback, or helped spread the word!

## License

MIT

---

**Made with ❤️ for cleaner codebases**
