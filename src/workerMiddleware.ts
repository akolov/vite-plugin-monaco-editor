import * as fs from "fs"
import { Connect, ResolvedConfig } from "vite"
import { IWorkerDefinition, editorWorkerService, languageWorkersByLabel } from "./languageWorker"
import { IMonacoEditorOpts } from "./IMonacoEditorOpts"
import { isCDN, resolveMonacoPath } from "./utils"
import { buildSync } from "esbuild"
import path from "path"

export function getFilenameByEntry(entry: string) {
  entry = path.basename(entry, "js")
  return entry + ".bundle.js"
}

export const cacheDir = "node_modules/.monaco/"

export function getWorkers(options: IMonacoEditorOpts) {
  const workers: IWorkerDefinition[] = (options.languageWorkers ?? []).map(worker => languageWorkersByLabel[worker])

  if (options.customWorkers) {
    workers.push(...options.customWorkers)
  }

  if (!workers.find(worker => worker.label === "editorWorkerService")) {
    workers.push(editorWorkerService)
  }

  return workers
}

export function getWorkerPath(
  workers: IWorkerDefinition[],
  options: IMonacoEditorOpts,
  config: ResolvedConfig
) {
  const workerPaths: Record<string, string> = {}

  for (const worker of workers) {
    if (options.publicPath && isCDN(options.publicPath)) {
      workerPaths[worker.label] = options.publicPath + "/" + getFilenameByEntry(worker.entry)
    }
    else {
      workerPaths[worker.label] = config.base + options.publicPath + "/" + getFilenameByEntry(worker.entry)
    }
  }

  if (workerPaths["typescript"]) {
    // javascript shares the same worker
    workerPaths["javascript"] = workerPaths["typescript"]
  }

  if (workerPaths["css"]) {
    // scss and less share the same worker
    workerPaths["less"] = workerPaths["css"]
    workerPaths["scss"] = workerPaths["css"]
  }

  if (workerPaths["html"]) {
    // handlebars, razor and html share the same worker
    workerPaths["handlebars"] = workerPaths["html"]
    workerPaths["razor"] = workerPaths["html"]
  }

  return workerPaths
}

export function workerMiddleware(
  middlewares: Connect.Server,
  config: ResolvedConfig,
  options: IMonacoEditorOpts
): void {
  const workers = getWorkers(options)
  // clear cacheDir

  if (fs.existsSync(cacheDir)) {
    fs.rmdirSync(cacheDir, { recursive: true, force: true } as fs.RmDirOptions)
  }

  for (const worker of workers) {
    middlewares.use(
      config.base + options.publicPath + "/" + getFilenameByEntry(worker.entry),
      function (req, res, next) {
        if (!fs.existsSync(cacheDir + getFilenameByEntry(worker.entry))) {
          resolveMonacoPath(worker.entry).then(monacoPath => {
            buildSync({
              entryPoints: [monacoPath],
              bundle: true,
              outfile: cacheDir + getFilenameByEntry(worker.entry),
            })
          })
        }
        const contentBuffer = fs.readFileSync(cacheDir + getFilenameByEntry(worker.entry))
        res.setHeader("Content-Type", "text/javascript")
        res.end(contentBuffer)
      }
    )
  }
}
