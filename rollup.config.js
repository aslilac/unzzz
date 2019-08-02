import typescript from 'rollup-plugin-typescript2';
import minify from 'rollup-plugin-babel-minify';

export default {
  input: 'lib/unzzz.ts',
  external: [ 'fs', 'gardens', 'zlib' ],
  plugins: [
    typescript(),
    minify({ comments: false })
  ],
  output: {
    format: 'cjs',
    file: 'dist/unzzz.js',
    sourcemap: true
  }
};
