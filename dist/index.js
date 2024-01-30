import path from 'path';
import * as fs from 'fs';
import fs__default from 'fs';
import { pathToFileURL, fileURLToPath } from 'url';
import { buildSync } from 'esbuild';

const editorWorkerService = {
    label: "editorWorkerService",
    entry: "monaco-editor/esm/vs/editor/editor.worker",
};
const languageWorkerAttr = [
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

/**
 * Return a resolved path for a given Monaco file.
 */
async function resolveMonacoPath(filePath) {
    try {
        console.log("+++ RESOLVE MONACO 1", filePath);
        return await resolveModule(`node_modules/${filePath}`);
    }
    catch (err) {
        console.log("+++ RESOLVE MONACO 2", err);
        return await resolveModule(filePath);
    }
}
function isCDN(publicPath) {
    if (/^((http:)|(https:)|(file:)|(\/\/))/.test(publicPath)) {
        return true;
    }
    return false;
}
async function resolveModule(filePath) {
    console.log("+++ RESOLVE 1", filePath, process.cwd());
    const cwdUrl = pathToFileURL(process.cwd() + "/");
    console.log("+++ RESOLVE 2", cwdUrl);
    const fileUrl = new URL(filePath, cwdUrl);
    console.log("+++ RESOLVE 3", fileUrl);
    const resolved = await import.meta.resolve(fileUrl.href);
    console.log("+++ RESOLVE 4", resolved);
    const res = fileURLToPath(resolved);
    console.log("+++ RESOLVE 5", res);
    return res;
}

function getFilenameByEntry(entry) {
    entry = path.basename(entry, "js");
    return entry + ".bundle.js";
}
const cacheDir = "node_modules/.monaco/";
function getWorkers(options) {
    const workers = (options.languageWorkers ?? []).map(worker => languageWorkersByLabel[worker]);
    if (options.customWorkers) {
        workers.push(...options.customWorkers);
    }
    if (!workers.find(worker => worker.label === "editorWorkerService")) {
        workers.push(editorWorkerService);
    }
    return workers;
}
function getWorkerPath(workers, options, config) {
    const workerPaths = {};
    for (const worker of workers) {
        if (options.publicPath && isCDN(options.publicPath)) {
            workerPaths[worker.label] = options.publicPath + "/" + getFilenameByEntry(worker.entry);
        }
        else {
            workerPaths[worker.label] = config.base + options.publicPath + "/" + getFilenameByEntry(worker.entry);
        }
    }
    if (workerPaths["typescript"]) {
        // javascript shares the same worker
        workerPaths["javascript"] = workerPaths["typescript"];
    }
    if (workerPaths["css"]) {
        // scss and less share the same worker
        workerPaths["less"] = workerPaths["css"];
        workerPaths["scss"] = workerPaths["css"];
    }
    if (workerPaths["html"]) {
        // handlebars, razor and html share the same worker
        workerPaths["handlebars"] = workerPaths["html"];
        workerPaths["razor"] = workerPaths["html"];
    }
    return workerPaths;
}
function workerMiddleware(middlewares, config, options) {
    const workers = getWorkers(options);
    // clear cacheDir
    if (fs.existsSync(cacheDir)) {
        fs.rmdirSync(cacheDir, { recursive: true, force: true });
    }
    for (const worker of workers) {
        middlewares.use(config.base + options.publicPath + "/" + getFilenameByEntry(worker.entry), function (req, res, next) {
            if (!fs.existsSync(cacheDir + getFilenameByEntry(worker.entry))) {
                resolveMonacoPath(worker.entry).then(monacoPath => {
                    buildSync({
                        entryPoints: [monacoPath],
                        bundle: true,
                        outfile: cacheDir + getFilenameByEntry(worker.entry),
                    });
                });
            }
            const contentBuffer = fs.readFileSync(cacheDir + getFilenameByEntry(worker.entry));
            res.setHeader("Content-Type", "text/javascript");
            res.end(contentBuffer);
        });
    }
}

function monacoEditorPlugin(options = {}) {
    const languageWorkers = options.languageWorkers || Object.keys(languageWorkersByLabel);
    const publicPath = options.publicPath || "monacoeditorwork";
    const globalAPI = options.globalAPI || false;
    const customWorkers = options.customWorkers || [];
    const forceBuildCDN = options.forceBuildCDN || false;
    options = {
        ...options,
        languageWorkers,
        publicPath,
        globalAPI,
        customWorkers,
        forceBuildCDN,
    };
    let resolvedConfig;
    return {
        name: "vite-plugin-monaco-editor",
        configResolved(getResolvedConfig) {
            resolvedConfig = getResolvedConfig;
        },
        configureServer(server) {
            if (isCDN(publicPath)) {
                return;
            }
            workerMiddleware(server.middlewares, resolvedConfig, options);
        },
        transformIndexHtml(html) {
            const workers = getWorkers(options);
            const workerPaths = getWorkerPath(workers, options, resolvedConfig);
            const globals = {
                MonacoEnvironment: `(function (paths) {
          return {
            globalAPI: ${globalAPI},
            getWorkerUrl : function (moduleId, label) {
              var result =  paths[label]
              if (/^((http:)|(https:)|(file:)|(\\/\\/))/.test(result)) {
                var currentUrl = String(window.location)
                var currentOrigin = currentUrl.substr(0, currentUrl.length - window.location.hash.length - window.location.search.length - window.location.pathname.length)
                if (result.substring(0, currentOrigin.length) !== currentOrigin) {
                  var js = "/*" + label + "*/importScripts("" + result + "")"
                  var blob = new Blob([js], { type: "application/javascript" })
                  return URL.createObjectURL(blob)
                }
              }
              return result
            }
          }
        })(${JSON.stringify(workerPaths, null, 2)})`,
            };
            const descriptor = [
                {
                    tag: "script",
                    children: Object.keys(globals)
                        .map((key) => `self[${JSON.stringify(key)}] = ${globals[key]}`)
                        .join("\n"),
                    injectTo: "head-prepend",
                },
            ];
            return descriptor;
        },
        writeBundle() {
            // 是cdn地址并且没有强制构建worker cdn则返回
            if (isCDN(publicPath) && !forceBuildCDN) {
                return;
            }
            const workers = getWorkers(options);
            const distPath = options.customDistPath
                ? options.customDistPath(resolvedConfig.root, resolvedConfig.build.outDir, resolvedConfig.base)
                : path.join(resolvedConfig.root, resolvedConfig.build.outDir, resolvedConfig.base, options.publicPath ?? "");
            //  console.log("distPath", distPath)
            // write publicPath
            if (!fs__default.existsSync(distPath)) {
                fs__default.mkdirSync(distPath, {
                    recursive: true,
                });
            }
            for (const worker of workers) {
                if (!fs__default.existsSync(cacheDir + getFilenameByEntry(worker.entry))) {
                    resolveMonacoPath(worker.entry).then(monacoPath => {
                        buildSync({
                            entryPoints: [monacoPath],
                            bundle: true,
                            outfile: cacheDir + getFilenameByEntry(worker.entry),
                        });
                    });
                }
                const contentBuffer = fs__default.readFileSync(cacheDir + getFilenameByEntry(worker.entry));
                const workDistPath = path.resolve(distPath, getFilenameByEntry(worker.entry));
                fs__default.writeFileSync(workDistPath, contentBuffer);
            }
        },
    };
}

export { monacoEditorPlugin };
//# sourceMappingURL=index.js.map
