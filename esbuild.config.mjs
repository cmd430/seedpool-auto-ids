import { readFile, writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import * as esbuild from 'esbuild'
import { userscriptMetadataGenerator } from 'userscript-metadata-generator'

/* eslint-disable no-console */

// eslint-disable-next-line no-undef
const args = Bun.argv.slice(2)
function hasArg (arg) {
  return args.includes(`--${arg}`)
}
const isProduction = hasArg('prod') && !hasArg('dev')
const isDevelopment = !isProduction
const isWatching = hasArg('watch')


// Bump the version on release
if (isProduction) {
  const oldMeta = JSON.parse(await readFile('./meta.json', 'utf8'))
  const newMeta = JSON.stringify(oldMeta, (key, value) => {
    if (key !== 'version') return value

    const [ major, minor, patch ] = value.split('.')
    return [ major, minor, Number(patch) + 1 ].join('.')
  }, 2)

  await writeFile('./meta.json', newMeta, 'utf8')
}

async function userScriptMeta () {
  const scriptData = JSON.parse(await readFile('./meta.json', 'utf8'))

  if (isDevelopment) {
    const [ major, minor, patch ] = scriptData.version.split('.')

    scriptData.version = [ major, minor, Number(patch) + 1 ].join('.')
    scriptData.description = `${scriptData.description} [DevBuild]`
  }

  return {
    js: userscriptMetadataGenerator(scriptData)
  }
}

const pluginBuildInfo = () => ({
  name: 'build-info',
  setup (build) {
    let startTime = 0

    build.onStart(() => {
      startTime = performance.now()
      console.log('')
      console.log('build started')
    })

    build.onEnd(result => {
      const timetaken = performance.now() - startTime
      console.log(`build finished in ${timetaken.toFixed(0)}ms with ${result.errors.length} errors`)
    })
  }
})

const pluginStripSecrets = () => ({
  name: 'strip-secrets',
  setup (build) {
    const filter = /.*/
    const namespace = ''

    build.onLoad({ filter, namespace }, async args => {
      let contents = await readFile(args.path, 'utf8')

      if (!isDevelopment && contents.startsWith('export const TMDB_API_KEY = ')) {
        contents = 'export const TMDB_API_KEY = \'\''
      }

      return {
        contents: contents,
        loader: 'ts'
      }
    })
  }
})

const buildConfig = {
  entryPoints: [ 'src/seedpoolAutoIds.ts' ],
  bundle: true,
  format: 'esm',
  tsconfig: 'tsconfig.json',
  banner: await userScriptMeta(),
  keepNames: true,
  minifyWhitespace: false,
  minifyIdentifiers: false,
  minifySyntax: false,
  sourcemap: isDevelopment ? 'inline' : false,
  legalComments: 'none',
  outfile: isDevelopment ? 'dist/seedpoolAutoIds.dev.user.js' : 'dist/seedpoolAutoIds.user.js',
  plugins: [
    pluginBuildInfo(),
    pluginStripSecrets()
  ]
}

if (isWatching) {
  const ctx = await esbuild.context(buildConfig)
  await ctx.watch()
  console.clear()
  console.log(`building for ${isProduction ? 'production' : 'development'}`)
  console.log('watching for changes')
} else {
  console.clear()
  console.log(`building for ${isProduction ? 'production' : 'development'}`)
  await esbuild.build(buildConfig)
  console.log('')
}
