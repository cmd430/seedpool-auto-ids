import type { API } from './API'
import type { IdSource, MediaType } from './types/API'
import type { UNIT3D_Opts } from './types/UNIT3D'
import { wait } from './utils/wait'

export class UNIT3D {

  private api: API

  constructor (opts: UNIT3D_Opts) {
    this.api = opts.api

    document.addEventListener('paste', this.onPaste.bind(this))
  }

  onPaste (e: ClipboardEvent) {
    const input = <HTMLInputElement>e.target
    const idSource = <IdSource>input.id.match(/(?:(?:auto_?)|bulk-)?(\w{4}|mal)/)?.[1]

    if (!idSource || !this.api.validIdSources.includes(idSource)) return

    e.preventDefault()

    const id = e.clipboardData?.getData('text')
    if (!id) return

    // allow direct paste so it feels good (no delay) but auto remove the imdb 'tt' prefix if present
    this.setInputValue(input, id.startsWith('tt') ? id.slice(2) : id)

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
    // noop might add later
  }

  private async editMetadata (idSource: IdSource, id: string) {
    const mediaType = this.getMediaType()
    if (mediaType !== 'tv' && mediaType !== 'movie') return

    const ids = await this.api.getIds(id, idSource, mediaType)
    if (!ids) return

    await this.editId(`#${mediaType}_exists_on_tmdb`, `#tmdb_${mediaType}_id`, ids.id)
    await this.editId('#title_exists_on_imdb', '#imdb', ids.imdb_id?.slice(2))
    await this.editId('#tv_exists_on_tvdb', '#tvdb', ids.tvdb_id)
    await this.editId('#anime_exists_on_mal', '#mal', ids.mal_id)
  }

  private async editId (existsSelector: string, inputSelector: string, id: string | number | undefined | null) {
    const exists = document.querySelector<HTMLInputElement>(existsSelector)
    const input = document.querySelector<HTMLInputElement>(inputSelector)

    if (id) {
      this.setCheckboxChecked(exists, true)
      await wait({ milliseconds: 100 })
      this.setInputValue(input, String(id))
    } else {
      this.setInputValue(input!, '')
      await wait({ milliseconds: 100 })
      this.setCheckboxChecked(exists, false)
    }
  }

  private async bulkEditMetadata (idSource: IdSource, id: string) {
    const mediaType = this.getMediaType()
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
      this.setInputValue(input, String(id))
    } else {
      this.setInputValue(input, '')
    }
  }

  private getMediaType () {
    let mediaType = this.getMediaTypeFromCategoryId(document.querySelector<HTMLSelectElement>('#category_id')?.value)

    if (!mediaType) {
      mediaType = this.getMediaTypeFromCategoryId(document.querySelector<HTMLElement>('.data-table tr[data-torrent-id]:has(input:checked)')?.dataset.categoryId)
    }

    if (!mediaType) {
      mediaType = this.getMediaTypeFromText(document.querySelector<HTMLLabelElement>('#swal2-html-container > div > div:first-of-type > label')?.textContent)
    }

    if (!mediaType) {
      mediaType = this.getMediaTypeFromCategoryId(document.querySelector<HTMLAnchorElement>('.work__media-type-link')?.href.slice(-1))

    }

    return mediaType
  }

  private getMediaTypeFromCategoryId (category?: string) {
    if (!category) return
    return <MediaType>{ 1: 'movie', 2: 'tv', 6: 'tv' }[category]
  }

  private getMediaTypeFromText (text?: string) {
    if (!text) return
    return <MediaType>text.match(/(Movie|TV)/i)?.[1].toLowerCase()
  }

  private setInputValue (input: HTMLInputElement | null, value: string) {
    if (!input) return
    input.value = value ?? ''
    input.dispatchEvent(new Event('change'))
  }

  private setCheckboxChecked (checkbox: HTMLInputElement | null, checked: boolean) {
    if (!checkbox) return
    checkbox.checked = checked
    checkbox.dispatchEvent(new Event('change'))
  }

}
