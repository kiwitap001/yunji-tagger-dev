import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    // 添加此选项解决 .js 扩展问题
    resolve: true,
  },
  outDir: 'dist',
  target: 'node16',
  clean: true,
  splitting: false,
  sourcemap: true,
  external: [
    '@rollup/pluginutils',
    '@vue/compiler-sfc',
    '@vue/compiler-dom',
    'magic-string',
    'vue-loader',
    'webpack',
    'webpack/lib/RuleSet',
    'webpack/lib/rules/DescriptionDataMatcherRulePlugin',
    'uglify-js',
    '@swc/core',
    '@babel/core',
    '@babel/preset-typescript',
    '@babel/preset-react',
  ],
});
