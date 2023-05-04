import * as path from 'path';

/**
 * Return a resolved path for a given Monaco file.
 */
export function resolveMonacoPath(filePath: string): string {
  try {
    return require.resolve(path.join(process.cwd(), 'node_modules', filePath));
  } catch (err) {
    return require.resolve(filePath);
  }
}

export function isCDN(publicPath: string) {
  if (/^((http:)|(https:)|(file:)|(\/\/))/.test(publicPath)) {
    return true;
  }

  return false;
}
