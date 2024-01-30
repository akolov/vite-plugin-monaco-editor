import path from "path"
import { fileURLToPath, pathToFileURL } from "url"

/**
 * Return a resolved path for a given Monaco file.
 */
export async function resolveMonacoPath(filePath: string): Promise<string> {
  try {
    console.log("+++ RESOLVE MONACO 1", filePath)
    return await resolveModule(`node_modules/${filePath}`)
  }
  catch (err) {
    console.log("+++ RESOLVE MONACO 2", err)
    return await resolveModule(filePath)
  }
}

export function isCDN(publicPath: string) {
  if (/^((http:)|(https:)|(file:)|(\/\/))/.test(publicPath)) {
    return true
  }

  return false
}

async function resolveModule(filePath: string) {
  console.log("+++ RESOLVE 1", filePath, process.cwd())
  const cwdUrl = pathToFileURL(process.cwd() + "/")
  console.log("+++ RESOLVE 2", cwdUrl)
  const fileUrl = new URL(filePath, cwdUrl)
  console.log("+++ RESOLVE 3", fileUrl)
  const resolved = await import.meta.resolve!(fileUrl.href)
  console.log("+++ RESOLVE 4", resolved)
  const res = fileURLToPath(resolved)
  console.log("+++ RESOLVE 5", res)
  return res
}
