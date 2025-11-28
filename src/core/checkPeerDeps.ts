import { createRequire } from 'module';
import path from 'path';

export function checkPeerDeps(packages: string[], pluginName = 'your-plugin') {
  const missing: string[] = [];

  const projectRoot = process.cwd();
  const projectRequire = createRequire(path.resolve(projectRoot, 'index.js'));

  for (const pkg of packages) {
    try {
      const resolvedPath = projectRequire.resolve(pkg);
      // console.log(`[${pluginName}] Found "${pkg}" at:`, resolvedPath);
    } catch {
      // console.warn(`[${pluginName}] Missing "${pkg}"`);
      missing.push(pkg);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[${pluginName}] Missing peer dependencies:\n\n` +
      `  You need to install the following packages in your project:\n\n` +
      `    ${missing.map((name) => `- ${name}`).join('\n    ')}\n\n` +
      `  Run:\n\n` +
      `    npm install --save-dev ${missing.join(' ')}\n`
    );
  }
}


export default checkPeerDeps;
