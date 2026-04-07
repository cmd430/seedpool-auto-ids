import type { API } from './API'
import type { IdSource, MediaType } from './types/API'
import type { UNIT3D_Opts } from './types/UNIT3D'
import { wait } from './utils/wait'
import { createElementFromString } from './utils/createElementFromString'

export class UNIT3D {

  private api: API
  private textSelection?: string

  constructor (opts: UNIT3D_Opts) {
    this.api = opts.api

    // add `selectionend` event to window
    let selectionEndTimeout: number | undefined
    [ 'mouseup', 'selectionchange' ].map(e => {
      document.addEventListener(e.toString(), evt => {
        if (selectionEndTimeout && evt.type === 'selectionchange') {
          clearTimeout(selectionEndTimeout)
        }

        selectionEndTimeout = setTimeout(() => {
          if (evt.type === 'mouseup' && getSelection()?.toString() !== '') {
            document.dispatchEvent(new Event('selectionend'))
          }
        }, 100)
      })
    })

    // auto ids
    document.addEventListener('paste', this.onPaste.bind(this))

    // quick search buttons
    this.initQuickSearch()
    document.addEventListener('selectionchange', this.onSelection.bind(this))
    document.addEventListener('selectionend', this.onSelection.bind(this))
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

  onSelection (e: Event) {
    const quickSearch = document.querySelector<HTMLDivElement>('#quickSearch')
    if (!quickSearch) return

    const currentSelection = getSelection()
    if (e.type === 'selectionchange' && currentSelection?.toString() !== '') return

    if (!currentSelection?.toString() || /^\d+$/.test(currentSelection?.toString().trim())) {
      quickSearch.style.opacity = '0'
      this.textSelection = ''
    } else {
      if (e.type === 'selectionend' && this.textSelection === currentSelection?.toString()) return

      let rect: {
        top: number,
        left: number,
        bottom: number,
        right: number
      } | undefined

      const activeElement = document.activeElement
      if (!activeElement) return

      if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
        rect = activeElement.getBoundingClientRect()
      } else if (currentSelection.rangeCount > 0 && currentSelection.toString().trim()) {
        rect = currentSelection.getRangeAt(0).getBoundingClientRect()
      }
      if (!rect) return

      const mediaType = this.getMediaType()
      if (!mediaType) {
        quickSearch.dataset.type = 'tv,movie,game'
      } else {
        quickSearch.dataset.type = mediaType
      }

      const top = window.scrollY + rect.bottom + 4
      if (top + quickSearch.offsetHeight > window.scrollY + window.innerHeight) {
        quickSearch.style.top = `${window.scrollY + rect.bottom - quickSearch.offsetHeight - 8}px`
      } else {
        quickSearch.style.top = `${top}px`
      }
      quickSearch.style.left = `${window.scrollX + rect.left}px`

      this.textSelection = currentSelection?.toString()
      quickSearch.style.opacity = '1'
    }
  }

  private initQuickSearch () {
    const style = createElementFromString(/*html*/`
      <style>${/*css*/`
        #quickSearch {
          position: absolute;
          z-index: 999999;
          display: flex;
          gap: 6px;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: auto;
          background: var(--body-bg);
          padding: 5px;
          border-radius: 12px;
          border: var(--input-text-border);

          > button {
            width: 36px;
            height: 36px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            display: none;
            padding: 2px;
            transition: transform 0.15s ease;

            &:hover {
              transform: scale(1.24);
            }

            > img {
              width: 32px;
              height: 32px;
              object-fit: contain;
            }
          }

          &[data-type*="tv"] > button[data-types*="tv"] {
            display: flex;
          }
          &[data-type*="movie"] > button[data-types*="movie"] {
            display: flex;
          }
          &[data-type*="game"] > button[data-types*="game"] {
            display: flex;
          }
        }
      `}</style>
    `)
    document.body.appendChild(style)

    const quickSearch = createElementFromString(/*html*/`
      <div id="quickSearch" data-type=""></div>
    `)

    const sites = [
      { name: 'TMDB', icon: 'https://seedpool.org/img/meta/tmdb.svg', bg:'#022541', search (t: string) {
        return `https://www.themoviedb.org/search?query=${encodeURIComponent(t.replace(/(\s+)(\d{4})$/, '$1 y:$2').replace(/y:$/, ''))}`
      }, types: [ 'tv', 'movie' ] },
      { name: 'IMDb', icon: 'https://seedpool.org/img/meta/imdb.svg', bg:'#f5c518' , search (t: string) {
        return `https://www.imdb.com/find?q=${encodeURIComponent(t)}`
      }, types: [ 'tv', 'movie' ] },
      { name: 'TVDB', icon: 'https://seedpool.org/img/meta/tvdb.svg', bg:'#132c3a' , search (t: string) {
        return `https://www.thetvdb.com/search?query=${encodeURIComponent(t.replace(/\s+\d{4}$/,''))}`
      }, types: [ 'tv' ] },
      { name: 'MAL', icon: 'https://seedpool.org/img/meta/mal.svg', bg:'#2e51a2' , search (t: string) {
        return `https://myanimelist.net/search/all?q=${encodeURIComponent(t)}`
      }, types: [ 'tv', 'movie' ] },
      { name: 'IGDB', icon: 'https://seedpool.org/img/meta/igdb.svg', bg:'#9147ff' , search (t: string) {
        return `https://www.igdb.com/search?q=${encodeURIComponent(t)}`
      }, types: [ 'game' ] }
    ]

    const getSearchText = () => {
      const selectedText = getSelection()?.toString()
      if (!selectedText) return

      return selectedText.replace(/[._()[\]{}-]/g, ' ').trim()
    }

    sites.forEach(site => {
      const siteButton = createElementFromString(/*html*/`
        <button title="${site.name}" style="background: ${site.bg};" data-types="${site.types.join(',')}">
          <img src="${site.icon}"/>
        </button>
      `)

      siteButton.addEventListener('click', e => {
        const searchText = getSearchText()
        if (!searchText) return

        e.preventDefault()

        window.open(site.search(searchText), `${site.name} Popup`, 'width=1200,height=800,resizable,scrollbars')?.focus();
      })

      siteButton.addEventListener('contextmenu', e => {
        const searchText = getSearchText()
        if (!searchText) return

        e.preventDefault()

        window.open(site.search(searchText), '_blank')?.focus();
      })

      quickSearch.appendChild(siteButton)
    })

    document.body.appendChild(quickSearch)
  }

  private async createMetadata (idSource: IdSource, id: string) {
    return this.editMetadata(idSource, id)
  }

  private async editMetadata (idSource: IdSource, id: string) {
    const mediaType = this.getMediaType()
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

    if (!mediaType) {
      mediaType = this.getMediaTypeFromCategoryId(document.querySelector<HTMLSelectElement>('#autocat')?.value)
    }

    return mediaType
  }

  private getMediaTypeFromCategoryId (category?: string) {
    if (!category) return
    return <MediaType>{ 1: 'movie', 2: 'tv', 3: 'game' , 6: 'tv' }[category]
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
