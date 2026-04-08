// ==UserScript==
// @name          Seedpool Auto TV/Movie IDs
// @namespace     github.com/cmd430
// @match         https://seedpool.org/*
// @grant         none
// @icon          https://seedpool.org/favicon.ico
// @inject-into   content
// @version       0.2.7
// @author        cmd430
// @description   Make adding TV/Movie ids less painful during torrent moderation
// @run-at        document-body
// ==/UserScript==
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/secrets.ts
var TMDB_API_KEY = "";

// src/utils/obtain.ts
async function obtain(...[input, init]) {
  const res = await fetch(input, init);
  const contentType = res.headers.get("content-type");
  if (contentType?.includes("json")) {
    Object.defineProperty(res, "data", {
      enumerable: true,
      writable: false,
      value: await res.clone().json()
    });
  }
  if (contentType?.includes("text")) {
    Object.defineProperty(res, "data", {
      enumerable: true,
      writable: false,
      value: await res.clone().text()
    });
  }
  return res;
}
__name(obtain, "obtain");

// src/API.ts
var API = class {
  static {
    __name(this, "API");
  }
  tmdbKey;
  constructor(opts) {
    this.tmdbKey = opts.tmdbKey;
  }
  async getIds(id, source, mediaType) {
    const tmdbId = await this.getTmdbId(source, id);
    if (!tmdbId) return;
    const { data, ok } = await obtain(this.buildUrl({
      path: `${mediaType}/${tmdbId}/external_ids`
    }));
    if (!ok) return;
    const mal = await this.getMalIds({
      tmdb_id: data.id,
      tvdb_id: data.tvdb_id
    });
    return {
      ...data,
      mal_id: mal?.mal_id ?? null
    };
  }
  async getTmdbId(source, id) {
    if (source === "tmdb") {
      return id;
    }
    if (source === "mal") {
      const malIds = await this.getMalIds({ mal_id: Number(id) });
      if (malIds?.tmdb_id) {
        return String(malIds.tmdb_id);
      } else if (malIds?.tvdb_id) {
        source = "tvdb";
        id = String(malIds.tvdb_id);
      }
    }
    if (source === "imdb" && !id.startsWith("tt")) {
      id = `tt${id.padStart(7, "0")}`;
    }
    const { data, ok } = await obtain(this.buildUrl({
      path: `find/${id}`,
      params: {
        external_source: `${source}_id`
      }
    }));
    if (!ok) return;
    const { tv_results, movie_results } = data;
    const results = {
      ...tv_results,
      ...movie_results
    };
    return results[0]?.id;
  }
  async getMalIds(opts) {
    const { data, ok } = await obtain("https://raw.githubusercontent.com/shinkro/community-mapping/refs/heads/main/shinkrodb/malid-anidbid-tvdbid-tmdbid.json");
    if (!ok) return;
    const externalIdMap = JSON.parse(data);
    const mapped = externalIdMap.find((external) => {
      if (opts.mal_id) {
        return external.malid === opts.mal_id;
      } else if (opts.tvdb_id && external.tmdbid) {
        return external.tmdbid === opts.tmdb_id || external.tvdbid === opts.tvdb_id;
      } else if (opts.tvdb_id) {
        return external.tvdbid === opts.tvdb_id;
      } else if (external.tmdbid) {
        return external.tmdbid === opts.tmdb_id;
      }
      return false;
    });
    if (!mapped) return;
    return {
      mal_id: mapped.malid,
      tmdb_id: mapped.tmdbid,
      tvdb_id: mapped.tvdbid
    };
  }
  get validIdSources() {
    return ["imdb", "tmdb", "tvdb", "mal"];
  }
  buildUrl(opts) {
    const { path, params = {} } = opts;
    const constructedParams = Object.entries(params).reduce((prev, curr) => [
      ...prev,
      curr.join("=")
    ], []).join("&");
    const url = `https://api.themoviedb.org/3/${path}?api_key=${this.tmdbKey}&${constructedParams}`;
    return url;
  }
};

// src/utils/createElementFromString.ts
function createElementsFromString(HTMLString) {
  const range = new Range();
  const fragment = range.createContextualFragment(HTMLString);
  return fragment;
}
__name(createElementsFromString, "createElementsFromString");
function createElementFromString(HTMLString) {
  return createElementsFromString(HTMLString).firstElementChild;
}
__name(createElementFromString, "createElementFromString");

