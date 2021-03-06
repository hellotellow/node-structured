import { Argv } from 'yargs'
import chalk from 'chalk'
import { cosmiconfig } from 'cosmiconfig'
import { Structured } from '../Structured'
import { LintErrors } from '../LintError'

export const command = 'lint'
export const aliases = ['$0'] // Default
export const desc = 'Linting your folders, files, imports and exports.'
export const builder = {}

export async function handler(argv: Argv) {
  const result = await cosmiconfig('structured').search()

  if (!result) {
    console.error(chalk.red('No configuration found!'))
    process.exit(1)
  }

  const structured = new Structured(process.cwd(), result.config)

  try {
    await structured.lint()
    console.info(chalk.green('Your code structure is as beautiful as it should be! ❤️'))
  } catch (err) {
    if (!(err instanceof LintErrors)) {
      throw err
    }

    console.error(chalk.bold.red(`${err.message}:`))

    for (const error of err.lintErrors) {
      console.error(`  ${error.path}`)
      console.error(chalk.red(`    ${error.message}`))
    }

    process.exit(1)
  }
}
