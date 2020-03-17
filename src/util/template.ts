import Handlebars from 'handlebars'
import * as changeCase from 'change-case'

for (const [name, fn] of Object.entries(changeCase)) {
  Handlebars.registerHelper(name, text => (fn as Function)(text))
}

export default function createTemplate(source: string): (data: { [name: string]: any }) => string {
  return Handlebars.compile(source)
}
