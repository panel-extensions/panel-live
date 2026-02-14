// CodeMirror 6 — bundled editor with Python syntax highlighting

import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView, keymap, lineNumbers, highlightActiveLine,
  drawSelection, highlightSpecialChars,
} from '@codemirror/view';
import {
  defaultHighlightStyle, syntaxHighlighting, indentOnInput,
  bracketMatching, indentUnit,
} from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import {
  defaultKeymap, history, historyKeymap,
  toggleComment, indentMore, indentLess,
  selectLine, deleteLine,
} from '@codemirror/commands';
import { searchKeymap, selectNextOccurrence } from '@codemirror/search';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';

// Each editor instance gets its own theme compartment for dynamic switching
const themeCompartments = new WeakMap();

/**
 * Create a CodeMirror 6 editor inside a parent element.
 *
 * @param {HTMLElement} parentEl - Container element (replaces CM5 textarea pattern)
 * @param {string} initialCode - Initial editor content
 * @param {string} resolvedTheme - 'light' or 'dark'
 * @param {Function|null} onRun - Callback for Ctrl/Cmd+Enter
 * @returns {EditorView} The CM6 editor view
 */
export function createEditor(parentEl, initialCode, resolvedTheme, onRun) {
  const isDark = resolvedTheme === 'dark';
  const themeCompartment = new Compartment();

  const runKeyBinding = keymap.of([
    { key: 'Ctrl-Enter', run: () => { if (onRun) onRun(); return true; } },
    { key: 'Cmd-Enter', run: () => { if (onRun) onRun(); return true; } },
    { key: 'Ctrl-/', run: toggleComment },
    { key: 'Cmd-/', run: toggleComment },
  ]);

  const tabBinding = keymap.of([
    {
      key: 'Tab',
      run: (view) => {
        if (view.state.selection.ranges.some(r => !r.empty)) {
          return indentMore(view);
        }
        view.dispatch(view.state.replaceSelection('    '));
        return true;
      },
    },
    { key: 'Shift-Tab', run: indentLess },
  ]);

  // VS Code-style shortcuts
  const vsCodeKeyBinding = keymap.of([
    { key: 'Ctrl-d', run: selectNextOccurrence },
    { key: 'Cmd-d', run: selectNextOccurrence },
    { key: 'Ctrl-Shift-k', run: deleteLine },
    { key: 'Cmd-Shift-k', run: deleteLine },
    { key: 'Ctrl-l', run: selectLine },
    { key: 'Cmd-l', run: selectLine },
  ]);

  const extensions = [
    lineNumbers(),
    highlightActiveLine(),
    drawSelection(),
    highlightSpecialChars(),
    history(),
    bracketMatching(),
    closeBrackets(),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    indentUnit.of('    '),
    EditorState.tabSize.of(4),
    python(),
    runKeyBinding,
    tabBinding,
    vsCodeKeyBinding,
    keymap.of([
      ...closeBracketsKeymap,
      ...searchKeymap,
      ...defaultKeymap,
      ...historyKeymap,
    ]),
    themeCompartment.of(isDark ? oneDark : []),
  ];

  const state = EditorState.create({
    doc: initialCode,
    extensions,
  });

  const view = new EditorView({
    state,
    parent: parentEl,
  });

  // Store compartment for later theme switching
  themeCompartments.set(view, themeCompartment);

  return view;
}

/**
 * Switch the editor theme dynamically.
 *
 * @param {EditorView} view
 * @param {boolean} isDark
 */
export function setEditorTheme(view, isDark) {
  const compartment = themeCompartments.get(view);
  if (compartment) {
    view.dispatch({
      effects: compartment.reconfigure(isDark ? oneDark : []),
    });
  }
}

/**
 * Get the current editor content.
 *
 * @param {EditorView} view
 * @returns {string}
 */
export function getEditorCode(view) {
  return view.state.doc.toString();
}

/**
 * Replace the entire editor content.
 *
 * @param {EditorView} view
 * @param {string} code
 */
export function setEditorCode(view, code) {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: code },
  });
}