// src/GUI.ts
var GUI = class {
  static {
    __name(this, "GUI");
  }
  textSelection;
  constructor() {
    document.addEventListener("selectionchange", this.onSelection.bind(this));
    document.addEventListener("selectionend", this.onSelection.bind(this));
  }
  onSelection(e) {
    const quickSearch = document.querySelector("#quickSearch");
    if (!quickSearch) return;
    const currentSelection = getSelection();
    if (e.type === "selectionchange" && currentSelection?.toString() !== "") return;
    if (!currentSelection?.toString() || /^\d+$/.test(currentSelection?.toString().trim())) {
      quickSearch.style.opacity = "0";
      this.textSelection = "";
      this.siteButtons.forEach((button) => button.classList.remove("selected"));
    } else {
      if (e.type === "selectionend" && this.textSelection === currentSelection?.toString()) return;
      let rect;
      const activeElement = document.activeElement;
      if (!activeElement) return;
      if (activeElement.tagName === "TEXTAREA" || activeElement.tagName === "INPUT") {
        rect = activeElement.getBoundingClientRect();
      } else if (currentSelection.rangeCount > 0 && currentSelection.toString().trim()) {
        rect = currentSelection.getRangeAt(0).getBoundingClientRect();
      }
      if (!rect) return;
      const mediaType = this.getMediaType();
      if (!mediaType) {
        quickSearch.dataset.type = "tv,movie,game";
      } else {
        quickSearch.dataset.type = mediaType;
      }
      const top = window.scrollY + rect.bottom + 4;
      if (top + quickSearch.offsetHeight > window.scrollY + window.innerHeight) {
        quickSearch.style.top = `${window.scrollY + rect.top - (quickSearch.getBoundingClientRect().height + 4)}px`;
      } else {
        quickSearch.style.top = `${top}px`;
      }
      quickSearch.style.left = `${window.scrollX + rect.left}px`;
      this.textSelection = currentSelection?.toString();
      quickSearch.style.opacity = "1";
    }
  }
  getMediaType() {
    let mediaType = this.getMediaTypeFromCategoryId(document.querySelector("#category_id")?.value);
    if (!mediaType) {
      mediaType = this.getMediaTypeFromCategoryId(document.querySelector(".data-table tr[data-torrent-id]:has(input:checked)")?.dataset.categoryId);
    }
    if (!mediaType) {
      mediaType = this.getMediaTypeFromText(document.querySelector("#swal2-html-container > div > div:first-of-type > label")?.textContent);
    }
    if (!mediaType) {
      mediaType = this.getMediaTypeFromCategoryId(document.querySelector(".work__media-type-link")?.href.slice(-1));
    }
    if (!mediaType) {
      mediaType = this.getMediaTypeFromCategoryId(document.querySelector("#autocat")?.value);
    }
    return mediaType;
  }
  setInputValue(input, value) {
    if (!input) return;
    input.value = value ?? "";
    input.dispatchEvent(new Event("change"));
  }
  setCheckboxChecked(checkbox, checked) {
    if (!checkbox) return;
    checkbox.checked = checked;
    checkbox.dispatchEvent(new Event("change"));
  }
  get siteButtons() {
    return document.querySelectorAll("#quickSearch > button");
  }
  getMediaTypeFromCategoryId(category) {
    if (!category) return;
    return { 1: "movie", 2: "tv", 3: "game", 6: "tv" }[category];
  }
  getMediaTypeFromText(text) {
    if (!text) return;
    return text.match(/(Movie|TV)/i)?.[1].toLowerCase();
  }
  static {
    let selectionEndTimeout;
    ["mouseup", "selectionchange"].map((e) => {
      document.addEventListener(e.toString(), (evt) => {
        if (selectionEndTimeout && evt.type === "selectionchange") {
          clearTimeout(selectionEndTimeout);
        }
        selectionEndTimeout = setTimeout(() => {
          if (evt.type === "mouseup" && getSelection()?.toString() !== "") {
            document.dispatchEvent(new Event("selectionend"));
          }
        }, 100);
      });
    });
    const style = createElementFromString(
      /*html*/
      `
      <style>${/*css*/
      `
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
            overflow: clip;

            &.selected {
              outline: 2px solid var(--color-green);
            }

            &:hover {
              transform: scale(1.24);
            }

            &#quickSearchMultiConfirm {
              display: none;
            }

            > img, > svg {
              width: 32px;
              height: 32px;
              object-fit: contain;
              fill: #FFFFFF;
            }
          }

          span.divider {
            width: 1px;
            height: 20px;
            align-self: center;
            border-radius: 1px;
            background: var(--label-fg);
            display: none;
          }

          &:has(button.selected) {
            > span.divider {
              display: flex;
            }

            > #quickSearchMultiConfirm {
              display: flex;
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
    `
    );
    document.body.appendChild(style);
    const quickSearch = createElementFromString(
      /*html*/
      `
      <div id="quickSearch" data-type=""></div>
    `
    );
    const sites = [
      {
        id: "tmdb",
        name: "The MovieDB",
        icon: "https://seedpool.org/img/meta/tmdb.svg",
        bg: "#022541",
        search(t) {
          return `https://www.themoviedb.org/search?query=${encodeURIComponent(t.replace(/(\s+)(\d{4})$/, "$1 y:$2").replace(/y:$/, ""))}`;
        },
        types: ["tv", "movie"]
      },
      {
        id: "imdb",
        name: "IMDb",
        icon: "https://seedpool.org/img/meta/imdb.svg",
        bg: "#f5c518",
        search(t) {
          return `https://www.imdb.com/find?q=${encodeURIComponent(t)}`;
        },
        types: ["tv", "movie"]
      },
      {
        id: "tmdb",
        name: "TheTVDB",
        icon: "https://seedpool.org/img/meta/tvdb.svg",
        bg: "#1b2626",
        search(t) {
          return `https://www.thetvdb.com/search?query=${encodeURIComponent(t.replace(/\s+\d{4}$/, ""))}`;
        },
        types: ["tv"]
      },
      {
        id: "mal",
        name: "MyAnimeList",
        icon: "https://seedpool.org/img/meta/mal.svg",
        bg: "#2e51a2",
        search(t) {
          return `https://myanimelist.net/search/all?q=${encodeURIComponent(t)}`;
        },
        types: ["tv", "movie"]
      },
      {
        id: "igdb",
        name: "The Internet Game Database",
        icon: "https://seedpool.org/img/meta/igdb.svg",
        bg: "#9147ff",
        search(t) {
          return `https://www.igdb.com/search?q=${encodeURIComponent(t)}`;
        },
        types: ["game"]
      },
      {
        id: "sp",
        name: "Seedpool",
        icon: "https://seedpool.org/favicon.ico",
        bg: "#000000",
        search(t) {
          return `https://seedpool.org/torrents?name=${encodeURIComponent(t.replace(/\s+/g, "."))}`;
        },
        types: ["tv", "movie", "game"]
      }
    ];
    const getSearchText = /* @__PURE__ */ __name(() => {
      const selectedText = getSelection()?.toString();
      if (!selectedText) return;
      return selectedText.replace(/[._()[\]{}-]/g, " ").trim();
    }, "getSearchText");
    const siteButtons = [];
    sites.forEach((site) => {
      const siteButton = createElementFromString(
        /*html*/
        `
        <button id="${site.id}" title="Search ${site.name}" style="background: ${site.bg};" data-types="${site.types.join(",")}">
          <img src="${site.icon}"/>
        </button>
      `
      );
      siteButton.addEventListener("click", (e) => {
        const searchText = getSearchText();
        if (!searchText) return;
        e.preventDefault();
        if (e.shiftKey) {
          return siteButton.classList.toggle("selected");
        }
        if (e.isTrusted) {
          for (const siteButton2 of siteButtons) {
            if (!siteButton2.classList.contains("selected")) continue;
            return siteButtons.forEach((button) => button.classList.remove("selected"));
          }
        }
        if (e.ctrlKey) {
          return window.open(site.search(searchText), "_blank");
        }
        window.open(site.search(searchText), `${site.name} Popup`, "width=1200,height=800,resizable,scrollbars");
      });
      quickSearch.appendChild(siteButton);
      siteButtons.push(siteButton);
    });
    const divider = createElementFromString(
      /*html*/
      `
      <span class="divider"></span>
    `
    );
    quickSearch.appendChild(divider);
    const multiButton = createElementFromString(
      /*html*/
      `
      <button id="quickSearchMultiConfirm" title="Open Selected" style="background: #4caf50" data-types="tv,movie,game">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
          <path d="M42 8.6a2 2 0 0 0-1.7 1L21.5 38.3 9.3 27.8a2 2 0 0 0-3.4 1 2 2 0 0 0 .8 2l14 12a2 2 0 0 0 2.9-.4l20-30.6A2 2 0 0 0 42 8.6"/>
        </svg>
      </button>
    `
    );
    multiButton.addEventListener("click", (e) => {
      const searchText = getSearchText();
      if (!searchText) return;
      e.preventDefault();
      for (const siteButton of siteButtons) {
        if (!siteButton.classList.contains("selected")) continue;
        siteButton?.dispatchEvent(new PointerEvent("click", {
          ctrlKey: e.ctrlKey
        }));
      }
      siteButtons.forEach((button) => button.classList.remove("selected"));
    });
    quickSearch.appendChild(multiButton);
    document.body.appendChild(quickSearch);
  }
};

