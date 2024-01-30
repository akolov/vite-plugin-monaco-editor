export interface IWorkerDefinition {
  label: string
  entry: string
}

export const editorWorkerService: IWorkerDefinition = {
  label: "editorWorkerService",
  entry: "monaco-editor/esm/vs/editor/editor.worker",
}

export const languageWorkerAttr: IWorkerDefinition[] = [
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
]


const languageWorkersByLabel: { [language: string]: IWorkerDefinition } = {}
languageWorkerAttr.forEach(
  (languageWorker) => (languageWorkersByLabel[languageWorker.label] = languageWorker)
)

export {languageWorkersByLabel}


export type EditorLanguageWorkers = "css" | "html" | "json" | "typescript" | "editorWorkerService"
