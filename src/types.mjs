/**
 * Type information serialization utilities.
 */

/**
 * Extract type information from a type node.
 * @param {import('ts-morph').Type} type - The type to extract
 * @returns {Object} Type information
 */
export function extractTypeInfo(type) {
  const raw = type.getText();

  return {
    raw,
    isGeneric: raw.includes('<'),
    typeParameters: extractTypeParameters(raw),
  };
}

/**
 * Extract type parameters from a generic type string.
 * @param {string} typeStr - Type string like "Map<string, number>"
 * @returns {Array<string>} Type parameters or empty array
 */
function extractTypeParameters(typeStr) {
  if (!typeStr.includes('<')) {
    return [];
  }

  // Simple extraction - just get content between first < and last >
  const match = typeStr.match(/<(.+)>$/);
  if (!match) {
    return [];
  }

  // Split by comma but respect nested generics
  // This is simplified - full parser would handle nested <> better
  return match[1].split(',').map(t => t.trim());
}

/**
 * Build a minimal signature string for a declaration.
 * @param {import('ts-morph').Node} decl - The declaration
 * @returns {string} Minimal signature
 */
export function buildSignature(decl) {
  const kind = decl.getKindName();

  switch (kind) {
    case 'FunctionDeclaration':
    case 'MethodDeclaration':
    case 'ArrowFunction':
      return buildFunctionSignature(decl);

    case 'ClassDeclaration':
      return buildClassSignature(decl);

    case 'InterfaceDeclaration':
      return buildInterfaceSignature(decl);

    case 'TypeAliasDeclaration':
      return buildTypeAliasSignature(decl);

    case 'VariableDeclaration':
      return buildVariableSignature(decl);

    case 'EnumDeclaration':
      return `enum ${decl.getName()}`;

    default:
      return decl.getText().substring(0, 100); // Fallback: first 100 chars
  }
}

function buildFunctionSignature(decl) {
  const name = decl.getName?.() || 'anonymous';
  const params = decl.getParameters().map(p => {
    const pName = p.getName();
    const pType = p.getType().getText();
    const optional = p.isOptional() ? '?' : '';
    return `${pName}${optional}: ${pType}`;
  }).join(', ');

  const returnType = decl.getReturnType().getText();
  const isAsync = decl.isAsync?.() ? 'async ' : '';

  return `${isAsync}function ${name}(${params}): ${returnType}`;
}

function buildClassSignature(decl) {
  const name = decl.getName();
  const baseClass = decl.getBaseClass();
  const interfaces = decl.getImplements();

  let sig = `class ${name}`;

  if (baseClass) {
    sig += ` extends ${baseClass.getName()}`;
  }

  if (interfaces.length > 0) {
    sig += ` implements ${interfaces.map(i => i.getText()).join(', ')}`;
  }

  return sig;
}

function buildInterfaceSignature(decl) {
  const name = decl.getName();
  const members = decl.getMembers();

  // Show first few members inline for compact signature
  const memberSigs = members.slice(0, 3).map(m => m.getText()).join('; ');
  const more = members.length > 3 ? '; ...' : '';

  return `interface ${name} { ${memberSigs}${more} }`;
}

function buildTypeAliasSignature(decl) {
  const name = decl.getName();
  const type = decl.getType().getText();

  return `type ${name} = ${type}`;
}

function buildVariableSignature(decl) {
  const name = decl.getName();
  const type = decl.getType().getText();
  const init = decl.getInitializer();

  if (init) {
    const initText = init.getText();
    // For constants, show value if it's simple
    if (initText.length < 50) {
      return `const ${name}: ${type} = ${initText}`;
    }
  }

  return `const ${name}: ${type}`;
}
