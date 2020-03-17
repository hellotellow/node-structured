#!/usr/bin/env node
import yargs from 'yargs'
import * as initCommand from '../commands/init'
import * as lintCommand from '../commands/lint'

yargs
  .scriptName('structured')
  .command(initCommand)
  .command(lintCommand)
  .demandCommand(1, 'Please specify command')
  .help().argv
