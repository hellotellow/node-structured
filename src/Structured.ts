import fs from 'fs'
import path from 'path'
import fg from 'fast-glob'
import * as changeCase from 'change-case'
import Handlebars from 'handlebars'
import { parseForESLint } from '@typescript-eslint/parser'
import minimatch from 'minimatch'

for (const [name, fn] of Object.entries(changeCase)) {
  Handlebars.registerHelper(name, text => (fn as Function)(text))
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)

    // Explicitly set prototype, otherwise instanceof won't work
    Object.setPrototypeOf(this, ConfigError.prototype)
  }
}

export class LintError extends Error {
  constructor(readonly path: string, message: string) {
    super(message)

    // Explicitly set prototype, otherwise instanceof won't work
    Object.setPrototypeOf(this, LintError.prototype)
  }
}

export class LintErrors extends Error {
  constructor(message: string, readonly validationErrors: LintError[]) {
    super(message)

    // Explicitly set prototype, otherwise instanceof won't work
    Object.setPrototypeOf(this, LintErrors.prototype)
  }
}

function match(matchTemplate: string | undefined, glob: string, fileOrFolderPath: string) {
  if (typeof matchTemplate !== 'string' || !matchTemplate) {
    return
  }
  const template = Handlebars.compile(matchTemplate)
  const baseName = path.basename(fileOrFolderPath)
  const name = baseName.replace(path.basename(glob).replace('*', ''), '')
  // console.log('found file or folder', fileOrFolderPath, name)
  if (template({ name }) !== baseName) {
    throw new LintError(fileOrFolderPath, `No match: "${baseName}" does not match "${matchTemplate}"`)
  }
}

function isAllowed(config: any, importPackageOrPath: string, filePath: string, cwd: string) {
  function find(rules: any[]) {
    return rules.find((rule: any) => {
      if (typeof rule === 'string') {
        return importPackageOrPath === rule || importPackageOrPath.startsWith(`${rule}/`)
      }
      if (rule.glob) {
        // Import file
        const absolutePath = path.relative(cwd, path.resolve(path.dirname(filePath), importPackageOrPath))

        return minimatch(importPackageOrPath, rule.glob) || minimatch(absolutePath, rule.glob)
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

export type Options = {
  folders: { [glob: string]: any }
  files: { [glob: string]: any }
}

export default class Structured {
  constructor(private cwd: string, private options: Options) {}

  async lint() {
    const trackedFolders: string[] = []
    const trackedFiles: string[] = []
    const errors: LintError[] = []

    for (const [glob, config] of Object.entries(this.options.folders)) {
      if (!glob.endsWith('/')) {
        throw new ConfigError(`Folder glob "${glob}" must end with slash for readability`)
      }

      const folders = await fg(glob.replace(/\/$/, ''), { cwd: this.cwd, onlyDirectories: true, markDirectories: true })

      if (!folders.length) {
        errors.push(new LintError(glob, 'No folders found'))
      }

      for (const foundFolder of folders) {
        trackedFolders.push(foundFolder)

        try {
          match(config.match, glob, foundFolder)
        } catch (err) {
          errors.push(err)
        }
      }
    }

    for (const [glob, config] of Object.entries(this.options.files)) {
      if (glob.endsWith('/')) {
        throw new ConfigError(`File glob "${glob}" must not end with slash`)
      }

      const files = await fg(glob.replace(/\/$/, ''), { cwd: this.cwd, onlyFiles: true, dot: true })

      if (!files.length) {
        errors.push(new LintError(glob, 'No files found'))
      }

      for (const foundFile of files) {
        trackedFiles.push(foundFile)

        try {
          match(config.match, glob, foundFile)
        } catch (err) {
          errors.push(err)
        }

        if (config.imports || config.exports) {
          const code = fs.readFileSync(foundFile, 'utf8')
          const ast = parseForESLint(code, {
            ecmaVersion: 6,
            sourceType: 'module',
          }).ast
          // console.log(glob, foundFile, config, code, ast)

          const imports = ast.body
            .filter(item => item.type === 'ImportDeclaration')
            .map(item => (item as any).source.value)
          // console.log(imports)

          for (const importPackageOrPath of imports) {
            try {
              isAllowed(config.imports, importPackageOrPath, foundFile, this.cwd)
            } catch (err) {
              errors.push(err)
            }
          }

          for (const [exportName, _config] of Object.entries(config.exports || {})) {
            const config2 = _config as any

            const type = exportName === 'default' ? 'ExportDefaultDeclaration' : 'ExportNamedDeclaration'
            const item = ast.body.find(item => item.type === type) as any

            // TODO Add strict mode: no untracked exports?
            if (!item) {
              errors.push(new LintError(foundFile, `Missing "${exportName}" export`))
            }

            if (config.type === 'class' && item.declaration.type !== 'ClassDeclaration') {
              errors.push(new LintError(foundFile, `Expected "${exportName}" export to be a class`))
            } else {
              if (typeof config2.match === 'string' && config2.match) {
                const template = Handlebars.compile(config2.match)
                const baseName = path.basename(foundFile)
                const name = baseName.replace(path.basename(glob).replace('*', ''), '')
                const expected = template({ name })
                const actual = item.declaration?.id?.name || item.declaration?.name

                if (expected !== actual) {
                  errors.push(new LintError(foundFile, `No match: "${actual}" does not match "${expected}"`))
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
            const template = Handlebars.compile(requiredFileTemplate)
            const baseName = path.basename(foundFile)
            const name = baseName.replace(path.basename(glob).replace('*', ''), '')
            const requiredFile = path.resolve(path.dirname(foundFile), template({ name }))

            if (fs.existsSync(requiredFile) && fs.statSync(requiredFile).isFile()) {
              trackedFiles.push(requiredFile)
            } else {
              errors.push(new LintError(foundFile, `Requires other file: "${path.relative(this.cwd, requiredFile)}"`))
            }
          }
        }
      }
    }

    for (const [glob, config] of Object.entries(this.options.folders)) {
      if (!glob.endsWith('/')) {
        throw new ConfigError(`Folder glob "${glob}" must end with slash for readability`)
      }

      if (config.allowUntrackedFiles !== false) {
        continue
      }

      const filesInFolder = await fg(glob + '**/*', { cwd: this.cwd, onlyFiles: true, dot: true })

      for (const trackedFile of trackedFiles) {
        const index = filesInFolder.indexOf(trackedFile)
        if (index !== -1) {
          filesInFolder.splice(index, 1)
          // trackedFiles.splice(trackedFiles.indexOf(trackedFile), 1) // Remove from tracked files to prevent double errors?
        }
      }
      for (const untrackedFile of filesInFolder) {
        errors.push(new LintError(glob, `Untracked file is not allowed: "${untrackedFile}"`))
      }
    }

    if (errors.length > 1) {
      throw new LintErrors(`Found ${errors.length} problem${errors.length === 1 ? '' : 's'}`, errors)
    }
  }
}
