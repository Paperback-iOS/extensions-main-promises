/* eslint-disable camelcase, @typescript-eslint/explicit-module-boundary-types, radix, unicorn/filename-case */
import {
  PagedResults,
  Source,
  Manga,
  Chapter,
  ChapterDetails,
  HomeSectionRequest,
  HomeSection,
  MangaTile,
  SearchRequest,
  Request,
  MangaUpdates,
  SourceTag,
  TagType,
} from 'paperback-extensions-common'

export class MangaDex extends Source {
  get version(): string {
    return '1.1.1'
  }

  get name(): string {
    return 'SafeDex'
  }

  get icon(): string {
    return 'icon.png'
  }

  get author(): string {
    return 'Faizan Durrani'
  }

  get authorWebsite(): string {
    return 'https://github.com/FaizanDurrani'
  }

  get description(): string {
    return 'The default source for Papaerback, supports notifications'
  }

  get hentaiSource(): boolean {
    return false
  }

  get websiteBaseURL(): string {
    return 'https://mangadex.org'
  }

  get sourceTags(): SourceTag[] {
    return [
      {
        text: 'Recommended',
        type: TagType.BLUE,
      },
    ]
  }

  get rateLimit(): number {
    return 1
  }

  get sectionKeys() {
    return {
      shounen: 'shounen',
      recentlyUpdated: 'recentlyUpdated',
    }
  }

  getMangaDetailsRequest(ids: string[]): Request[] {
    return [
      createRequestObject({
        metadata: {ids},
        url: CACHE_MANGA,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        data: JSON.stringify({
          id: ids.map(x => parseInt(x)),
        }),
      }),
    ]
  }

  getMangaDetails(data: any, _metadata: any): Manga[] {
    const result = JSON.parse(data)

    const mangas = []
    for (const mangaDetails of result.result) {
      mangas.push(
        createManga({
          id: mangaDetails.id.toString(),
          titles: mangaDetails.titles,
          image:
            mangaDetails.image ??
            'https://mangadex.org/images/avatars/default1.jpg',
          rating: mangaDetails.rating,
          status: mangaDetails.status,
          langFlag: mangaDetails.langFlag,
          langName: mangaDetails.langName,
          artist: mangaDetails.artist,
          author: mangaDetails.author,
          avgRating: mangaDetails.avgRating,
          covers: mangaDetails.covers,
          desc: mangaDetails.description,
          follows: mangaDetails.follows,
          tags: [
            createTagSection({
              id: 'content',
              label: 'Content',
              tags: mangaDetails.content.map((x: any) =>
                createTag({id: x.id.toString(), label: x.value}),
              ),
            }),
            createTagSection({
              id: 'demographic',
              label: 'Demographic',
              tags: mangaDetails.demographic.map((x: any) =>
                createTag({id: x.id.toString(), label: x.value}),
              ),
            }),
            createTagSection({
              id: 'format',
              label: 'Format',
              tags: mangaDetails.format.map((x: any) =>
                createTag({id: x.id.toString(), label: x.value}),
              ),
            }),
            createTagSection({
              id: 'genre',
              label: 'Genre',
              tags: mangaDetails.genre.map((x: any) =>
                createTag({id: x.id.toString(), label: x.value}),
              ),
            }),
            createTagSection({
              id: 'theme',
              label: 'Theme',
              tags: mangaDetails.theme.map((x: any) =>
                createTag({id: x.id.toString(), label: x.value}),
              ),
            }),
          ],
          users: mangaDetails.users,
          views: mangaDetails.views,
          hentai: mangaDetails.hentai,
          relatedIds: mangaDetails.relatedIds,
          lastUpdate: mangaDetails.lastUpdate,
        }),
      )
    }

    return mangas
  }

  getChaptersRequest(mangaId: string): Request {
    const metadata = {mangaId}
    return createRequestObject({
      metadata,
      url: `${MD_MANGA_API}/${mangaId}`,
      method: 'GET',
    })
  }

