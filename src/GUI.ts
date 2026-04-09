import type { MediaType } from './types/API'
import { createElementFromString } from './utils/createElementFromString'

export class GUI {

  private textSelection?: string

  constructor () {
    // quick search buttons
    document.addEventListener('selectionchange', this.onSelection.bind(this))
    document.addEventListener('selectionend', this.onSelection.bind(this))
  }

  public onSelection (e: Event) {
    const quickSearch = document.querySelector<HTMLDivElement>('#quickSearch')
    if (!quickSearch) return

    const currentSelection = getSelection()
    if (e.type === 'selectionchange' && currentSelection?.toString() !== '') return

    if (!currentSelection?.toString() || /^\d+$/.test(currentSelection?.toString().trim())) {
      quickSearch.classList.remove('active')
      this.textSelection = ''
      this.siteButtons.forEach(button => button.classList.remove('selected'))
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
        quickSearch.style.top = `${window.scrollY + rect.top - (quickSearch.getBoundingClientRect().height + 4)}px`
      } else {
        quickSearch.style.top = `${top}px`
      }
      quickSearch.style.left = `${window.scrollX + rect.left}px`

      this.textSelection = currentSelection?.toString()
      quickSearch.classList.add('active')
    }
  }

  public getMediaType () {
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

  public setInputValue (input: HTMLInputElement | null, value: string) {
    if (!input) return
    input.value = value ?? ''
    input.dispatchEvent(new Event('change'))
  }

  public setCheckboxChecked (checkbox: HTMLInputElement | null, checked: boolean) {
    if (!checkbox) return
    checkbox.checked = checked
    checkbox.dispatchEvent(new Event('change'))
  }

  public get siteButtons () {
    return document.querySelectorAll<HTMLButtonElement>('#quickSearch > button')
  }

  private getMediaTypeFromCategoryId (category?: string) {
    if (!category) return
    return <MediaType>{ 1: 'movie', 2: 'tv', 3: 'game' , 6: 'tv' }[category]
  }

  private getMediaTypeFromText (text?: string) {
    if (!text) return
    return <MediaType>text.match(/(Movie|TV)/i)?.[1].toLowerCase()
  }

  // init
  static {
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

    const style = createElementFromString<HTMLStyleElement>(/*html*/`
      <style>${/*css*/`
        #quickSearch {
          display: flex;
          position: absolute;
          gap: 6px;
          padding: 5px;
          border-radius: 8px;
          z-index: 999999;
          background: #181818;
          border: 1px solid #555;
          transition: opacity 220ms linear;
          opacity: 0;
          pointer-events: none;
          overflow: hidden;

          button {
            width: 36px;
            height: 36px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            display: none;
            padding: 2px;
            transition: transform 150ms ease, outline 150ms ease;
            overflow: clip;
            outline: 2px solid transparent;

            &.selected {
              outline: 2px solid #4caf50;
            }

            &:hover {
              transform: scale(1.14);
            }

            > img, > svg {
              width: 32px;
              height: 32px;
              object-fit: contain;
            }

            > svg {
              padding: 4px;
              fill: #FFFFFF;
            }
          }

          #multiConfirm {
            display: flex;
            gap: 6px;
            padding-left: 6px;
            margin: 0 -6px 0 -6px;
            width: 0;
            transition: width 200ms ease;

            .divider {
              width: 1px;
              height: 20px;
              align-self: center;
              border-radius: 1px;
              background: #555555;
              display: flex;
              flex-shrink: 0;
            }

            button {
              display: flex;
            }
          }

          &.active {
            opacity: 1;
            pointer-events: auto;
          }

          &:has(button.selected) > #multiConfirm {
            width: 55px;
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

        /* cosmetic fix for homepage having unusable select checkboxes */
        .data-table-wrapper:not(.torrent-search--list__results) .torrent-search--list__poster > div:first-child {
          display: none;
        }
      `}</style>
    `)
    document.body.appendChild(style)

    const quickSearch = createElementFromString<HTMLDivElement>(/*html*/`
      <div id="quickSearch" data-type=""></div>
    `)

    const sites = [
      {
        id: 'tmdb',
        name: 'The MovieDB',
        icon: 'https://seedpool.org/img/meta/tmdb.svg',
        bg:'#022541',
        search (t: string) {
          return `https://www.themoviedb.org/search?query=${encodeURIComponent(t.replace(/(\s+)(\d{4})$/, '$1 y:$2').replace(/y:$/, ''))}`
        },
        types: [ 'tv', 'movie' ]
      },
      {
        id: 'imdb',
        name: 'IMDb',
        icon: 'https://seedpool.org/img/meta/imdb.svg',
        bg:'#f5c518',
        search (t: string) {
          return `https://www.imdb.com/find?q=${encodeURIComponent(t)}`
        },
        types: [ 'tv', 'movie' ]
      },
      {
        id: 'tmdb',
        name: 'TheTVDB',
        icon: 'https://seedpool.org/img/meta/tvdb.svg',
        bg:'#1b2626',
        search (t: string) {
          return `https://www.thetvdb.com/search?query=${encodeURIComponent(t.replace(/\s+\d{4}$/,''))}`
        },
        types: [ 'tv' ]
      },
      {
        id: 'mal',
        name: 'MyAnimeList',
        icon: 'https://seedpool.org/img/meta/mal.svg',
        bg:'#2e51a2',
        search (t: string) {
          return `https://myanimelist.net/search/all?q=${encodeURIComponent(t)}`
        },
        types: [ 'tv', 'movie' ]
      },
      {
        id: 'igdb',
        name: 'The Internet Game Database',
        icon: 'https://seedpool.org/img/meta/igdb.svg',
        bg:'#9147ff',
        search (t: string) {
          return `https://www.igdb.com/search?q=${encodeURIComponent(t)}`
        },
        types: [ 'game' ]
      },
      {
        id: 'sp',
        name: 'seedpool',
        icon: 'https://chat.seedpool.org/img/logo-transparent-bg-inverted.svg',
        bg:'#090909',
        search (t: string) {
          return `https://seedpool.org/torrents?name=${encodeURIComponent(t.replace(/\s+/g,'.'))}`
        },
        types: [ 'tv', 'movie', 'game' ]
      }
    ]

    const getSearchText = () => {
      const selectedText = getSelection()?.toString()
      if (!selectedText) return

      return selectedText.replace(/[._()[\]{}-]/g, ' ').trim()
    }

    const siteButtons: HTMLButtonElement[] = []

    sites.forEach(site => {
      const siteButton = createElementFromString<HTMLButtonElement>(/*html*/`
        <button id="${site.id}" title="Search ${site.name}" style="background: ${site.bg};" data-types="${site.types.join(',')}">
          <img src="${site.icon}"/>
        </button>
      `)

      siteButton.addEventListener('click', e => {
        const searchText = getSearchText()
        if (!searchText) return

        e.preventDefault()

        if (e.shiftKey) {
          return siteButton.classList.toggle('selected')
        }

        // real clicks only
        if (e.isTrusted) {
          for (const siteButton of siteButtons) {
            if (!siteButton.classList.contains('selected')) continue

            return siteButtons.forEach(button => button.classList.remove('selected'))
          }
        }

        if (e.ctrlKey) {
          return window.open(site.search(searchText), '_blank')
        }

        window.open(site.search(searchText), `${site.name} Popup`, 'width=1200,height=800,resizable,scrollbars')
      })

      // for MacReady
      siteButton.addEventListener('contextmenu', e => {
        const searchText = getSearchText()
        if (!searchText) return

        e.preventDefault()

        siteButton.dispatchEvent(new PointerEvent('click', {
          ctrlKey: true
        }))
      })

      quickSearch.appendChild(siteButton)
      siteButtons.push(siteButton)
    })

    const multiButton = createElementFromString<HTMLButtonElement>(/*html*/`
      <button id="confirm" title="Open Selected" style="background: #4caf50">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
          <path d="M42 8.6a2 2 0 0 0-1.7 1L21.5 38.3 9.3 27.8a2 2 0 0 0-3.4 1 2 2 0 0 0 .8 2l14 12a2 2 0 0 0 2.9-.4l20-30.6A2 2 0 0 0 42 8.6"/>
        </svg>
      </button>
    `)
    multiButton.addEventListener('click', e => {
      const searchText = getSearchText()
      if (!searchText) return

      e.preventDefault()

      for (const siteButton of siteButtons) {
        if (!siteButton.classList.contains('selected')) continue

        siteButton.dispatchEvent(new PointerEvent('click', {
          ctrlKey: e.ctrlKey
        }))
      }

      siteButtons.forEach(button => button.classList.remove('selected'))
    })

    // for MacReady
    multiButton.addEventListener('contextmenu', e => {
      const searchText = getSearchText()
      if (!searchText) return

      e.preventDefault()

      multiButton.dispatchEvent(new PointerEvent('click', {
        ctrlKey: true
      }))
    })

    const multiBox = createElementFromString<HTMLDivElement>(/*html*/`
      <div id="multiConfirm">
        <span class="divider"></span>
      </div>
    `)

    multiBox.appendChild(multiButton)
    quickSearch.appendChild(multiBox)
    document.body.appendChild(quickSearch)
  }

}
