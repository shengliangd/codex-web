export const name = "E-ink";
export const type = "light";
export const bg = "#ffffff";
export const fg = "#101010";

export const colors = {
  "activityBar.activeBorder": "#000000",
  "activityBar.background": "#ffffff",
  "activityBarBadge.background": "#202020",
  "button.background": "#202020",
  "editor.background": "#ffffff",
  "editor.foreground": "#101010",
  "editorCursor.foreground": "#000000",
  "editorGroupHeader.tabsBackground": "#ffffff",
  focusBorder: "#000000",
  foreground: "#101010",
  "gitDecoration.addedResourceForeground": "#202020",
  "gitDecoration.deletedResourceForeground": "#686868",
  "gitDecoration.untrackedResourceForeground": "#414141",
  "panel.background": "#ffffff",
  "sideBar.background": "#ffffff",
  "sideBar.foreground": "#202020",
  "sideBarTitle.foreground": "#101010",
  "terminal.ansiBlack": "#000000",
  "terminal.ansiBlue": "#303030",
  "terminal.ansiBrightBlack": "#686868",
  "terminal.ansiBrightBlue": "#202020",
  "terminal.ansiBrightCyan": "#414141",
  "terminal.ansiBrightGreen": "#303030",
  "terminal.ansiBrightMagenta": "#202020",
  "terminal.ansiBrightRed": "#414141",
  "terminal.ansiBrightWhite": "#ffffff",
  "terminal.ansiBrightYellow": "#303030",
  "terminal.ansiCyan": "#414141",
  "terminal.ansiGreen": "#303030",
  "terminal.ansiMagenta": "#202020",
  "terminal.ansiRed": "#414141",
  "terminal.ansiWhite": "#eeeeee",
  "terminal.ansiYellow": "#303030",
  "textLink.foreground": "#000000",
};

export const chromeTheme = {
  accent: "#000000",
  contrast: 100,
  fonts: { code: null, ui: null },
  ink: "#101010",
  opaqueWindows: true,
  semanticColors: {
    diffAdded: "#202020",
    diffRemoved: "#686868",
    skill: "#414141",
  },
  surface: "#ffffff",
};

export const settings = [
  {
    scope: ["comment", "punctuation.definition.comment"],
    settings: { fontStyle: "italic", foreground: "#686868" },
  },
  {
    scope: ["string", "string.quoted", "constant.other.symbol"],
    settings: { foreground: "#303030" },
  },
  {
    scope: ["constant", "constant.numeric", "constant.language.boolean"],
    settings: { foreground: "#414141" },
  },
  {
    scope: ["keyword", "keyword.control", "storage", "storage.type"],
    settings: { fontStyle: "bold", foreground: "#101010" },
  },
  {
    scope: ["entity.name.type", "support.class", "support.type"],
    settings: { fontStyle: "underline", foreground: "#202020" },
  },
  {
    scope: [
      "entity.name.function",
      "support.function",
      "variable.function",
      "meta.function-call",
    ],
    settings: { foreground: "#101010" },
  },
  {
    scope: ["variable", "meta.object-literal.key", "meta.property-name"],
    settings: { foreground: "#303030" },
  },
  {
    scope: ["keyword.operator", "punctuation", "punctuation.separator"],
    settings: { foreground: "#686868" },
  },
];

export const semanticTokenColors = {
  class: { bold: true, foreground: "#202020" },
  comment: { italic: true, foreground: "#686868" },
  function: "#101010",
  keyword: { bold: true, foreground: "#101010" },
  method: "#101010",
  namespace: "#303030",
  number: "#414141",
  parameter: "#414141",
  property: "#303030",
  string: "#303030",
  type: { foreground: "#202020", underline: true },
  variable: "#303030",
};

export default {
  bg,
  chromeTheme,
  colors,
  fg,
  name,
  semanticTokenColors,
  settings,
  type,
};
