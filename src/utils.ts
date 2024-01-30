import path from "path"
import { fileURLToPath, pathToFileURL } from "url"

/**
 * Return a resolved path for a given Monaco file.
 */
export async function resolveMonacoPath(filePath: string): Promise<string> {
  try {
    console.log("+++ MONACO 1", filePath)
    return await resolveModule(`node_modules/${filePath}`)
  } catch (err) {
    console.log("+++ MONACO 2", filePath)
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
  console.log("+++ MONACO 1.0", filePath, process.cwd())
  const cwdUrl = pathToFileURL(process.cwd() + "/")
  console.log("+++ MONACO 1.1", cwdUrl)
  const fileUrl = new URL(filePath, cwdUrl)
  console.log("+++ MONACO 1.2", fileUrl)
  const resolved = await import.meta.resolve!(fileUrl.href)
  console.log("+++ MONACO 1.3", resolved)
  const ret = fileURLToPath(resolved)
  console.log("+++ MONACO 1.4", ret)
  return ret
}
