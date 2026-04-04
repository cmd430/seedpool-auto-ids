import type { API } from './API'
import type { IdSource, MediaType } from './types/API'
import type { UNIT3D_Opts } from './types/UNIT3D'
import { wait } from './utils/wait'

export class UNIT3D {

  private api: API

  constructor (opts: UNIT3D_Opts) {
    this.api = opts.api
  }

  onPaste (e: ClipboardEvent) {
    const input = <HTMLInputElement>e.target
    const idSource = <IdSource>input.id.match(/(?:(?:auto_?)|bulk-)?(\w{4}|mal)/)?.[1]

    if (!idSource || !this.api.validIdSources.includes(idSource)) return

    e.preventDefault()

    // allow direct paste so it feels good (no delay) but auto remove the imdb 'tt' prefix if present
    const id = e.clipboardData?.getData('text')
    if (!id) return

    this.setInputValue(input, id.startsWith('tt') ? id.slice(2) : id)

    // get ids
    if (location.pathname.endsWith('create')) {
      this.createMetadata(idSource, id)
    } else if (location.pathname.endsWith('edit')) {
      this.editMetadata(idSource, id)
    } else if (location.pathname.includes('similar')) {
      this.bulkEditMetadata(idSource, id)
    }
  }

  private async createMetadata (idSource: IdSource, id: string) {
    // noop might add later
  }

  private async editMetadata (idSource: IdSource, id: string) {
    const mediaType = this.getMediaTypeFromCategory(document.querySelector('#category_id')!)
    const ids = await this.api.getIds(id, idSource, mediaType)

    if (!ids) return

    // auto fill tmdb id
    const exists_on_tmdb = document.querySelector<HTMLInputElement>(`#${mediaType}_exists_on_tmdb`)
    const tmdb_input = document.querySelector<HTMLInputElement>(`#tmdb_${mediaType}_id`)
    if (ids.id) {
      this.setCheckboxChecked(exists_on_tmdb!, true)
      await wait({ milliseconds: 100 })
      this.setInputValue(tmdb_input!, String(ids.id))
    } else {
      this.setInputValue(tmdb_input!, '')
      await wait({ milliseconds: 100 })
      this.setCheckboxChecked(exists_on_tmdb!, false)
    }

    // auto fill imdb id
    const exists_on_imdb = document.querySelector<HTMLInputElement>('#title_exists_on_imdb')
    const imdb_input = document.querySelector<HTMLInputElement>('#imdb')
    if (ids.imdb_id) {
      this.setCheckboxChecked(exists_on_imdb!, true)
      await wait({ milliseconds: 100 })
      this.setInputValue(imdb_input!, ids.imdb_id.slice(2))
    } else {
      this.setInputValue(imdb_input!, '')
      await wait({ milliseconds: 100 })
      this.setCheckboxChecked(exists_on_imdb!, false)
    }

    // auto fill tvdb id
    const exists_on_tvdb = document.querySelector<HTMLInputElement>('#tv_exists_on_tvdb')
    const tvdb_input = document.querySelector<HTMLInputElement>('#tvdb')
    if (mediaType === 'tv' && ids.tvdb_id) {
      this.setCheckboxChecked(exists_on_tvdb!, true)
      await wait({ milliseconds: 100 })
      this.setInputValue(tvdb_input!, String(ids.tvdb_id))
    } else if (mediaType === 'tv' && !ids.tvdb_id) {
      this.setInputValue(tvdb_input!, '')
      await wait({ milliseconds: 100 })
      this.setCheckboxChecked(exists_on_tvdb!, false)
    }

    // auto fill mal id
    const exists_on_mal = document.querySelector<HTMLInputElement>('#anime_exists_on_mal')
    const mal_input = document.querySelector<HTMLInputElement>('#mal')
    if (ids.mal_id) {
      this.setCheckboxChecked(exists_on_mal!, true)
      await wait({ milliseconds: 100 })
      this.setInputValue(mal_input!, String(ids.mal_id))
    } else {
      this.setInputValue(mal_input!, '')
      await wait({ milliseconds: 100 })
      this.setCheckboxChecked(exists_on_mal!, false)
    }
  }

  private async bulkEditMetadata (idSource: IdSource, id: string) {
    const mediaType = this.getMediaTypeFromText(document.querySelector('#swal2-html-container > div > div:first-of-type > label')?.textContent ?? '')
    if (mediaType !== 'tv' && mediaType !== 'movie') return

    const ids = await this.api.getIds(id, idSource, mediaType)
    if (!ids) return

    // auto fill tmdb id
    const tmdb_input = document.querySelector<HTMLInputElement>('#bulk-tmdb-id')
    if (ids.id) {
      this.setInputValue(tmdb_input!, String(ids.id))
    } else {
      this.setInputValue(tmdb_input!, '')
    }

    // auto fill imdb id
    const imdb_input = document.querySelector<HTMLInputElement>('#bulk-imdb-id')
    if (ids.imdb_id) {
      this.setInputValue(imdb_input!, ids.imdb_id.slice(2))
    } else {
      this.setInputValue(imdb_input!, '')
    }

    // auto fill tvdb id
    const tvdb_input = document.querySelector<HTMLInputElement>('#bulk-tvdb-id')
    if (mediaType === 'tv' && ids.tvdb_id) {
      this.setInputValue(tvdb_input!, String(ids.tvdb_id))
    } else if (mediaType === 'tv' && !ids.tvdb_id) {
      this.setInputValue(tvdb_input!, '')
    }

    // auto fill mal id
    const mal_input = document.querySelector<HTMLInputElement>('#bulk-mal-id')
    if (ids.mal_id) {
      this.setInputValue(mal_input!, String(ids.mal_id))
    } else {
      this.setInputValue(mal_input!, '')
    }
  }

  private getMediaTypeFromCategory (category: HTMLSelectElement) {
    return <MediaType>{ 1: 'movie', 2: 'tv' }[category.value]
  }

  private getMediaTypeFromText (text: string) {
    return <MediaType>text.match(/(Movie|TV)/i)?.[1].toLowerCase()
  }

  private setInputValue (input: HTMLInputElement, value: string) {
    if (!input) return
    input.value = value ?? ''
    input.dispatchEvent(new Event('change'))
  }

  private setCheckboxChecked (checkbox: HTMLInputElement, checked: boolean) {
    if (!checkbox) return
    checkbox.checked = checked
    checkbox.dispatchEvent(new Event('change'))
  }

}
