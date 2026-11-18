import ts from 'typescript';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      name: 'ts-stage3-decorators',
      enforce: 'pre',
      transform(code, id) {
        if (!id.endsWith('.ts') || !code.includes('@Transactional')) {
          return null;
        }
        const result = ts.transpileModule(code, {
          fileName: id,
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
            sourceMap: true,
          },
        });
        return {
          code: result.outputText,
          map: result.sourceMapText ? JSON.parse(result.sourceMapText) : null,
        };
      },
    },
  ],
});
