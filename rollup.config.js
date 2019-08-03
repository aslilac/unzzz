import typescript from 'rollup-plugin-typescript2';
import minify from 'rollup-plugin-babel-minify';

export default {
  input: 'lib/unzzz.ts',
  external: [ 'fs', 'gardens', 'zlib' ],
  plugins: [
    typescript({
      useTsconfigDeclarationDir: true
    }),
    minify({
      comments: false
    })
  ],
  output: {
    exports: 'named',
    format: 'cjs',
    file: 'dist/unzzz.js',
    sourcemap: true
  }
};
