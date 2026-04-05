export type IdSource = 'tmdb' | 'imdb' | 'tvdb' | 'mal'
export type MediaType = 'movie' | 'tv'

export interface API_Options {
  tmdbKey: string
}

export interface GetIds_Params {
  id: string
  source: IdSource
  tmdbKey: string
}

export interface TMDB_FindResponse {
  movie_results: TMDB_FindResponseFragment[]
  tv_results: TMDB_FindResponseFragment[]
}

interface TMDB_FindResponseFragment {
  id: string
}

export interface TMDB_ExternalIdsResponse {
  id: number
  imdb_id?: string
  freebase_mid?: string
  freebase_id?: string
  tvdb_id?: number
  tvrage_id?: number
  wikidata_id?: string
  facebook_id?: string
  instagram_id?: string
  twitter_id?: string
}

export interface BuildUrlOpts {
  path: string
  params?: {
    [key: string]: string | undefined
  }
}

export interface ExternalMalIdMap {
  malid: number
  anidbid?: number
  tvdbid?: number
  tmdbid?: number
}
