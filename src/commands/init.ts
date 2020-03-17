import fs from 'fs'
import path from 'path'
import { Argv } from 'yargs'
import { cosmiconfig } from 'cosmiconfig'
import chalk from 'chalk'

export const command = 'init'
export const desc = 'Create configuration file.'
export const builder = {}

export async function handler(argv: Argv) {
  const result = await cosmiconfig('structured').search()

  if (result) {
    console.error(`${chalk.red('Configuration already exists at:')} ${path.relative(process.cwd(), result.filepath)}`)
    process.exit(1)
  }

  const templateConfigFile = path.resolve(__dirname, '../../static/.structuredrc.js')
  const configFile = '.structuredrc.js'
  fs.writeFileSync(configFile, fs.readFileSync(templateConfigFile, 'utf8'), 'utf8')
  console.error(`${chalk.green('Created configuration at:')} ${path.relative(process.cwd(), configFile)}`)
}
