#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
import { Command } from 'commander';
import Conf from 'conf';
import { existsSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { blue, bold, cyan, green, red, yellow } from 'picocolors';
import type { InitialReturnValue } from 'prompts';
import prompts from 'prompts';
import updateCheck from 'update-check';
import { createApp, DownloadError } from './create-app';
import type { PackageManager } from './helpers/get-pkg-manager';
import { getPkgManager } from './helpers/get-pkg-manager';
import { isFolderEmpty } from './helpers/is-folder-empty';
import { validateNpmName } from './helpers/validate-pkg';
import packageJson from './package.json';

let projectPath: string = '';
let packageName: string = '';

const handleSigTerm = () => process.exit(0);

process.on('SIGINT', handleSigTerm);
process.on('SIGTERM', handleSigTerm);

const onPromptState = (state: {
  value: InitialReturnValue;
  aborted: boolean;
  exited: boolean;
}) => {
  if (state.aborted) {
    // If we don't re-enable the terminal cursor before exiting
    // the program, the cursor will remain hidden
    process.stdout.write('\x1B[?25h');
    process.stdout.write('\n');
    process.exit(1);
  }
};

const program = new Command(packageJson.name)
  .version(
    packageJson.version,
    '-v, --version',
    'Output the current version of @sai-tarun/create-npm-pkg.',
  )
  .argument(
    '[package-name]',
    'Name of the npm package. You can also use @scope/package-name',
  )
  .usage('[package-name] [options]')
  .helpOption('-h, --help', 'Display this help message.')
  .option(
    '--author <name>',
    'Specify the author name for the package. Ex: "John Doe"',
  )
  .option(
    '--description <text>',
    'Package description. Ex: "A package for my project"',
  )
  .option('--year <number>', 'Year to use in the LICENSE file. Ex: 2025')
  .option(
    '--use-npm',
    'Explicitly tell the CLI to bootstrap the application using npm.',
  )
  .option(
    '--use-pnpm',
    'Explicitly tell the CLI to bootstrap the application using pnpm.',
  )
  .option(
    '--use-yarn',
    'Explicitly tell the CLI to bootstrap the application using Yarn.',
  )
  .option(
    '--use-bun',
    'Explicitly tell the CLI to bootstrap the application using Bun.',
  )
  .option(
    '--reset, --reset-preferences',
    'Reset the preferences saved for @sai-tarun/create-npm-pkg.',
  )
  .option('--yes', 'Use saved preferences or defaults for unprovided options.')
  .action((name) => {
    // Commander does not implicitly support negated options. When they are used
    // by the user they will be interpreted as the positional argument (name) in
    // the action handler. See https://github.com/tj/commander.js/pull/1355
    if (name && !name.startsWith('--no-')) {
      projectPath = name;
      packageName = name;
    }
  })
  .allowUnknownOption()
  .parse(process.argv);

const opts = program.opts();
const { args } = program;

const packageManager: PackageManager = !!opts.useNpm
  ? 'npm'
  : !!opts.usePnpm
    ? 'pnpm'
    : !!opts.useYarn
      ? 'yarn'
      : !!opts.useBun
        ? 'bun'
        : getPkgManager();

async function run(): Promise<void> {
  const conf = new Conf({ projectName: '@sai-tarun/create-npm-pkg' });

  if (opts.resetPreferences) {
    const { resetPreferences } = await prompts({
      onState: onPromptState,
      type: 'toggle',
      name: 'resetPreferences',
      message: 'Would you like to reset the saved preferences?',
      initial: false,
      active: 'Yes',
      inactive: 'No',
    });
    if (resetPreferences) {
      conf.clear();
      console.log('The preferences have been reset successfully!');
    }
    process.exit(0);
  }

  if (typeof projectPath === 'string') {
    projectPath = basename(projectPath.trim());
  }

  if (typeof packageName === 'string') {
    packageName = packageName.trim();
  }

  if (!packageName) {
    const styledPackageName = blue('Package Name');
    const res = await prompts({
      onState: onPromptState,
      type: 'text',
      name: 'path',
      message: `${styledPackageName} (Name of the npm package. You can also use @scope/package-name)`,
      initial: 'my-pkg',
      validate: (name) => {
        const validation = validateNpmName(basename(resolve(name)));
        if (validation.valid) {
          return true;
        }
        return 'Invalid project name: ' + validation.problems[0];
      },
    });

    if (typeof res.path === 'string') {
      projectPath = basename(res.path.trim());
      packageName = res.path.trim();
    }
  }

  if (!packageName) {
    console.log(
      '\nPlease specify the package name:\n' +
        `  ${cyan(program.name())} ${green('<package-name>')}\n` +
        'For example:\n' +
        `  ${cyan(program.name())} ${green('my-npm-pkg')}\n\n` +
        `Run ${cyan(`${program.name()} --help`)} to see all options.`,
    );
    process.exit(1);
  }

  const appPath = resolve(projectPath);
  const appName = basename(appPath);

  const validation = validateNpmName(packageName);
  if (!validation.valid) {
    console.error(
      `Could not create a package called ${red(
        `"${packageName}"`,
      )} because of npm naming restrictions:`,
    );

    validation.problems.forEach((p) =>
      console.error(`    ${red(bold('*'))} ${p}`),
    );
    process.exit(1);
  }

  if (existsSync(appPath) && !isFolderEmpty(appPath, appName)) {
    process.exit(1);
  }

  const preferences = (conf.get('preferences') || {}) as Record<
    string,
    boolean | string
  >;

  /**
   * If the user does not provide the necessary flags, prompt them for their
   * preferences, unless `--yes` option was specified
   */
  const skipPrompt = opts.yes;

  const defaults: typeof preferences = {
    author: 'Author',
    description: 'Package description',
    year: new Date().getFullYear().toString(),
  };
  const getPrefOrDefault = (field: string) =>
    preferences[field] ?? defaults[field];

  if (!opts.author || typeof opts.author !== 'string') {
    if (skipPrompt) {
      opts.author = getPrefOrDefault('author');
    } else {
      const styledAuthor = blue('Author Name');
      const { author } = await prompts(
        {
          onState: onPromptState,
          type: 'text',
          name: 'author',
          message: `${styledAuthor} (for package.json and LICENSE)`,
          initial: getPrefOrDefault('author'),
        },
        {
          /**
           * User inputs Ctrl+C or Ctrl+D to exit the prompt. We should close the
           * process and not write to the file system.
           */
          onCancel: () => {
            console.error('Exiting.');
            process.exit(1);
          },
        },
      );
      if (typeof author === 'string') {
        opts.author = author;
        preferences.author = author;
      } else {
        console.error('Exiting.');
        process.exit(1);
      }
    }
  }

  if (!opts.description || typeof opts.description !== 'string') {
    if (skipPrompt) {
      opts.description = getPrefOrDefault('description');
    } else {
      const styledDescription = blue('Description');
      const { description } = await prompts(
        {
          onState: onPromptState,
          type: 'text',
          name: 'description',
          message: `${styledDescription} (for package.json)`,
          initial: getPrefOrDefault('description'),
        },
        {
          onCancel: () => {
            console.error('Exiting.');
            process.exit(1);
          },
        },
      );
      if (typeof description === 'string') {
        opts.description = description;
        preferences.description = description;
      } else {
        console.error('Exiting.');
        process.exit(1);
      }
    }
  }

  if (!opts.year || typeof opts.year !== 'string') {
    if (skipPrompt) {
      opts.year = getPrefOrDefault('year');
    } else {
      const styledYear = blue('Year');
      const { year } = await prompts(
        {
          onState: onPromptState,
          type: 'text',
          name: 'year',
          message: `${styledYear} (for LICENSE)`,
          initial: getPrefOrDefault('year'),
        },
        {
          onCancel: () => {
            console.error('Exiting.');
            process.exit(1);
          },
        },
      );
      if (typeof year === 'string') {
        opts.year = year;
        preferences.year = year;
      } else {
        console.error('Exiting.');
        process.exit(1);
      }
    }
  }

  try {
    await createApp({
      appPath,
      packageName,
      packageManager,
      author: opts.author,
      description: opts.description,
      year: opts.year,
    });
  } catch (reason) {
    if (!(reason instanceof DownloadError)) {
      throw reason;
    }
  }
  conf.set('preferences', preferences);
}

const update = updateCheck(packageJson).catch(() => null);

async function notifyUpdate(): Promise<void> {
  try {
    if ((await update)?.latest) {
      const global = {
        npm: 'npm i -g',
        yarn: 'yarn global add',
        pnpm: 'pnpm add -g',
        bun: 'bun add -g',
      };
      const updateMessage = `${global[packageManager]} @sai-tarun/create-npm-pkg`;
      console.log(
        yellow(
          bold('A new version of `@sai-tarun/create-npm-pkg` is available!'),
        ) +
          '\n' +
          'You can update by running: ' +
          cyan(updateMessage) +
          '\n',
      );
    }
    process.exit(0);
  } catch {
    // ignore error
  }
}

async function exit(reason: { command?: string }) {
  console.log();
  console.log('Aborting installation.');
  if (reason.command) {
    console.log(`  ${cyan(reason.command)} has failed.`);
  } else {
    console.log(
      red('Unexpected error. Please report it as a bug:') + '\n',
      reason,
    );
  }
  console.log();
  await notifyUpdate();
  process.exit(1);
}

run().then(notifyUpdate).catch(exit);
