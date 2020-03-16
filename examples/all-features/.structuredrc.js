module.exports = {
  folders: {
    'src/': {
      allowUntrackedFiles: false,
    },
    'src/{controllers,services}/**/': {
      match: '{{camelCase name}}',
    },
  },
  files: {
    'src/controllers/**/*.controller.ts': {
      match: '{{camelCase name}}.controller.ts',
      imports: {
        // disallow: 'all',
        // allow: ['lodash'],
        disallow: [
          // { glob: 'src/**/*', message: 'Not allowed for reason X' },
          // { package: 'underscore', message: 'Use lodash instead' }
          // 'lodash',
        ],
      },
      exports: {
        default: {
          type: 'class',
          match: '{{pascalCase name}}Controller',
        },
      },
      requires: ['./{{name}}.controller.spec.ts'],
    },
    'src/services/**/*.service.ts': {
      match: '{{camelCase name}}.service.ts',
      imports: {
        disallow: [
          { glob: 'src/controllers/**/*', message: 'Domain logic should not depend on application logic' },
          'lodash',
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
