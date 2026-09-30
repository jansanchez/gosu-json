import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  isolateHistory,
} from "@codemirror/commands";
import {
  syntaxHighlighting,
  HighlightStyle,
  bracketMatching,
  foldGutter,
} from "@codemirror/language";
import { json } from "@codemirror/lang-json";
import { tags } from "@lezer/highlight";
const palette = HighlightStyle.define([
  { tag: tags.propertyName, class: "tok-key" },
  { tag: tags.string, class: "tok-string" },
  { tag: tags.number, class: "tok-number" },
  { tag: tags.bool, class: "tok-boolean" },
  { tag: tags.null, class: "tok-null" },
  { tag: tags.punctuation, class: "tok-punctuation" },
]);
const styling = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "13px",
    backgroundColor: "var(--surface)",
    color: "var(--text)",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
    lineHeight: "1.7",
  },
  ".cm-content": {
    padding: "12px 0",
    caretColor: "var(--accent)",
    userSelect: "text",
    "-webkit-user-select": "text",
  },
  ".cm-gutters": {
    backgroundColor: "var(--bg)",
    color: "var(--muted)",
    borderRight: "1px solid var(--border)",
  },
  ".cm-activeLine": { backgroundColor: "var(--hover)" },
  ".cm-content ::selection": {
    backgroundColor: "var(--selection)",
  },
  "&.cm-focused": { outline: "none" },
});
export function createEditor(parent, onChange, { readOnly = false } = {}) {
  let programmatic = false;
  const view = new EditorView({
    parent,
    state: EditorState.create({
      extensions: [
        json(),
        styling,
        syntaxHighlighting(palette),
        lineNumbers(),
        foldGutter(),
        bracketMatching(),
        highlightActiveLine(),
        history(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
          isolateHistory,
        ]),
        EditorState.readOnly.of(readOnly),
        EditorView.contentAttributes.of({
          "aria-label": readOnly ? "JSON code preview" : "JSON source editor",
          spellcheck: "false",
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !programmatic) onChange?.();
        }),
      ],
    }),
  });
  return {
    get value() {
      return view.state.doc.toString();
    },
    set value(value) {
      programmatic = true;
      try {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: value },
          annotations: isolateHistory.of("full"),
        });
      } finally {
        programmatic = false;
      }
    },
    setSelectionRange(from, to) {
      view.dispatch({
        selection: { anchor: from, head: to },
        effects: EditorView.scrollIntoView(from, { y: "center" }),
      });
    },
    reset(value) {
      programmatic = true;
      try {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: value },
          annotations: isolateHistory.of("full"),
        });
      } finally {
        programmatic = false;
      }
    },
    focus() {
      view.focus();
    },
    destroy() {
      view.destroy();
    },
    view,
  };
}
