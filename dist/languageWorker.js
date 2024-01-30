export const editorWorkerService = {
    label: "editorWorkerService",
    entry: "monaco-editor/esm/vs/editor/editor.worker",
};
export const languageWorkerAttr = [
    editorWorkerService,
    {
        label: "css",
        entry: "monaco-editor/esm/vs/language/css/css.worker",
    },
    {
        label: "html",
        entry: "monaco-editor/esm/vs/language/html/html.worker",
    },
    {
        label: "json",
        entry: "monaco-editor/esm/vs/language/json/json.worker",
    },
    {
        label: "typescript",
        entry: "monaco-editor/esm/vs/language/typescript/ts.worker",
    },
];
const languageWorkersByLabel = {};
languageWorkerAttr.forEach((languageWorker) => (languageWorkersByLabel[languageWorker.label] = languageWorker));
export { languageWorkersByLabel };
//# sourceMappingURL=languageWorker.js.map