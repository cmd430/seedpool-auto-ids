import type { API } from './API'
import type { IdSource } from './types/API'
import type { UNIT3D_Opts } from './types/UNIT3D'
import { wait } from './utils/wait'

import type { GUI } from './GUI'

export class UNIT3D {

  private api: API
  private gui: GUI

  constructor (opts: UNIT3D_Opts) {
    this.api = opts.api
    this.gui = opts.gui

    // auto ids
    document.addEventListener('paste', this.onPaste.bind(this))
  }

  public onPaste (e: ClipboardEvent) {
    const input = <HTMLInputElement>e.target
    const idSource = <IdSource>input.id.match(/(?:(?:auto_?)|bulk-)?(\w{4}|mal)/)?.[1]

    if (!idSource || !this.api.validIdSources.includes(idSource)) return

    e.preventDefault()

    const id = e.clipboardData?.getData('text')
    if (!id) return

    // allow direct paste so it feels good (no delay) but auto remove the imdb 'tt' prefix if present
    this.gui.setInputValue(input, id.startsWith('tt') ? id.slice(2) : id)

    // get ids
    if (location.pathname.endsWith('create')) {
      this.createMetadata(idSource, id)
    } else if (location.pathname.endsWith('edit')) {
      this.editMetadata(idSource, id)
    } else if (location.pathname.includes('similar') || location.pathname.endsWith('torrents')) {
      this.bulkEditMetadata(idSource, id)
    }
  }

  private async createMetadata (idSource: IdSource, id: string) {
    return this.editMetadata(idSource, id)
  }

  private async editMetadata (idSource: IdSource, id: string) {
    const mediaType = this.gui.getMediaType()
    if (mediaType !== 'tv' && mediaType !== 'movie') return

    const ids = await this.api.getIds(id, idSource, mediaType)
    if (!ids) return

    await this.editId(`#${mediaType}_exists_on_tmdb`, `#tmdb_${mediaType}_id`, ids.id)
    await this.editId('#title_exists_on_imdb', '#imdb', ids.imdb_id?.slice(2))
    await this.editId('#title_exists_on_imdb', '#autoimdb', ids.imdb_id?.slice(2))
    await this.editId('#tv_exists_on_tvdb', '#tvdb', ids.tvdb_id)
    await this.editId('#tv_exists_on_tvdb', '#autotvdb', ids.tvdb_id)
    await this.editId('#anime_exists_on_mal', '#mal', ids.mal_id)
    await this.editId('#anime_exists_on_mal', '#automal', ids.mal_id)
  }

  private async editId (existsSelector: string, inputSelector: string, id: string | number | undefined | null) {
    const exists = document.querySelector<HTMLInputElement>(existsSelector)
    const input = document.querySelector<HTMLInputElement>(inputSelector)

    if (id) {
      this.gui.setCheckboxChecked(exists, true)
      await wait({ milliseconds: 100 })
      this.gui.setInputValue(input, String(id))
    } else {
      this.gui.setInputValue(input!, '')
      await wait({ milliseconds: 100 })
      this.gui.setCheckboxChecked(exists, false)
    }
  }

  private async bulkEditMetadata (idSource: IdSource, id: string) {
    const mediaType = this.gui.getMediaType()
    if (mediaType !== 'tv' && mediaType !== 'movie') return

    const ids = await this.api.getIds(id, idSource, mediaType)
    if (!ids) return

    await this.bulkEditId('#bulk-tmdb-id', ids.id)
    await this.bulkEditId('#bulk-imdb-id', ids.imdb_id?.slice(2))
    await this.bulkEditId('#bulk-tvdb-id', ids.tvdb_id)
    await this.bulkEditId('#bulk-mal-id', ids.mal_id)
  }

  private async bulkEditId (inputSelector: string, id: string | number | undefined | null) {
    const input = document.querySelector<HTMLInputElement>(inputSelector)

    if (id) {
      this.gui.setInputValue(input, String(id))
    } else {
      this.gui.setInputValue(input, '')
    }
  }

}
