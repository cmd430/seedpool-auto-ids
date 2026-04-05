import type { IdSource, MediaType, BuildUrlOpts, ExternalMalIdMap, TMDB_ExternalIdsResponse, TMDB_FindResponse, API_Options } from './types/API'
import { obtain } from './utils/obtain'

export class API {

  private tmdbKey: string

  constructor (opts: API_Options) {
    this.tmdbKey = opts.tmdbKey
  }

  async getIds (id: string, source: IdSource, mediaType: MediaType) {
    let tmdbId = id
    if (source !== 'tmdb') { // we need to get tmdb id if using another id to start
      if (source === 'mal') {
        const malIds = await this.getMalIds(undefined, undefined, Number(id))
        if (malIds?.tvdb_id) {
          source = 'tvdb'
          id = String(malIds.tvdb_id)
        } else if (malIds?.imdb_id) {
          source = 'imdb'
          id = malIds.imdb_id
        }
      }

      if (source === 'imdb' && !id.startsWith('tt')) {
        id = `tt${id.padStart(7, '0')}`
      }

      const { data, ok } = await obtain<TMDB_FindResponse>(this.buildUrl({
        path: `find/${id}`,
        params: {
          external_source: `${source}_id`
        }
      }))

      if (!ok) return

      const { tv_results, movie_results } = data
      const results = {
        ...tv_results,
        ...movie_results
      }

      tmdbId = results[0]?.id
    }

    if (!tmdbId) return

    // lookup external ids using the tmdb id
    const { data, ok } = await obtain<TMDB_ExternalIdsResponse>(this.buildUrl({
      path: `${mediaType}/${tmdbId}/external_ids`
    }))
    if (!ok) return

    const mal = await this.getMalIds(data.tvdb_id, data.imdb_id)
    if (!mal || !mal.mal_id) {
      return {
        ...data,
        mal_id: undefined
      }
    }

    return {
      ...data,
      mal_id: mal.mal_id
    }
  }

  async getMalIds (tvdbId?: number, imdbId?: string, malId?: number) {
    if (!tvdbId && !imdbId && !malId) return

    const { data, ok } = await obtain('https://raw.githubusercontent.com/Kometa-Team/Anime-IDs/refs/heads/master/anime_ids.json')

    if (!ok) return

    const externalIdMap = <ExternalMalIdMap>JSON.parse(data)

    return Object.values(externalIdMap).find(a => {
      if (malId) {
        return a.mal_id === malId
      } else if (tvdbId && imdbId) {
        return a.tvdb_id === tvdbId || a.imdb_id === imdbId
      } else if (tvdbId) {
        return a.tvdb_id === tvdbId
      } else if (imdbId) {
        return a.imdb_id === imdbId
      }

      return false
    })
  }

  public get validIdSources(): IdSource[] {
    return [ 'imdb', 'tmdb', 'tvdb', 'mal' ]
  }

  private buildUrl (opts: BuildUrlOpts) {
    const { path, params = {} } = opts

    const constructedParams: string = Object.entries(params)
    .reduce((prev, curr): string[] => ([
      ...prev,
      curr.join('=')
    ]), [])
    .join('&')

    const url: string = `https://api.themoviedb.org/3/${path}?api_key=${this.tmdbKey}&${constructedParams}`
    return url
  }
}
