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
  const cwdUrl = pathToFileURL(process.cwd() + "/")
  const fileUrl = new URL(filePath, cwdUrl)
  const resolved = await import.meta.resolve!(fileUrl.href)
  return fileURLToPath(resolved)
}
