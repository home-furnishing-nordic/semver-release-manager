import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";

export default {
  input: 'index.js',
  output: {
    file: 'dist/index.js',
    format: 'cjs'
  },
  plugins: [
    commonjs(),
    resolve(),
    json(),
  ]
};
