import { TMDB_API_KEY } from './secrets'
import { API } from './API'
import { GUI } from './GUI'
import { UNIT3D } from './UNIT3D'

const validPages = [
  /\/torrents$/,
  /\/torrents\/\d+$/,
  /\/similar\/[\d.]+$/,
  /\/edit$/,
  /\/create$/
]

let unit3d: UNIT3D | undefined
for (const page of validPages) {
  if (!page.test(location.pathname) || unit3d) continue

  // ony run when page is in the list of valid pages
  unit3d = new UNIT3D({
    api: new API({
      tmdbKey: TMDB_API_KEY
    }),
    gui: new GUI()
  })
}
