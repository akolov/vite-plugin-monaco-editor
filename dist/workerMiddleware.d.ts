import { Connect, ResolvedConfig } from "vite";
import { IWorkerDefinition } from "./languageWorker";
import { IMonacoEditorOpts } from "./IMonacoEditorOpts";
export declare function getFilenameByEntry(entry: string): string;
export declare const cacheDir = "node_modules/.monaco/";
export declare function getWorkers(options: IMonacoEditorOpts): IWorkerDefinition[];
export declare function getWorkerPath(workers: IWorkerDefinition[], options: IMonacoEditorOpts, config: ResolvedConfig): Record<string, string>;
export declare function workerMiddleware(middlewares: Connect.Server, config: ResolvedConfig, options: IMonacoEditorOpts): void;
