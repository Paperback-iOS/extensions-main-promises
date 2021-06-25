/* eslint-disable unicorn/filename-case */
import {
  Source,
  Manga,
  Chapter,
  ChapterDetails,
  HomeSection,
  SearchRequest,
  MangaStatus,
  MangaUpdates,
  PagedResults,
  SourceInfo,
  TagSection,
  MangaTile,
  LanguageCode,
} from 'paperback-extensions-common'

import {reverseLangCode} from './Languages'

export const PaperbackInfo: SourceInfo = {
  version: '2.0.0',
  name: 'Paperback',
  icon: 'icon.png',
  author: 'Lemon & Faizan Durrani',
  authorWebsite: 'https://github.com/FramboisePi',
  description: 'Access Public Domain books from Paperback!',
  hentaiSource: false,
  websiteBaseURL: 'https://Paperback.moe',
  sourceTags: []
}

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// Number of items requested for paged requests
const PAGE_SIZE = 40
const komgaAPI = 'https://api.paperback.moe'

export const parseMangaStatus = (komgaStatus: string) => {
  switch (komgaStatus) {
  case 'ENDED':
    return MangaStatus.COMPLETED
  case 'ONGOING':
    return MangaStatus.ONGOING
  case 'ABANDONED':
    return MangaStatus.ONGOING
  case 'HIATUS':
    return MangaStatus.ONGOING
  }
  return MangaStatus.ONGOING
}
export class Paperback extends Source {
  createKomgaAPI(serverAddress: string) {
    return serverAddress + (serverAddress.slice(-1) === '/' ? 'api/v1' : '/api/v1')
  }

  getKomgaAPI(): Promise<string> {
    return Promise.resolve(this.createKomgaAPI(komgaAPI))
  }

  override requestManager = createRequestManager({
    requestsPerSecond: 4, requestTimeout: 60000
  })

  async getMangaDetails(mangaId: string): Promise<Manga> {
    /*
      In Komga a manga is represented by a `serie`
     */
    const komgaAPI = await this.getKomgaAPI()

    const request = createRequestObject({
      url: `${komgaAPI}/series/${mangaId}/`,
      method: 'GET',
    })

    const response = await this.requestManager.schedule(request, 1)
    const result = (typeof response.data) === 'string' ? JSON.parse(response.data) : response.data
    const metadata = result.metadata
    const booksMetadata = result.booksMetadata

    const tagSections: TagSection[] = [
      createTagSection({id: '0', label: 'genres', tags: metadata.genres.map((elem: string) => createTag({id: elem, label: elem}))}),
      createTagSection({id: '1', label: 'tags', tags: metadata.tags.map((elem: string) => createTag({id: elem, label: elem}))})
    ]

    const authors: string[] = []
    const artists: string[] = []

    // Additional roles: colorist, inker, letterer, cover, editor
    for (const entry of booksMetadata.authors) {
      if (entry.role === 'writer') {
        authors.push(entry.name)
      }
      if (entry.role === 'penciller') {
        artists.push(entry.name)
      }
    }

    return createManga({
      id: mangaId,
      titles: [metadata.title],
      image: `${komgaAPI}/series/${mangaId}/thumbnail`,
      rating: 5,
      status: parseMangaStatus(metadata.status),
      langFlag: metadata.language,
      // langName:,

      artist: artists.join(', '),
      author: authors.join(', '),

      desc: (metadata.summary ? metadata.summary : booksMetadata.summary),
      tags: tagSections,
      lastUpdate: metadata.lastModified,
    })
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    /*
      In Komga a chapter is a `book`
     */

    const komgaAPI = await this.getKomgaAPI()

    const request = createRequestObject({
      url: `${komgaAPI}/series/${mangaId}/books`,
      param: '?unpaged=true&media_status=READY',
      method: 'GET',
    })

    const response = await this.requestManager.schedule(request, 1)
    const result = (typeof response.data) === 'string' ? JSON.parse(response.data) : response.data
    console.log(response.data)

    const chapters: Chapter[] = []

    // Chapters language is only available on the serie page
    const requestSerie = createRequestObject({
      url: `${komgaAPI}/series/${mangaId}/`,
      method: 'GET',
    })
    const responseSerie = await this.requestManager.schedule(requestSerie, 1)
    const resultSerie = (typeof responseSerie.data) === 'string' ? JSON.parse(responseSerie.data) : responseSerie.data
    const languageCode = reverseLangCode[resultSerie?.metadata?.language ?? ''] ?? reverseLangCode._unknown

    for (const book of result.content) {
      chapters.push(
        createChapter({
          id: book.id,
          mangaId: mangaId,
          chapNum: book.metadata.numberSort,
          langCode: languageCode ?? LanguageCode.UNKNOWN,
          name: `${book.metadata.number} - ${book.metadata.title} (${book.size})`,
          time: new Date(book.fileLastModified),
        }),
      )
    }

    return chapters
  }

  async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
    const komgaAPI = await this.getKomgaAPI()

    const request = createRequestObject({
      url: `${komgaAPI}/books/${chapterId}/pages`,
      method: 'GET',
    })

    const data = await this.requestManager.schedule(request, 1)
    const result = (typeof data.data) === 'string' ? JSON.parse(data.data) : data.data

    const pages: string[] = []
    for (const page of result) {
      if (SUPPORTED_IMAGE_TYPES.includes(page.mediaType)) {
        pages.push(`${komgaAPI}/books/${chapterId}/pages/${page.number}`)
      } else {
        pages.push(`${komgaAPI}/books/${chapterId}/pages/${page.number}?convert=png`)
      }
    }

