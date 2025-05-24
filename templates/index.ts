import { install } from '../helpers/install';
import { copy } from '../helpers/copy';

import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { cyan, bold } from 'picocolors';

import { GetTemplateFileArgs, InstallTemplateArgs } from './types';

/**
 * Get the file path for a given file in a template, e.g. "tsconfig.json".
 */
export const getTemplateFile = ({
  template,
  mode,
  file,
}: GetTemplateFileArgs): string => {
  return path.join(__dirname, template, mode, file);
};

export const SRC_DIR_NAMES = [];

/**
 * Install a create-npm-pkg internal template to a given `root` directory.
 */
export const installTemplate = async ({
  packageName,
  root,
  packageManager,
  isOnline,
  template,
  mode,
  author,
  description,
  year,
}: InstallTemplateArgs) => {
  console.log(bold(`Using ${packageManager}.`));

  /**
   * Copy the template files to the target directory.
   */
  console.log('\nInitializing project with template:', template, '\n');
  const templatePath = path.join(__dirname, template, mode);
  const copySource = ['**'];

  await copy(copySource, root, {
    parents: true,
    cwd: templatePath,
    rename(name) {
      switch (name) {
        case 'gitignore': {
          return `.${name}`;
        }
        // README.md is ignored by webpack-asset-relocator-loader used by ncc:
        // https://github.com/vercel/webpack-asset-relocator-loader/blob/e9308683d47ff507253e37c9bcbb99474603192b/src/asset-relocator.js#L227
        case 'README-template.md': {
          return 'README.md';
        }
        case 'gitignore':
        case 'prettierrc': {
          return `.${name}`;
        }
        default: {
          return name;
        }
      }
    },
    renameDir(name) {
      if (name.includes('github') || name.includes('changeset')) {
        return `.${name}`;
      }
      return name;
    },
  });

  // Replace the author and year in the LICENSE file
  const licensePath = path.join(root, 'LICENSE');
  const license = await fs.readFile(licensePath, 'utf8');
  const newLicense = license
    .replace('[Author]', author)
    .replace('[Year]', year);
  await fs.writeFile(licensePath, newLicense);

  /** Create a package.json for the new project and write it to disk. */
  const packageJson: any = {
    name: packageName,
    version: '0.0.1',
    description,
    keywords: [],
    author,
    license: 'MIT',
    main: 'dist/index.js',
    files: ['dist'],
    homepage: '',
    bugs: {
      url: '',
    },
    repository: {
      type: 'git',
      url: '',
    },
    type: 'module',
    scripts: {
      ci: 'npm run build && npm run check-format && npm run check-exports && npm run test',
      'check-format': 'prettier --check .',
      'check-exports': 'attw --pack . --ignore-rules=cjs-resolves-to-esm',
      test: 'vitest run',
      dev: 'vitest',
      build: 'tsc',
      format: 'prettier --write .',
      prepublishOnly: 'npm run ci',
      'local-release': 'changeset version && changeset publish',
    },
    devDependencies: {
      '@arethetypeswrong/cli': '^0.18.1',
      '@changesets/cli': '^2.29.4',
      prettier: '^3.5.3',
      typescript: '^5.8.3',
      vitest: '^3.1.3',
    },
  };

  await fs.writeFile(
    path.join(root, 'package.json'),
    JSON.stringify(packageJson, null, 2) + os.EOL,
  );

  console.log('\nInstalling dependencies:');
  for (const dependency in packageJson.dependencies)
    console.log(`- ${cyan(dependency)}`);

  console.log('\nInstalling devDependencies:');
  for (const dependency in packageJson.devDependencies)
    console.log(`- ${cyan(dependency)}`);

  console.log();

  await install(packageManager, isOnline);

  // Change the version to 0.0.0
  packageJson.version = '0.0.0';
  await fs.writeFile(
    path.join(root, 'package.json'),
    JSON.stringify(packageJson, null, 2) + os.EOL,
  );
};

export * from './types';
