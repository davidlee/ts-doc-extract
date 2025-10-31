/**
 * Core AST extraction logic for TypeScript/JavaScript files.
 */

import { Project, SyntaxKind } from 'ts-morph';
import { extractComments, extractJSDoc, extractParamComment } from './comments.mjs';
import { buildSignature, extractTypeInfo } from './types.mjs';

/**
 * Extract documentation from a TypeScript/JavaScript file.
 * @param {string} filePath - Absolute path to file
 * @param {string} variant - 'public' or 'internal'
 * @returns {Object} Extraction result
 */
export function extractModule(filePath, variant = 'public') {
  const project = new Project({
    compilerOptions: {
      allowJs: true,
      checkJs: true,
      target: 99, // ESNext
      jsx: 2, // React JSX
    },
  });

  const sourceFile = project.addSourceFileAtPath(filePath);
  const exports = sourceFile.getExportedDeclarations();
  const symbols = [];

  for (const [name, declarations] of exports.entries()) {
    for (const decl of declarations) {
      const symbol = extractSymbol(decl, variant);
      if (symbol) {
        symbols.push(symbol);
      }
    }
  }

  // Sort for determinism
  symbols.sort((a, b) => {
    // Sort order: types, interfaces, constants, functions, classes, enums
    const kindOrder = {
      type: 0,
      interface: 1,
      const: 2,
      function: 3,
      class: 4,
      enum: 5,
    };
    const aOrder = kindOrder[a.kind] ?? 99;
    const bOrder = kindOrder[b.kind] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });

  return {
    module: deriveModuleName(filePath),
    filePath,
    exports: symbols,
    imports: extractImports(sourceFile),
    metadata: {
      hasDefaultExport: sourceFile.getDefaultExportSymbol() !== undefined,
      exportCount: symbols.length,
      loc: sourceFile.getEndLineNumber(),
    },
  };
}

/**
 * Derive module name from file path.
 * @param {string} filePath - File path
 * @returns {string} Module name
 */
function deriveModuleName(filePath) {
  // Extract relative path after src/ or from filename
  // /home/user/project/src/db/client.ts → db.client
  // /home/user/project/auth.ts → auth

  const parts = filePath.split('/');
  const srcIndex = parts.lastIndexOf('src');

  if (srcIndex !== -1) {
    // Take everything after src/
    const afterSrc = parts.slice(srcIndex + 1);
    // Remove file extension
    const last = afterSrc[afterSrc.length - 1];
    afterSrc[afterSrc.length - 1] = last.replace(/\.(ts|tsx|js|jsx)$/, '');
    // Remove index if present
    if (afterSrc[afterSrc.length - 1] === 'index') {
      afterSrc.pop();
    }
    return afterSrc.filter(p => p).join('.');
  }

  // No src/ directory - use filename
  const filename = parts[parts.length - 1];
  return filename.replace(/\.(ts|tsx|js|jsx)$/, '');
}

/**
 * Extract import information from source file.
 * @param {import('ts-morph').SourceFile} sourceFile
 * @returns {Array<Object>} Import info
 */
function extractImports(sourceFile) {
  const imports = [];
  const importDecls = sourceFile.getImportDeclarations();

  for (const importDecl of importDecls) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    const namedImports = importDecl.getNamedImports().map(ni => ni.getName());
    const defaultImport = importDecl.getDefaultImport()?.getText();

    imports.push({
      module: moduleSpecifier,
      namedImports,
      defaultImport,
    });
  }

  return imports;
}

/**
 * Extract a single symbol from a declaration.
 * @param {import('ts-morph').Node} decl - Declaration node
 * @param {string} variant - 'public' or 'internal'
 * @returns {Object|null} Symbol info or null if filtered
 */
function extractSymbol(decl, variant) {
  const kind = decl.getKindName();
  const isPrivate = checkPrivacy(decl);

  // For 'public' variant, skip private symbols
  if (variant === 'public' && isPrivate) {
    return null;
  }

  // Extract comments
  const leadingComments = extractComments(decl);
  const jsDoc = extractJSDoc(decl);

  // Base symbol info
  const symbol = {
    kind: mapKind(kind),
    name: getName(decl),
    signature: buildSignature(decl),
    leadingComments,
    jsDoc,
    isPrivate,
  };

  // Kind-specific extraction
  switch (symbol.kind) {
    case 'function':
      return extractFunction(decl, symbol);
    case 'class':
      return extractClass(decl, symbol, variant);
    case 'interface':
      return extractInterface(decl, symbol);
    case 'type':
      return extractTypeAlias(decl, symbol);
    case 'const':
      return extractConst(decl, symbol);
    case 'enum':
      return extractEnum(decl, symbol);
    default:
      return symbol;
  }
}

/**
 * Get name from declaration, handling various node types.
 */
function getName(decl) {
  if (typeof decl.getName === 'function') {
    const name = decl.getName();
    if (name) return name;
  }

  if (typeof decl.getSymbol === 'function') {
    const symbol = decl.getSymbol();
    if (symbol) return symbol.getName();
  }

  return 'default';
}

/**
 * Check if declaration is private.
 */
function checkPrivacy(decl) {
  // Check for private/protected modifiers
  if (typeof decl.hasModifier === 'function') {
    if (decl.hasModifier(SyntaxKind.PrivateKeyword)) return true;
    if (decl.hasModifier(SyntaxKind.ProtectedKeyword)) return true;
  }

  // Check for _ prefix (naming convention)
  const name = getName(decl);
  return name.startsWith('_');
}