  getChapters(data: any, metadata: any): Chapter[] {
    const chapters = JSON.parse(data).chapter as any

    return Object.keys(chapters).map(id => {
      const chapter = chapters[id]
      const volume = Number(chapter.volume)
      return createChapter({
        id: id,
        chapNum: Number(chapter.chapter),
        langCode: chapter.lang_code,
        volume: Number.isNaN(volume) ? 0 : volume,
        mangaId: metadata.mangaId,
        group: chapter.group_name,
        name: chapter.title,
        time: new Date(Number(chapter.timestamp) * 1000),
      })
    })
  }

  getChapterDetailsRequest(_mangaId: string, chapId: string): Request {
    return createRequestObject({
      url: `${MD_CHAPTER_API}/${chapId}?mark_read=0`,
      method: 'GET',
      incognito: false,
    })
  }

  getChapterDetails(data: any, _metadata: any): ChapterDetails {
    const chapterDetails = JSON.parse(data) as any

    return createChapterDetails({
      id: chapterDetails.id.toString(),
      longStrip: parseInt(chapterDetails.long_strip) === 1,
      mangaId: chapterDetails.manga_id.toString(),
      pages: chapterDetails.page_array.map(
        (x: string) =>
          `${chapterDetails.server}${chapterDetails.hash}/${x}`,
      ),
    })
  }

  constructFilterUpdatedMangaRequest(ids: string[], time: Date, page: number) {
    const metadata = {ids: ids, referenceTime: time, page: page}

    console.log(`time ${time}, idCount: ${ids.length}`)

    return createRequestObject({
      metadata: metadata,
      url: 'https://mangadex.org/titles/0/' + page.toString(),
      method: 'GET',
      incognito: true,
      cookies: [
        createCookie({
          name: 'mangadex_title_mode',
          value: '2',
          domain: MD_DOMAIN,
        }),
      ],
    })
  }

  filterUpdatedMangaRequest(ids: string[], time: Date): Request | null {
    return this.constructFilterUpdatedMangaRequest(ids, time, 1)
  }

  filterUpdatedManga(data: any, metadata: any): MangaUpdates {
    const $ = this.cheerio.load(data)

    console.log(`REFERENCE TIME: ${metadata.referenceTime}`)

    const returnObject: MangaUpdates = {
      ids: [],
      nextPage: this.constructFilterUpdatedMangaRequest(
        metadata.ids,
        metadata.referenceTime,
        metadata.page + 1,
      ),
    }

    for (const elem of $('.manga-entry').toArray()) {
      const id = elem.attribs['data-id']
      const mangaDate = new Date(
        ($(elem).find('time').attr('datetime') ?? '').replace(/-/g, '/'),
      )
      console.log(`${id} updated at ${mangaDate}}`)
      if (mangaDate >= metadata.referenceTime) {
        if (metadata.ids.includes(id)) {
          console.log(`${id} marked as an update`)
          returnObject.ids.push(id)
        }
      } else {
        returnObject.nextPage = undefined
        return createMangaUpdates(returnObject)
      }
    }

    console.log(`Found ${returnObject.ids.length} updates`)
    return createMangaUpdates(returnObject)
  }

  getHomePageSectionRequest(): HomeSectionRequest[] {
    console.log(JSON.stringify(this))
    const request1 = this.constructSearchRequest({
      includeDemographic: ['1'],
    }, 1, 10)

    const request2 = this.constructSearchRequest({
      includeGenre: ['2'],
    }, 1, 10)

    const section1 = createHomeSection({
      id: this.sectionKeys.shounen,
      title: 'UPDATED SHOUNEN TITLES',
      view_more: this.constructGetViewMoreRequest(this.sectionKeys.shounen, 1),
    })

    const section3 = createHomeSection({
      id: this.sectionKeys.recentlyUpdated,
      title: 'UPDATED ACTION TITLES',
      view_more: this.constructGetViewMoreRequest(this.sectionKeys.recentlyUpdated, 1),
    })

    return [
      createHomeSectionRequest({
        request: request1,
        sections: [section1],
      }),
      createHomeSectionRequest({
        request: request2,
        sections: [section3],
      }),
    ]
  }

