import type { IdSource, MediaType, BuildUrlOpts, ExternalMalIdMap, TMDB_ExternalIdsResponse, TMDB_FindResponse, API_Options } from './types/API'
import { obtain } from './utils/obtain'

export class API {

  private tmdbKey: string

  constructor (opts: API_Options) {
    this.tmdbKey = opts.tmdbKey
  }

  async getIds (id: string, source: IdSource, mediaType: MediaType) {
    const tmdbId = await this.getTmdbId(source, id)
    if (!tmdbId) return

    // lookup external ids using the tmdb id
    const { data, ok } = await obtain<TMDB_ExternalIdsResponse>(this.buildUrl({
      path: `${mediaType}/${tmdbId}/external_ids`
    }))
    if (!ok) return

    // lookup mal id from tmdb and/or tvdb
    const mal = await this.getMalIds({
      tmdb_id: data.id,
      tvdb_id: data.tvdb_id
    })

    return {
      ...data,
      mal_id: mal?.mal_id ?? null
    }
  }

  async getTmdbId (source: IdSource, id: string) {
    if (source === 'tmdb') {
      return id
    }

    if (source === 'mal') {
      const malIds = await this.getMalIds({ mal_id: Number(id) })
      if (malIds?.tmdb_id) {
        return String(malIds.tmdb_id)
      } else if (malIds?.tvdb_id) {
        source = 'tvdb'
        id = String(malIds.tvdb_id)
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

    return results[0]?.id
  }

  async getMalIds (opts: {
    tmdb_id?: number
    tvdb_id?: number
    mal_id?: number
  }) {
    // mappings from https://github.com/shinkro/community-mapping
    const { data, ok } = await obtain('https://raw.githubusercontent.com/shinkro/community-mapping/refs/heads/main/shinkrodb/malid-anidbid-tvdbid-tmdbid.json')
    if (!ok) return

    const externalIdMap = <ExternalMalIdMap[]>JSON.parse(data)
    const mapped = externalIdMap.find(external => {
      if (opts.mal_id) {
        return external.malid === opts.mal_id
      } else if (opts.tvdb_id && external.tmdbid) {
        return external.tmdbid === opts.tmdb_id || external.tvdbid === opts.tvdb_id
      } else if (opts.tvdb_id) {
        return external.tvdbid === opts.tvdb_id
      } else if (external.tmdbid) {
        return external.tmdbid === external.tmdbid
      }

      return false
    })
    if (!mapped) return

    return {
      mal_id: mapped.malid,
      tmdb_id: mapped.tmdbid,
      tvdb_id: mapped.tvdbid
    }
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