// src/utils/wait.ts
function wait(delay) {
  const { promise, resolve } = Promise.withResolvers();
  const { minutes = 0, seconds = 0, milliseconds = 0 } = delay;
  setTimeout(resolve, 1e3 * 60 * minutes + 1e3 * seconds + milliseconds);
  return promise;
}
__name(wait, "wait");

// src/UNIT3D.ts
var UNIT3D = class {
  static {
    __name(this, "UNIT3D");
  }
  api;
  gui;
  constructor(opts) {
    this.api = opts.api;
    this.gui = opts.gui;
    document.addEventListener("paste", this.onPaste.bind(this));
  }
  onPaste(e) {
    const input = e.target;
    const idSource = input.id.match(/(?:(?:auto_?)|bulk-)?(\w{4}|mal)/)?.[1];
    if (!idSource || !this.api.validIdSources.includes(idSource)) return;
    e.preventDefault();
    const id = e.clipboardData?.getData("text");
    if (!id) return;
    this.gui.setInputValue(input, id.startsWith("tt") ? id.slice(2) : id);
    if (location.pathname.endsWith("create")) {
      this.createMetadata(idSource, id);
    } else if (location.pathname.endsWith("edit")) {
      this.editMetadata(idSource, id);
    } else if (location.pathname.includes("similar") || location.pathname.endsWith("torrents")) {
      this.bulkEditMetadata(idSource, id);
    }
  }
  async createMetadata(idSource, id) {
    return this.editMetadata(idSource, id);
  }
  async editMetadata(idSource, id) {
    const mediaType = this.gui.getMediaType();
    if (mediaType !== "tv" && mediaType !== "movie") return;
    const ids = await this.api.getIds(id, idSource, mediaType);
    if (!ids) return;
    await this.editId(`#${mediaType}_exists_on_tmdb`, `#tmdb_${mediaType}_id`, ids.id);
    await this.editId("#title_exists_on_imdb", "#imdb", ids.imdb_id?.slice(2));
    await this.editId("#title_exists_on_imdb", "#autoimdb", ids.imdb_id?.slice(2));
    await this.editId("#tv_exists_on_tvdb", "#tvdb", ids.tvdb_id);
    await this.editId("#tv_exists_on_tvdb", "#autotvdb", ids.tvdb_id);
    await this.editId("#anime_exists_on_mal", "#mal", ids.mal_id);
    await this.editId("#anime_exists_on_mal", "#automal", ids.mal_id);
  }
  async editId(existsSelector, inputSelector, id) {
    const exists = document.querySelector(existsSelector);
    const input = document.querySelector(inputSelector);
    if (id) {
      this.gui.setCheckboxChecked(exists, true);
      await wait({ milliseconds: 100 });
      this.gui.setInputValue(input, String(id));
    } else {
      this.gui.setInputValue(input, "");
      await wait({ milliseconds: 100 });
      this.gui.setCheckboxChecked(exists, false);
    }
  }
  async bulkEditMetadata(idSource, id) {
    const mediaType = this.gui.getMediaType();
    if (mediaType !== "tv" && mediaType !== "movie") return;
    const ids = await this.api.getIds(id, idSource, mediaType);
    if (!ids) return;
    await this.bulkEditId("#bulk-tmdb-id", ids.id);
    await this.bulkEditId("#bulk-imdb-id", ids.imdb_id?.slice(2));
    await this.bulkEditId("#bulk-tvdb-id", ids.tvdb_id);
    await this.bulkEditId("#bulk-mal-id", ids.mal_id);
  }
  async bulkEditId(inputSelector, id) {
    const input = document.querySelector(inputSelector);
    if (id) {
      this.gui.setInputValue(input, String(id));
    } else {
      this.gui.setInputValue(input, "");
    }
  }
};

// src/seedpoolAutoIds.ts
var validPages = [
  /\/torrents$/,
  /\/torrents\/\d+$/,
  /\/similar\/[\d.]+$/,
  /\/edit$/,
  /\/create$/
];
var unit3d;
for (const page of validPages) {
  if (!page.test(location.pathname) || unit3d) continue;
  unit3d = new UNIT3D({
    api: new API({
      tmdbKey: TMDB_API_KEY
    }),
    gui: new GUI()
  });
}
