/* eslint-disable import/no-extraneous-dependencies */
import { mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { cyan, green } from 'picocolors';
import type { PackageManager } from './helpers/get-pkg-manager';
import { isFolderEmpty } from './helpers/is-folder-empty';
import { getOnline } from './helpers/is-online';
import { isWriteable } from './helpers/is-writeable';

import { installTemplate, TemplateMode, TemplateType } from './templates';

export class DownloadError extends Error {}

export async function createApp({
  appPath,
  packageName,
  packageManager,
  author,
  description,
  year,
}: {
  appPath: string;
  packageName: string;
  packageManager: PackageManager;
  author: string;
  description: string;
  year: string;
}): Promise<void> {
  const mode: TemplateMode = 'ts';
  const template: TemplateType = 'default';

  const root = resolve(appPath);

  if (!(await isWriteable(dirname(root)))) {
    console.error(
      'The application path is not writable, please check folder permissions and try again.',
    );
    console.error(
      'It is likely you do not have write permissions for this folder.',
    );
    process.exit(1);
  }

  const appName = basename(root);

  mkdirSync(root, { recursive: true });
  if (!isFolderEmpty(root, appName)) {
    process.exit(1);
  }

  const useYarn = packageManager === 'yarn';
  const isOnline = !useYarn || (await getOnline());
  const originalDirectory = process.cwd();

  console.log(`Creating a new npm package in ${green(root)}.`);
  console.log();

  process.chdir(root);

  const packageJsonPath = join(root, 'package.json');
  let hasPackageJson = false;

  await installTemplate({
    packageName,
    root,
    template: template,
    mode,
    packageManager,
    isOnline,
    author,
    description,
    year,
  });

  let cdpath: string;
  if (join(originalDirectory, appName) === appPath) {
    cdpath = appName;
  } else {
    cdpath = appPath;
  }

  console.log(`${green('Success!')} Created ${appName} at ${appPath}`);

  if (hasPackageJson) {
    console.log('Inside that directory, you can run several commands:');
    console.log();
    console.log(cyan(`  ${packageManager} ${useYarn ? '' : 'run '}dev`));
    console.log('    Starts the development server.');
    console.log();
    console.log(cyan(`  ${packageManager} ${useYarn ? '' : 'run '}build`));
    console.log('    Builds the app for production.');
    console.log();
    console.log(cyan(`  ${packageManager} start`));
    console.log('    Runs the built app in production mode.');
    console.log();
    console.log('We suggest that you begin by typing:');
    console.log();
    console.log(cyan('  cd'), cdpath);
    console.log(`  ${cyan(`${packageManager} ${useYarn ? '' : 'run '}dev`)}`);
  }
  console.log();
}