/**
 * Map ts-morph kind name to our simplified kind.
 */
function mapKind(kindName) {
  const mapping = {
    FunctionDeclaration: 'function',
    ArrowFunction: 'function',
    MethodDeclaration: 'function',
    ClassDeclaration: 'class',
    InterfaceDeclaration: 'interface',
    TypeAliasDeclaration: 'type',
    VariableDeclaration: 'const',
    EnumDeclaration: 'enum',
  };

  return mapping[kindName] || 'unknown';
}

/**
 * Extract function-specific information.
 */
function extractFunction(decl, symbol) {
  const params = decl.getParameters();

  symbol.parameters = params.map(p => ({
    name: p.getName(),
    type: p.getType().getText(),
    optional: p.isOptional(),
    defaultValue: p.getInitializer()?.getText(),
    comment: extractParamComment(symbol.jsDoc, p.getName()),
  }));

  symbol.returnType = decl.getReturnType().getText();
  symbol.isAsync = decl.isAsync?.() ?? false;

  return symbol;
}

/**
 * Extract class-specific information.
 */
function extractClass(decl, symbol, variant) {
  symbol.baseClass = decl.getBaseClass()?.getName();
  symbol.interfaces = decl.getImplements().map(i => i.getText());
  symbol.members = [];

  // Extract constructor
  const ctor = decl.getConstructors()[0];
  if (ctor) {
    symbol.members.push({
      kind: 'constructor',
      name: 'constructor',
      signature: buildConstructorSignature(ctor),
      visibility: 'public',
      isStatic: false,
      leadingComments: extractComments(ctor),
      jsDoc: extractJSDoc(ctor),
      parameters: ctor.getParameters().map(p => ({
        name: p.getName(),
        type: p.getType().getText(),
        optional: p.isOptional(),
      })),
    });
  }

  // Extract properties
  for (const prop of decl.getProperties()) {
    const vis = getVisibility(prop);
    if (variant === 'public' && vis !== 'public') {
      continue;
    }

    symbol.members.push({
      kind: 'property',
      name: prop.getName(),
      signature: `${prop.getName()}: ${prop.getType().getText()}`,
      visibility: vis,
      isStatic: prop.isStatic(),
      leadingComments: extractComments(prop),
      jsDoc: extractJSDoc(prop),
    });
  }

  // Extract methods
  for (const method of decl.getMethods()) {
    const vis = getVisibility(method);
    if (variant === 'public' && vis !== 'public') {
      continue;
    }

    symbol.members.push({
      kind: 'method',
      name: method.getName(),
      signature: buildMethodSignature(method),
      visibility: vis,
      isStatic: method.isStatic(),
      isAsync: method.isAsync(),
      leadingComments: extractComments(method),
      jsDoc: extractJSDoc(method),
      parameters: method.getParameters().map(p => ({
        name: p.getName(),
        type: p.getType().getText(),
        optional: p.isOptional(),
      })),
      returnType: method.getReturnType().getText(),
    });
  }

  // Sort members: constructor, properties, methods (alphabetical within each)
  symbol.members.sort((a, b) => {
    if (a.kind === 'constructor') return -1;
    if (b.kind === 'constructor') return 1;
    if (a.kind !== b.kind) return a.kind === 'property' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return symbol;
}

function buildConstructorSignature(ctor) {
  const params = ctor.getParameters().map(p => {
    const name = p.getName();
    const type = p.getType().getText();
    const optional = p.isOptional() ? '?' : '';
    return `${name}${optional}: ${type}`;
  }).join(', ');

  return `constructor(${params})`;
}

function buildMethodSignature(method) {
  const name = method.getName();
  const params = method.getParameters().map(p => {
    const pName = p.getName();
    const pType = p.getType().getText();
    const optional = p.isOptional() ? '?' : '';
    return `${pName}${optional}: ${pType}`;
  }).join(', ');
  const returnType = method.getReturnType().getText();

  return `${name}(${params}): ${returnType}`;
}

function getVisibility(member) {
  if (member.hasModifier?.(SyntaxKind.PrivateKeyword)) return 'private';
  if (member.hasModifier?.(SyntaxKind.ProtectedKeyword)) return 'protected';
  return 'public';
}

/**
 * Extract interface-specific information.
 */
function extractInterface(decl, symbol) {
  symbol.properties = decl.getMembers().map(member => ({
    name: member.getSymbol()?.getName() || 'unknown',
    signature: member.getText(),
    leadingComments: extractComments(member),
  }));

  return symbol;
}

/**
 * Extract type alias information.
 */
function extractTypeAlias(decl, symbol) {
  symbol.typeInfo = extractTypeInfo(decl.getType());
  return symbol;
}

/**
 * Extract constant information.
 */
function extractConst(decl, symbol) {
  symbol.typeInfo = extractTypeInfo(decl.getType());
  symbol.value = decl.getInitializer()?.getText();
  return symbol;
}

/**
 * Extract enum information.
 */
function extractEnum(decl, symbol) {
  symbol.enumValues = decl.getMembers().map(member => ({
    name: member.getName(),
    value: member.getValue(),
  }));

  return symbol;
}
