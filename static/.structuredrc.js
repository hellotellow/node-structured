module.exports = {
  folders: {
    'src/': {
      allowUntrackedFiles: false,
    },
    // Example:
    // 'src/{controllers,services}/**/': {
    //   match: '{{camelCase name}}',
    // },
  },
  files: {
    'src/services/**/*.service.ts': {
      // See https://github.com/blakeembrey/change-case#core for available cases
      match: '{{camelCase name}}.service.ts',
      imports: {
        // Example: allow: ['lodash', { glob: 'lodash/get' }]
        deny: [
          // Example: 'lodash'
          { glob: 'src/controllers/**/*', message: 'Domain logic should not depend on application logic' },
        ],
      },
      exports: {
        default: {
          type: 'class',
          match: '{{pascalCase name}}Service',
        },
      },
      requires: ['./{{name}}.service.spec.ts'],
    },
  },
}
