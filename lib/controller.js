// PanelLiveController (returned by PanelLive.mount())

export class PanelLiveController {
  constructor(element) {
    this._element = element;
  }

  /** The underlying <panel-live> DOM element */
  get element() { return this._element; }

  /** Execute current code (editor/playground) */
  run() { return this._element.run(); }

  /** Get current code string */
  getCode() { return this._element.getCode(); }

  /** Set code (updates editor) */
  setCode(code) { this._element.setCode(code); }

  /** Current status: 'idle' | 'loading' | 'running' | 'ready' | 'error' */
  get status() { return this._element.status; }

  /** Remove element and cleanup */
  destroy() {
    this._element.remove();
    this._element = null;
  }
}
