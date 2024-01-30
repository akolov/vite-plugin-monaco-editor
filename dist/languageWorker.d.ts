export interface IWorkerDefinition {
    label: string;
    entry: string;
}
export declare const editorWorkerService: IWorkerDefinition;
export declare const languageWorkerAttr: IWorkerDefinition[];
declare const languageWorkersByLabel: {
    [language: string]: IWorkerDefinition;
};
export { languageWorkersByLabel };
export type EditorLanguageWorkers = "css" | "html" | "json" | "typescript" | "editorWorkerService";
