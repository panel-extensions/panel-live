// URL sharing: encode/decode code in URL hash

export function encodeCode(code) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(code)));
}

export function decodeCode(encoded) {
  return new TextDecoder().decode(Uint8Array.from(atob(encoded), c => c.charCodeAt(0)));
}

export function getCodeFromHash() {
  const hash = location.hash.slice(1);
  const params = new URLSearchParams(hash);
  const encoded = params.get('code');
  if (encoded) {
    try { return decodeCode(encoded); } catch (e) { return null; }
  }
  return null;
}

export function setCodeInHash(code) {
  const encoded = encodeCode(code);
  const params = new URLSearchParams(location.hash.slice(1));
  params.set('code', encoded);
  history.replaceState(null, '', '#' + params.toString());
}
