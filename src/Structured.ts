import fs from 'fs'
import path from 'path'
import fg from 'fast-glob'
import { parseForESLint } from '@typescript-eslint/parser'
import minimatch from 'minimatch'
import ConfigError from './ConfigError'
import LintError, { LintErrors } from './LintError'
import createTemplate from './util/template'

export type Options = {
  folders: { [glob: string]: any }
  files: { [glob: string]: any }
}

export default class Structured {
  private trackedFolders: string[] = []
  private trackedFiles: string[] = []
  private errors: LintError[] = []

  constructor(private cwd: string, private options: Options) {}

  async lint() {
    this.prepare()
    await this.checkFolders()
    await this.checkFiles()
    await this.checkUntrackedFiles()
    this.checkErrors()
  }

  private prepare() {
    this.trackedFolders = []
    this.trackedFiles = []
    this.errors = []

    // TODO Validate config object
  }

  private async checkFolders() {
    for (const [glob, config] of Object.entries(this.options.folders)) {
      if (!glob.endsWith('/')) {
        throw new ConfigError(`Folder glob "${glob}" must end with slash for readability`)
      }

      const folders = await fg(glob.replace(/\/$/, ''), { cwd: this.cwd, onlyDirectories: true, markDirectories: true })

      if (!folders.length) {
        this.errors.push(new LintError(glob, 'No folders found'))
      }

      for (const foundFolder of folders) {
        this.trackedFolders.push(foundFolder)

        try {
          this.assertMatch(config.match, glob, foundFolder)
        } catch (err) {
          this.errors.push(err)
        }
      }
    }
  }

  private async checkFiles() {
    for (const [glob, config] of Object.entries(this.options.files)) {
      if (glob.endsWith('/')) {
        throw new ConfigError(`File glob "${glob}" must not end with slash`)
      }

      const files = await fg(glob.replace(/\/$/, ''), { cwd: this.cwd, onlyFiles: true, dot: true })

      if (!files.length) {
        this.errors.push(new LintError(glob, 'No files found'))
      }

      for (const foundFile of files) {
        this.trackedFiles.push(foundFile)

        try {
          this.assertMatch(config.match, glob, foundFile)
        } catch (err) {
          this.errors.push(err)
        }

        if (config.imports || config.exports) {
          const code = fs.readFileSync(foundFile, 'utf8')
          const ast = parseForESLint(code, {
            ecmaVersion: 6,
            sourceType: 'module',
          }).ast

          const imports = ast.body
            .filter(item => item.type === 'ImportDeclaration')
            .map(item => (item as any).source.value)

          for (const importPackageOrPath of imports) {
            try {
              this.checkImportAllowed(config.imports, importPackageOrPath, foundFile, this.cwd)
            } catch (err) {
              this.errors.push(err)
            }
          }

          for (const [exportName, _config] of Object.entries(config.exports || {})) {
            const config2 = _config as any

            const type = exportName === 'default' ? 'ExportDefaultDeclaration' : 'ExportNamedDeclaration'
            const item = ast.body.find(item => item.type === type) as any

            if (!item) {
              this.errors.push(new LintError(foundFile, `Missing "${exportName}" export`))
            }

            if (config.type === 'class' && item.declaration.type !== 'ClassDeclaration') {
              this.errors.push(new LintError(foundFile, `Expected "${exportName}" export to be a class`))
            } else {
              if (typeof config2.match === 'string' && config2.match) {
                const template = createTemplate(config2.match)
                const baseName = path.basename(foundFile)
                const name = baseName.replace(path.basename(glob).replace('*', ''), '')
                const expected = template({ name })
                const actual = item.declaration?.id?.name || item.declaration?.name

                if (expected !== actual) {
                  this.errors.push(new LintError(foundFile, `No match: "${actual}" does not match "${expected}"`))
                }
              }
            }
          }
        }

        if (config.requires) {
          if (!Array.isArray(config.requires)) {
            throw new ConfigError(`Invalid "requires" option for glob "${glob}" (must be array)`)
          }

          for (const requiredFileTemplate of config.requires) {
            const template = createTemplate(requiredFileTemplate)
            const baseName = path.basename(foundFile)
            const name = baseName.replace(path.basename(glob).replace('*', ''), '')
            const requiredFile = path.resolve(path.dirname(foundFile), template({ name }))

            if (fs.existsSync(requiredFile) && fs.statSync(requiredFile).isFile()) {
              this.trackedFiles.push(requiredFile)
            } else {
              this.errors.push(
                new LintError(foundFile, `Requires other file: "${path.relative(this.cwd, requiredFile)}"`),
              )
            }
          }
        }
      }
    }
  }

  private async checkUntrackedFiles() {
    for (const [glob, config] of Object.entries(this.options.folders)) {
      if (!glob.endsWith('/')) {
        throw new ConfigError(`Folder glob "${glob}" must end with slash for readability`)
      }

      if (config.allowUntrackedFiles !== false) {
        continue
      }

      const filesInFolder = await fg(glob + '**/*', { cwd: this.cwd, onlyFiles: true, dot: true })

      for (const trackedFile of this.trackedFiles) {
        const index = filesInFolder.indexOf(trackedFile)
        if (index !== -1) {
          filesInFolder.splice(index, 1)
          // trackedFiles.splice(trackedFiles.indexOf(trackedFile), 1) // Remove from tracked files to prevent double errors?
        }
      }
      for (const untrackedFile of filesInFolder) {
        this.errors.push(new LintError(glob, `Untracked file is not allowed: "${untrackedFile}"`))
      }
    }
  }

  private checkErrors() {
    if (this.errors.length > 1) {
      throw new LintErrors(`Found ${this.errors.length} problem${this.errors.length === 1 ? '' : 's'}`, this.errors)
    }
  }

  private assertMatch(matchTemplate: string | undefined, glob: string, fileOrFolderPath: string): void {
    if (typeof matchTemplate !== 'string' || !matchTemplate) {
      return
    }
    const template = createTemplate(matchTemplate)
    const baseName = path.basename(fileOrFolderPath)
    const name = baseName.replace(path.basename(glob).replace('*', ''), '')
    if (template({ name }) !== baseName) {
      throw new LintError(fileOrFolderPath, `No match: "${baseName}" does not match "${matchTemplate}"`)
    }
  }

  private checkImportAllowed(config: any, importPackageOrPath: string, filePath: string, cwd: string): void {
    function find(rules: any[]) {
      return rules.find((rule: any) => {
        if (typeof rule === 'string') {
          return importPackageOrPath === rule || importPackageOrPath.startsWith(`${rule}/`)
        }
        if (rule.glob) {
          const importPackage = importPackageOrPath
          const importPath = path.relative(cwd, path.resolve(path.dirname(filePath), importPackageOrPath))

          return minimatch(importPackage, rule.glob) || minimatch(importPath, rule.glob)
        }
        return false
      })
    }

    if (Array.isArray(config.allow)) {
      const found = find(config.allow)

      if (found) {
        return
      }
    }

    if (Array.isArray(config.disallow)) {
      const found = find(config.disallow)

      if (found) {
        throw new LintError(
          filePath,
          `Import "${importPackageOrPath}" not allowed${found.message ? ': ' + found.message : ''}`,
        )
      }
    }
  }
}
