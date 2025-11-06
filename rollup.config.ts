import typescript from "@rollup/plugin-typescript"

export default {
  input: "src/index.ts",
  output: {
    dir: "dist",
    format: "esm",
    sourcemap: true
  },
  external: [
    "path",
    "fs",
    "url",
    "esbuild"
  ],
  plugins: [
    typescript({
      sourceMap: true
    })
  ],
}
