/**
 * Binary locator for the agi-driver.
 *
 * Finds the platform-specific binary bundled with the package
 * or falls back to a global installation.
 */

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { platform, arch } from 'os';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

/**
 * Platform identifier for binary selection.
 */
export type PlatformId = 'darwin-arm64' | 'darwin-x64' | 'linux-x64' | 'windows-x64';

/**
 * Get the current platform identifier.
 */
export function getPlatformId(): PlatformId {
  const os = platform();
  const cpu = arch();

  if (os === 'darwin') {
    return cpu === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
  } else if (os === 'linux') {
    return 'linux-x64';
  } else if (os === 'win32') {
    return 'windows-x64';
  }

  throw new Error(`Unsupported platform: ${os}-${cpu}`);
}

/**
 * Get the binary filename for the current platform.
 */
export function getBinaryFilename(platformId?: PlatformId): string {
  const id = platformId ?? getPlatformId();
  if (id === 'windows-x64') {
    return 'agi-driver.exe';
  }
  return 'agi-driver';
}

/**
 * Search paths for the binary.
 */
function getSearchPaths(platformId: PlatformId): string[] {
  const filename = getBinaryFilename(platformId);
  const paths: string[] = [];

  // 1. Optional dependency package (e.g., @agi/agi-darwin-arm64)
  const packageName = `@agi/agi-${platformId}`;
  try {
    const packagePath = require.resolve(`${packageName}/package.json`);
    const packageDir = dirname(packagePath);
    paths.push(join(packageDir, filename));
  } catch {
    // Package not installed
  }

  // 2. Bundled in this package's bin directory
  paths.push(join(__dirname, '..', '..', 'bin', filename));
  paths.push(join(__dirname, '..', '..', '..', 'bin', filename));

  // 3. Global installation (in PATH)
  const envPath = process.env.PATH || '';
  for (const dir of envPath.split(':')) {
    if (dir) {
      paths.push(join(dir, filename));
    }
  }

  return paths;
}

/**
 * Check if we can use Python to run the driver module directly.
 * This is a development fallback when the binary isn't compiled.
 */
export function canUsePythonFallback(): boolean {
  // Check if AGI_DRIVER_PATH points to a Python module
  const driverPath = process.env.AGI_DRIVER_PATH;
  if (driverPath && existsSync(join(driverPath, '__main__.py'))) {
    return true;
  }
  return false;
}

/**
 * Get the Python fallback command and args.
 * Returns null if not available.
 */
export function getPythonFallback(): { command: string; args: string[] } | null {
  const driverPath = process.env.AGI_DRIVER_PATH;
  if (driverPath && existsSync(join(driverPath, '__main__.py'))) {
    return {
      command: process.env.PYTHON_PATH || 'python',
      args: ['-m', 'agi_driver'],
    };
  }
  return null;
}

/**
 * Find the agi-driver binary path.
 *
 * @throws Error if the binary cannot be found
 */
export function findBinaryPath(): string {
  const platformId = getPlatformId();
  const searchPaths = getSearchPaths(platformId);

  for (const path of searchPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error(
    `Could not find agi-driver binary for ${platformId}. ` +
      `Searched: ${searchPaths.join(', ')}. ` +
      `Install the optional dependency @agi/agi-${platformId} or ensure agi-driver is in PATH.`
  );
}

/**
 * Check if the binary is available.
 */
export function isBinaryAvailable(): boolean {
  try {
    findBinaryPath();
    return true;
  } catch {
    return false;
  }
}