    // Determine the preferred reading direction which is only available in the serie metadata
    const serieRequest = createRequestObject({
      url: `${komgaAPI}/series/${mangaId}/`,
      method: 'GET',
    })

    const serieResponse = await this.requestManager.schedule(serieRequest, 1)
    const serieResult = (typeof serieResponse.data) === 'string' ? JSON.parse(serieResponse.data) : serieResponse.data

    let longStrip = false
    if (['VERTICAL', 'WEBTOON'].includes(serieResult.metadata.readingDirection)) {
      longStrip = true
    }

    return createChapterDetails({
      id: chapterId,
      longStrip: longStrip,
      mangaId: mangaId,
      pages: pages,
    })
  }

  async searchRequest(searchQuery: SearchRequest, metadata: any): Promise<PagedResults> {
    const komgaAPI = await this.getKomgaAPI()
    const page : number = metadata?.page ?? 0

    const paramsList = [`page=${page}`, `size=${PAGE_SIZE}`]

    if (searchQuery.title !== undefined) {
      paramsList.push('search=' + encodeURIComponent(searchQuery.title))
    }
    /*
    if (query.status !== undefined) {
      paramsList.push("status=" + KOMGA_STATUS_LIST[query.status])
    }
    */

    let paramsString = ''
    if (paramsList.length > 0) {
      paramsString = '?' + paramsList.join('&')
    }

    const request = createRequestObject({
      url: `${komgaAPI}/series`,
      method: 'GET',
      param: paramsString,
    })

    const data = await this.requestManager.schedule(request, 1)

    const result = (typeof data.data) === 'string' ? JSON.parse(data.data) : data.data

    const tiles = []
    for (const serie of result.content) {
      tiles.push(createMangaTile({
        id: serie.id,
        title: createIconText({text: serie.metadata.title}),
        image: `${komgaAPI}/series/${serie.id}/thumbnail`,
        subtitleText: createIconText({text: 'id: ' + serie.id}),
      }))
    }

    // If no series were returned we are on the last page
    metadata = tiles.length === 0 ? undefined : {page: page + 1}

    return createPagedResults({
      results: tiles,
      metadata,
    })
  }

  override async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
    const komgaAPI = await this.getKomgaAPI()

    // The source define two homepage sections: new and latest
    const sections = [
      createHomeSection({
        id: 'new',
        title: 'Recently added series',
        view_more: true,
      }),
      createHomeSection({
        id: 'updated',
        title: 'Recently updated series',
        view_more: true,
      }),
    ]

    const promises: Promise<void>[] = []

    for (const section of sections) {
      // Let the app load empty tagSections
      sectionCallback(section)

      const request = createRequestObject({
        url: `${komgaAPI}/series/${section.id}`,
        param: '?page=0&size=20',
        method: 'GET',
      })

      // Get the section data
      promises.push(
        this.requestManager.schedule(request, 1).then(data => {
          const result = (typeof data.data) === 'string' ? JSON.parse(data.data) : data.data
          console.log(data)

          const tiles = []
          for (const serie of result.content) {
            tiles.push(createMangaTile({
              id: serie.id,
              title: createIconText({text: serie.metadata.title}),
              image: `${komgaAPI}/series/${serie.id}/thumbnail`,
              subtitleText: createIconText({text: 'id: ' + serie.id}),
            }))
          }
          section.items = tiles
          sectionCallback(section)
        }),
      )
    }

    // Make sure the function completes
    await Promise.all(promises)
  }

  override async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
    const komgaAPI = await this.getKomgaAPI()
    const page: number = metadata?.page ?? 0

    const request = createRequestObject({
      url: `${komgaAPI}/series/${homepageSectionId}`,
      param: `?page=${page}&size=${PAGE_SIZE}`,
      method: 'GET',
    })

    const data = await this.requestManager.schedule(request, 1)
    const result = (typeof data.data) === 'string' ? JSON.parse(data.data) : data.data

    const tiles: MangaTile[] = []
    for (const serie of result.content) {
      tiles.push(createMangaTile({
        id: serie.id,
        title: createIconText({text: serie.metadata.title}),
        image: `${komgaAPI}/series/${serie.id}/thumbnail`,
        subtitleText: createIconText({text: 'id: ' + serie.id}),
      }))
    }

    // If no series were returned we are on the last page
    metadata = tiles.length === 0 ? undefined : {page: page + 1}

    return createPagedResults({
      results: tiles,
      metadata: metadata,
    })
  }

  override async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {
    const komgaAPI = await this.getKomgaAPI()

    // We make requests of PAGE_SIZE titles to `series/updated/` until we got every titles
    // or we got a title which `lastModified` metadata is older than `time`
    let page = 0
    const foundIds: string[] = []
    let loadMore = true

    while (loadMore) {
      const request = createRequestObject({
        url: `${komgaAPI}/series/updated/`,
        param: `?page=${page}&size=${PAGE_SIZE}`,
        method: 'GET',
      })

      const data = await this.requestManager.schedule(request, 1)
      const result = (typeof data.data) === 'string' ? JSON.parse(data.data) : data.data

      for (const serie of result.content) {
        const serieUpdated = new Date(serie.metadata.lastModified)

        if (serieUpdated >= time) {
          if (ids.includes(serie)) {
            foundIds.push(serie)
          }
        } else {
          loadMore = false
          break
        }
      }

      // If no series were returned we are on the last page
      if (result.content.length === 0) {
        loadMore = false
      }

      page += 1

      if (foundIds.length > 0) {
        mangaUpdatesFoundCallback(createMangaUpdates({
          ids: foundIds,
        }))
      }
    }
  }
}
