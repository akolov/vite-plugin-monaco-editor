import path from "path"
import fs from "fs"
import { HtmlTagDescriptor, Plugin, ResolvedConfig } from "vite"
import { EditorLanguageWorkers, languageWorkersByLabel } from "./languageWorker"
import { cacheDir, getFilenameByEntry, getWorkerPath, getWorkers, workerMiddleware } from "./workerMiddleware"
import { isCDN, resolveMonacoPath } from "./utils"
import { IMonacoEditorOpts } from "./IMonacoEditorOpts"
import { buildSync } from "esbuild"

export function monacoEditorPlugin(options: IMonacoEditorOpts = {}): Plugin {
  const languageWorkers =
    options.languageWorkers || (Object.keys(languageWorkersByLabel) as EditorLanguageWorkers[])
  const publicPath = options.publicPath || "monacoeditorwork"
  const globalAPI = options.globalAPI || false
  const customWorkers = options.customWorkers || []
  const forceBuildCDN = options.forceBuildCDN || false

  options = {
    ...options,
    languageWorkers,
    publicPath,
    globalAPI,
    customWorkers,
    forceBuildCDN,
  }

  let resolvedConfig: ResolvedConfig

  return {
    name: "vite-plugin-monaco-editor",
    configResolved(getResolvedConfig) {
      resolvedConfig = getResolvedConfig
    },
    configureServer(server) {
      if (isCDN(publicPath)) {
        return
      }

      workerMiddleware(server.middlewares, resolvedConfig, options)
    },
    transformIndexHtml(html) {
      const workers = getWorkers(options)
      const workerPaths = getWorkerPath(workers, options, resolvedConfig)

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
                  var js = '/*' + label + '*/importScripts("' + result + '");'
                  var blob = new Blob([js], { type: "application/javascript" })
                  return URL.createObjectURL(blob)
                }
              }
              return result
            }
          }
        })(${JSON.stringify(workerPaths, null, 2)})`,
      }

      const descriptor: HtmlTagDescriptor[] = [
        {
          tag: "script",
          children: Object.keys(globals)
            .map((key) => `self[${JSON.stringify(key)}] = ${(globals as Record<string, any>)[key]}`)
            .join("\n"),
          injectTo: "head-prepend",
        },
      ]
      return descriptor
    },

    writeBundle() {
      // 是cdn地址并且没有强制构建worker cdn则返回
      if (isCDN(publicPath) && !forceBuildCDN) {
        return
      }

      const workers = getWorkers(options)

      const distPath = options.customDistPath
        ? options.customDistPath(
            resolvedConfig.root,
            resolvedConfig.build.outDir,
            resolvedConfig.base
          )
        : path.join(
            resolvedConfig.root,
            resolvedConfig.build.outDir,
            resolvedConfig.base,
            options.publicPath ?? ""
          )

      //  console.log("distPath", distPath)

      // write publicPath
      if (!fs.existsSync(distPath)) {
        fs.mkdirSync(distPath, {
          recursive: true,
        })
      }

      const promises = workers.reduce((acc, worker) => {
        if (!fs.existsSync(cacheDir + getFilenameByEntry(worker.entry))) {
          const promise = new Promise<void>((resolve, reject) => {
            resolveMonacoPath(worker.entry).then(monacoPath => {
              const res = buildSync({
                entryPoints: [monacoPath],
                bundle: true,
                outfile: cacheDir + getFilenameByEntry(worker.entry),
              })
              resolve()
            })
          })

          acc.push(promise)
        }

        return acc
      }, new Array<Promise<void>>())

      Promise.all(promises).then(x => {
        for (const worker of workers) {
          const contentBuffer = fs.readFileSync(cacheDir + getFilenameByEntry(worker.entry))
          const workDistPath = path.resolve(distPath, getFilenameByEntry(worker.entry))
          fs.writeFileSync(workDistPath, contentBuffer)
        }
      })
    },
  }
}
