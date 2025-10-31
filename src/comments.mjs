/**
 * Comment extraction utilities.
 * Preserves all comment types (JSDoc, block, single-line) exactly as written.
 */

/**
 * Extract all leading comments from a declaration.
 * @param {import('ts-morph').Node} decl - The declaration node
 * @returns {Array<{type: string, text: string, start: number}>}
 */
export function extractComments(decl) {
  const comments = [];
  const leadingRanges = decl.getLeadingCommentRanges();

  for (const range of leadingRanges) {
    const text = range.getText();
    const kind = range.getKind();

    comments.push({
      type: kind === 2 ? 'single-line' : 'multi-line',
      text,
      start: range.getPos(),
    });
  }

  return comments;
}

/**
 * Extract JSDoc information from a declaration.
 * @param {import('ts-morph').Node} decl - The declaration node
 * @returns {Object|undefined} JSDoc info or undefined if none
 */
export function extractJSDoc(decl) {
  if (typeof decl.getJsDocs !== 'function') {
    return undefined;
  }

  const jsDocs = decl.getJsDocs();
  if (jsDocs.length === 0) {
    return undefined;
  }

  const doc = jsDocs[0]; // Take first JSDoc block

  return {
    description: doc.getDescription().trim(),
    tags: doc.getTags().map(tag => ({
      name: tag.getTagName(),
      text: tag.getComment() || '',
      type: tag.getTypeExpression?.()?.getText(),
    })),
  };
}

/**
 * Extract comment for a specific parameter from JSDoc.
 * @param {Object|undefined} jsDoc - JSDoc info
 * @param {string} paramName - Parameter name to find
 * @returns {string|undefined} Parameter comment or undefined
 */
export function extractParamComment(jsDoc, paramName) {
  if (!jsDoc || !jsDoc.tags) {
    return undefined;
  }

  const paramTag = jsDoc.tags.find(
    tag => tag.name === 'param' && tag.text.includes(paramName)
  );

  return paramTag?.text;
}
