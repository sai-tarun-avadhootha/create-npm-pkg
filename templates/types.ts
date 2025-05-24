import { PackageManager } from '../helpers/get-pkg-manager';

export type TemplateType = 'default';
export type TemplateMode = 'ts';

export interface GetTemplateFileArgs {
  template: TemplateType;
  mode: TemplateMode;
  file: string;
}

export interface InstallTemplateArgs {
  packageName: string;
  root: string;
  packageManager: PackageManager;
  isOnline: boolean;
  template: TemplateType;
  mode: TemplateMode;
  author: string;
  description: string;
  year: string;
}
