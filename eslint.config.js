import js from '@eslint/js'
import ts from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'
import globals from 'globals'

export default [
  { files: [ '**/*.js', '**/*.ts' ] },
  { ignores: [ 'dist/**/*', '**/*.d.ts' ] },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.greasemonkey
      },
      ecmaVersion: 'latest'
    }
  },
  { plugins: { '@stylistic': stylistic } },
  js.configs.recommended,    // default eslint rules
  ...ts.configs.recommended, // default tslint rules
  { // Style Rules
    rules: {
      '@stylistic/indent': [
        'error',
        2,
        {
          SwitchCase: 1,
          offsetTernaryExpressions: true,
          MemberExpression: 0
        }
      ],
      '@stylistic/quotes': [
        'error',
        'single'
      ],
      '@stylistic/array-bracket-spacing': [
        'error',
        'always',
        {
          singleValue: true,
          arraysInArrays: false
        }
      ],
      '@stylistic/array-element-newline': [
        'error',
        'consistent',
        {
          ArrayExpression: 'always',
          ArrayPattern: 'never'
        }
      ],
      '@stylistic/arrow-parens': [
        'error',
        'as-needed'
      ],
      '@stylistic/arrow-spacing': [
        'error',
        {
          after: true,
          before: true
        }
      ],
      '@stylistic/brace-style': [
        'error',
        '1tbs'
      ],
      '@stylistic/camelcase': [
        'off',
        'error',
        {
          ignoreDestructuring: true,
          properties: 'never'
        }
      ],
      '@stylistic/comma-style': [
        'error',
        'last'
      ],
      '@stylistic/comma-dangle': 'error',
      '@stylistic/dot-location': [
        'error',
        'property'
      ],
      '@stylistic/eol-last': 'error',
      '@stylistic/implicit-arrow-linebreak': [
        'error',
        'beside'
      ],
      '@stylistic/keyword-spacing': [
        'error',
        {
          after: true,
          before: true
        }
      ],
      '@stylistic/linebreak-style': [
        'error',
        'unix'
      ],
      '@stylistic/lines-between-class-members': [
        'error',
        {
          enforce: [
            { blankLine: 'always', prev: 'method', next: 'method' }
          ]
        },
        {
          exceptAfterOverload: true,
          exceptAfterSingleLine: true
        }
      ],
      '@stylistic/multiline-comment-style': [
        'error',
        'separate-lines',
        {
          checkJSDoc: false
        }
      ],
      '@stylistic/newline-per-chained-call': [
        'error', {
          ignoreChainWithDepth: 3
        }
      ],
      '@stylistic/no-multi-spaces': [
        'error',
        {
          ignoreEOLComments: true
        }
      ],
      '@stylistic/object-curly-spacing': [
        'error',
        'always'
      ]
    }
  },
  { // eslint Rules
    rules: {
      'no-console': 'error',
      'no-warning-comments': [
        'warn',
        {
          terms: [
            'todo',
            'fixme',
            'xxx',
            'temp'
          ],
          location: 'start'
        }
      ],
      'no-mixed-operators': 'error',
      'no-multi-assign': 'error',
      'no-underscore-dangle': [
        'error',
        {
          allowAfterThis: true,
          allowAfterSuper: true
        }
      ],
      'no-unused-private-class-members': 'off',
      'no-unused-vars': [
        'error',
        {
          args: 'none',
          destructuredArrayIgnorePattern: '^_$'
        }
      ],
      'func-style': [
        'error',
        'declaration',
        {
          allowArrowFunctions: true
        }
      ],
      'dot-notation': [
        'error',
        {
          allowKeywords: true
        }
      ],
      'eqeqeq': [
        'error',
        'always',
        {
          null: 'ignore'
        }
      ],
      'no-empty': [
        'error',
        {
          allowEmptyCatch: true
        }
      ]
    }
  },
  { // tslint Rules
    rules: {
      '@typescript-eslint/no-empty-object-type': [
        'error',
        {
          allowInterfaces: 'with-single-extends'
        }
      ],
      '@typescript-eslint/no-explicit-any': [
        'off',
        {
          ignoreRestArgs: true
        }
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'none',
          destructuredArrayIgnorePattern: '^_$'
        }
      ]
    }
  }
]
