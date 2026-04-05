import { TMDB_API_KEY } from './secrets'
import { API } from './API'
import { UNIT3D } from './UNIT3D'

new UNIT3D({
  api: new API({
    tmdbKey: TMDB_API_KEY
  })
})
