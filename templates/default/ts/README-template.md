## Created by @sai-tarun/create-npm-pkg

This project was created by @sai-tarun/create-npm-pkg.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Instructions:

In `package.json`:

1. Add `keywords`: Short descriptions of your package. They're listed in searches in the npm registry.
   Example:

   ```json
   {
     "keywords": ["Demo", "Package"]
   }
   ```

2. Add `homepage`: The URL of your package's homepage. The GitHub repo is a good default, or a docs site if you have one.
   Example:

   ```json
   {
     "homepage": "https://github.com/your-username/your-package-name"
   }
   ```

3. Add `bugs`: The URL where people can report issues with your package.
   Example:

   ```json
   {
     "bugs": {
       "url": "https://github.com/your-username/your-package-name/issues"
     }
   }
   ```

4. Add `repository`: The URL of your package's repository. This creates a link on the npm registry to your GitHub repo.
   Example:
   ```json
   {
     "repository": {
       "type": "git",
       "url": "git+https://github.com/your-username/your-package-name.git"
     }
   }
   ```

## Adding a new feature

You can create a new file in the `src` directory and import the exported function to `index.ts` and export it.

```ts
// src/index.ts
import { hello } from './index';

export { hello };
```

## Usage

```ts
// src/index.ts
import { hello } from '<your-package-name>';
```

## Publishing the changes

### Create a new changeset file

```bash
npx changeset
```

This will create a changeset file that will be used to create a new version.

### Commit the changes and push to the remote repository.

This will trigger a github action to check if the changes are valid.

### Run the local-release script

```bash
npm run local-release
```

This will:

- Run the tests
- Build the package
- Create a new version from the changeset file and update the package.json file, CHANGELOG.md file
- Commit the changes and push to the remote repository.
- Publish the package to npm