  getHomePageSections(data: any, sections: HomeSection[]): HomeSection[] {
    return sections.map(section => {
      switch (section.id) {
      case this.sectionKeys.shounen:
        section.items = this.parseRecentlyUpdatedMangaSectionTiles(data)
        break
      case this.sectionKeys.recentlyUpdated:
        section.items = this.parseRecentlyUpdatedMangaSectionTiles(data)
        break
      }

      return section
    })
  }

  constructGetViewMoreRequest(key: string, page: number) {
    switch (key) {
    case this.sectionKeys.shounen:
      return this.constructSearchRequest({
        includeDemographic: ['1'],
      }, page)

    case this.sectionKeys.recentlyUpdated:
      return this.constructSearchRequest({
        includeGenre: ['2'],
      }, page)
    }
  }

  getViewMoreItems(data: string, key: string, metadata: any): PagedResults {
    const updates = this.parseRecentlyUpdatedMangaSectionTiles(data)

    return createPagedResults({
      results: updates,
      nextPage:
        updates.length > 0 ?
          this.constructGetViewMoreRequest(key, metadata.page + 1) :
          undefined,
    })
  }

  parseRecentlyUpdatedMangaSectionTiles(data: any): MangaTile[] {
    const updates: MangaTile[] = []
    const result = JSON.parse(data).result

    for (const manga of result) {
      console.log(manga.lastUpdate)
      updates.push(
        createMangaTile({
          id: manga.id.toString(),
          image: manga.image,
          title: createIconText({
            text: manga.titles[0] ?? 'UNKNOWN',
          }),
          subtitleText: createIconText({
            icon: 'clock.fill',
            text: this.timeDifference(
              new Date().getTime(),
              new Date(manga.lastUpdate).getTime(),
            ),
          }),
        }),
      )
    }
    return updates
  }

  constructSearchRequest(query: SearchRequest, page: number, items = 50) {
    return createRequestObject({
      url: CACHE_SEARCH + `?page=${page}&items=${items}`,
      method: 'POST',
      data: JSON.stringify({
        title: query.title,
      }),
      headers: {
        'content-type': 'application/json',
      },
      metadata: {
        page: page,
        query: query,
      },
    })
  }

  searchRequest(query: SearchRequest): Request | null {
    return this.constructSearchRequest(query, 1)
  }

  search(data: any, metadata: any): PagedResults | null {
    const result = JSON.parse(data)

    const mangas = []
    for (const mangaDetails of result.result) {
      mangas.push(
        createMangaTile({
          id: mangaDetails.id.toString(),
          image: mangaDetails.image,
          title: createIconText({
            text: mangaDetails.titles[0] ?? 'UNKNOWN',
          }),
        }),
      )
    }

    return createPagedResults({
      results: mangas,
      nextPage:
        mangas.length > 0 ?
          this.constructSearchRequest(metadata.query, metadata.page + 1) :
          undefined,
    })
  }

  getMangaShareUrl(mangaId: string) {
    return `${MD_DOMAIN}/manga/${mangaId}`
  }

  timeDifference(current: number, previous: number) {
    const msPerMinute = 60 * 1000
    const msPerHour = msPerMinute * 60
    const msPerDay = msPerHour * 24
    const msPerMonth = msPerDay * 30
    const msPerYear = msPerDay * 365

    const elapsed = current - previous

    if (elapsed < msPerMinute) {
      return Math.round(elapsed / 1000) + ' sec ago'
    }
    if (elapsed < msPerHour) {
      return Math.round(elapsed / msPerMinute) + ' min ago'
    }
    if (elapsed < msPerDay) {
      return Math.round(elapsed / msPerHour) + ' hrs ago'
    }
    if (elapsed < msPerMonth) {
      return Math.round(elapsed / msPerDay) + ' days ago'
    }
    if (elapsed < msPerYear) {
      return Math.round(elapsed / msPerMonth) + ' months ago'
    }
    return Math.round(elapsed / msPerYear) + ' years ago'
  }
}
