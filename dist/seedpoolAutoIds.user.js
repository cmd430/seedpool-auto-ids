// ==UserScript==
// @name          Seedpool Auto TV/Movie IDs
// @namespace     github.com/cmd430
// @match         https://seedpool.org/torrents/*/edit
// @match         https://seedpool.org/torrents/create
// @match         https://seedpool.org/torrents/similar/*
// @match         https://seedpool.org/torrents?*
// @grant         none
// @inject-into   content
// @version       0.2.3
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
  constructor(opts) {
    this.api = opts.api;
    document.addEventListener("paste", this.onPaste.bind(this));
  }
  onPaste(e) {
    const input = e.target;
    const idSource = input.id.match(/(?:(?:auto_?)|bulk-)?(\w{4}|mal)/)?.[1];
    if (!idSource || !this.api.validIdSources.includes(idSource)) return;
    e.preventDefault();
    const id = e.clipboardData?.getData("text");
    if (!id) return;
    this.setInputValue(input, id.startsWith("tt") ? id.slice(2) : id);
    if (location.pathname.endsWith("create")) {
      this.createMetadata(idSource, id);
    } else if (location.pathname.endsWith("edit")) {
      this.editMetadata(idSource, id);
    } else if (location.pathname.includes("similar")) {
      this.bulkEditMetadata(idSource, id);
    } else if (location.pathname.endsWith("torrents")) {
      this.bulkEditMetadata(idSource, id, true);
    }
  }
  async createMetadata(idSource, id) {
  }
  async editMetadata(idSource, id) {
    const mediaType = this.getMediaTypeFromCategory(document.querySelector("#category_id")?.value);
    if (!mediaType) return;
    const ids = await this.api.getIds(id, idSource, mediaType);
    if (!ids) return;
    const exists_on_tmdb = document.querySelector(`#${mediaType}_exists_on_tmdb`);
    const tmdb_input = document.querySelector(`#tmdb_${mediaType}_id`);
    if (ids.id) {
      this.setCheckboxChecked(exists_on_tmdb, true);
      await wait({ milliseconds: 100 });
      this.setInputValue(tmdb_input, String(ids.id));
    } else {
      this.setInputValue(tmdb_input, "");
      await wait({ milliseconds: 100 });
      this.setCheckboxChecked(exists_on_tmdb, false);
    }
    const exists_on_imdb = document.querySelector("#title_exists_on_imdb");
    const imdb_input = document.querySelector("#imdb");
    if (ids.imdb_id) {
      this.setCheckboxChecked(exists_on_imdb, true);
      await wait({ milliseconds: 100 });
      this.setInputValue(imdb_input, ids.imdb_id.slice(2));
    } else {
      this.setInputValue(imdb_input, "");
      await wait({ milliseconds: 100 });
      this.setCheckboxChecked(exists_on_imdb, false);
    }
    const exists_on_tvdb = document.querySelector("#tv_exists_on_tvdb");
    const tvdb_input = document.querySelector("#tvdb");
    if (mediaType === "tv" && ids.tvdb_id) {
      this.setCheckboxChecked(exists_on_tvdb, true);
      await wait({ milliseconds: 100 });
      this.setInputValue(tvdb_input, String(ids.tvdb_id));
    } else if (mediaType === "tv" && !ids.tvdb_id) {
      this.setInputValue(tvdb_input, "");
      await wait({ milliseconds: 100 });
      this.setCheckboxChecked(exists_on_tvdb, false);
    }
    const exists_on_mal = document.querySelector("#anime_exists_on_mal");
    const mal_input = document.querySelector("#mal");
    if (ids.mal_id) {
      this.setCheckboxChecked(exists_on_mal, true);
      await wait({ milliseconds: 100 });
      this.setInputValue(mal_input, String(ids.mal_id));
    } else {
      this.setInputValue(mal_input, "");
      await wait({ milliseconds: 100 });
      this.setCheckboxChecked(exists_on_mal, false);
    }
  }
  async bulkEditMetadata(idSource, id, isSearch = false) {
    let mediaType;
    if (isSearch) {
      mediaType = this.getMediaTypeFromCategory(document.querySelector(".data-table tr[data-torrent-id]:has(input:checked)")?.dataset.categoryId);
    } else {
      mediaType = this.getMediaTypeFromText(document.querySelector("#swal2-html-container > div > div:first-of-type > label")?.textContent);
    }
    if (mediaType !== "tv" && mediaType !== "movie") return;
    const ids = await this.api.getIds(id, idSource, mediaType);
    if (!ids) return;
    const tmdb_input = document.querySelector("#bulk-tmdb-id");
    if (ids.id) {
      this.setInputValue(tmdb_input, String(ids.id));
    } else {
      this.setInputValue(tmdb_input, "");
    }
    const imdb_input = document.querySelector("#bulk-imdb-id");
    if (ids.imdb_id) {
      this.setInputValue(imdb_input, ids.imdb_id.slice(2));
    } else {
      this.setInputValue(imdb_input, "");
    }
    const tvdb_input = document.querySelector("#bulk-tvdb-id");
    if (mediaType === "tv" && ids.tvdb_id) {
      this.setInputValue(tvdb_input, String(ids.tvdb_id));
    } else if (mediaType === "tv" && !ids.tvdb_id) {
      this.setInputValue(tvdb_input, "");
    }
    const mal_input = document.querySelector("#bulk-mal-id");
    if (ids.mal_id) {
      this.setInputValue(mal_input, String(ids.mal_id));
    } else {
      this.setInputValue(mal_input, "");
    }
  }
  getMediaTypeFromCategory(category) {
    if (!category) return;
    return { 1: "movie", 2: "tv", 6: "tv" }[category];
  }
  getMediaTypeFromText(text) {
    if (!text) return;
    return text.match(/(Movie|TV)/i)?.[1].toLowerCase();
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
};

// src/seedpoolAutoIds.ts
new UNIT3D({
  api: new API({
    tmdbKey: TMDB_API_KEY
  })
});
