#!/usr/bin/env node
import { cosmiconfig } from 'cosmiconfig'
import chalk from 'chalk'
import Structured, { LintErrors } from './Structured'

async function run() {
  const explorer = cosmiconfig('structured')
  const result = await explorer.search()

  if (!result) {
    // TODO Prompt to create configuration, unless --no-interactive
    throw new Error('No config found!')
  }

  const structured = new Structured(process.cwd(), result.config)

  try {
    await structured.lint()
  } catch (err) {
    if (!(err instanceof LintErrors)) {
      throw err
    }

    console.error(chalk.bold.red(`${err.message}:`))
    // TODO Group by path
    for (const error of err.validationErrors) {
      console.error(`  ${error.path}`)
      console.error(chalk.red(`    ${error.message}`))
    }
    process.exit(1)
  }
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
