// Element registry — tracks all connected <panel-live> elements

const _elements = new Set();

/**
 * Register a <panel-live> element (called from connectedCallback).
 * Idempotent — re-adding an existing element is a no-op.
 */
export function registerElement(el) {
  _elements.add(el);
}

/**
 * Unregister a <panel-live> element (called from disconnectedCallback).
 */
export function unregisterElement(el) {
  _elements.delete(el);
}

/**
 * Get all registered elements sorted in document order.
 * Uses Node.compareDocumentPosition() for correct ordering even across
 * Shadow DOM boundaries.
 */
export function getRegisteredElements() {
  return Array.from(_elements).sort((a, b) => {
    const pos = a.compareDocumentPosition(b);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
}

/**
 * Get the number of registered elements.
 */
export function getRegisteredCount() {
  return _elements.size;
}
