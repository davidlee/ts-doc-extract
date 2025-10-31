# ts-doc-extract

AST-based documentation extractor for TypeScript and JavaScript using ts-morph.

## Usage

```bash
npx ts-doc-extract <file.ts> [--variant=public|internal]
```

Outputs JSON to stdout with complete AST information including:
- All exports (functions, classes, types, interfaces, enums, constants)
- Full type signatures
- All comment types (JSDoc, block, single-line) preserved exactly
- Parameter information
- Return types

## Variants

- `public` (default): Only public exported symbols
- `internal`: All symbols including private/protected

## Requirements

- Node.js 18+
- TypeScript/JavaScript project

## Example

```bash
# Extract public API from a TypeScript file
npx ts-doc-extract src/index.ts --variant=public

# Extract all symbols including private/protected
npx ts-doc-extract src/index.ts --variant=internal
```

## Output Format

JSON structure with deterministic ordering:

```json
{
  "functions": [...],
  "classes": [...],
  "interfaces": [...],
  "types": [...],
  "enums": [...],
  "constants": [...]
}
```

## Used by

Part of the [spec-driver](https://github.com/yourusername/spec-driver) toolchain for generating deterministic code documentation.
