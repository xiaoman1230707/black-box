import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface PackageManifest {
  scripts?: Record<string, string>;
}

describe('production start contract', () => {
  it('points start:prod at the emitted Nest entry file', () => {
    const projectRoot = resolve(__dirname, '../..');
    const manifest = JSON.parse(
      readFileSync(resolve(projectRoot, 'package.json'), 'utf8'),
    ) as PackageManifest;
    const command = manifest.scripts?.['start:prod'];

    expect(command).toBe('node dist/src/main.js');
    expect(existsSync(resolve(projectRoot, 'dist/src/main.js'))).toBe(true);
  });
});
