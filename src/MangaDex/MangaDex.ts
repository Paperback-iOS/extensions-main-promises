import { PagedResults, Source, Manga, Chapter, ChapterDetails, HomeSectionRequest, HomeSection, MangaTile, SearchRequest, Request, MangaUpdates, SourceTag, TagType } from "paperback-extensions-common";

export class MangaDex extends Source {

  constructor(cheerio: CheerioAPI) {
    super(cheerio);
  }

  get version(): string { return '1.1.0'; }
  get name(): string { return 'MangaDex'; }
  get icon(): string { return 'icon.png'; }
  get author(): string { return 'Faizan Durrani'; }
  get authorWebsite(): string { return 'https://github.com/FaizanDurrani'; }
  get description(): string { return 'The default source for Papaerback, supports notifications'; }
  get hentaiSource(): boolean { return false; }
  get websiteBaseURL(): string { return 'https://mangadex.org'; }
  get sourceTags(): SourceTag[] {
    return [
      {
        text: "Recommended",
        type: TagType.BLUE
      }
    ];
  }

  get rateLimit() { return 1; }

  getMangaDetailsRequest(ids: string[]): Request[] {
    return [createRequestObject({
      metadata: { ids },
      url: CACHE_MANGA,
      method: 'POST',
      headers: {
        "content-type": "application/json"
      },
      data: JSON.stringify({
        id: ids.map(x => parseInt(x))
      })
    })];
  }
  getMangaDetails(data: any, metadata: any): Manga[] {
    let result = JSON.parse(data);

    let mangas = [];
    for (let mangaDetails of result["result"]) {
      mangas.push(createManga({
        id: mangaDetails["id"].toString(),
        titles: mangaDetails["titles"],
        image: mangaDetails["image"] ?? "https://mangadex.org/images/avatars/default1.jpg",
        rating: mangaDetails["rating"],
        status: mangaDetails["status"],
        langFlag: mangaDetails["langFlag"],
        langName: mangaDetails["langName"],
        artist: mangaDetails["artist"],
        author: mangaDetails["author"],
        avgRating: mangaDetails["avgRating"],
        covers: mangaDetails["covers"],
        desc: mangaDetails["description"],
        follows: mangaDetails["follows"],
        tags: [
          createTagSection({
            id: "content",
            label: "Content",
            tags: mangaDetails["content"].map((x: any) => createTag({ id: x["id"].toString(), label: x["value"] }))
          }),
          createTagSection({
            id: "demographic",
            label: "Demographic",
            tags: mangaDetails["demographic"].map((x: any) => createTag({ id: x["id"].toString(), label: x["value"] }))
          }),
          createTagSection({
            id: "format",
            label: "Format",
            tags: mangaDetails["format"].map((x: any) => createTag({ id: x["id"].toString(), label: x["value"] }))
          }),
          createTagSection({
            id: "genre",
            label: "Genre",
            tags: mangaDetails["genre"].map((x: any) => createTag({ id: x["id"].toString(), label: x["value"] }))
          }),
          createTagSection({
            id: "theme",
            label: "Theme",
            tags: mangaDetails["theme"].map((x: any) => createTag({ id: x["id"].toString(), label: x["value"] }))
          })
        ],
        users: mangaDetails["users"],
        views: mangaDetails["views"],
        hentai: mangaDetails["hentai"],
        relatedIds: mangaDetails["relatedIds"],
        lastUpdate: mangaDetails["lastUpdate"]
      }));
    }

    return mangas;
  }

  getChaptersRequest(mangaId: string): Request {
    let metadata = { mangaId };
    return createRequestObject({
      metadata,
      url: `${MD_MANGA_API}/${mangaId}`,
      method: "GET"
    });
  }

  getChapters(data: any, metadata: any): Chapter[] {
    let chapters = JSON.parse(data).chapter as any;

    return Object.keys(chapters).map(id => {
      const chapter = chapters[id];
      const volume = Number(chapter.volume);
      return createChapter({
        id: id,
        chapNum: Number(chapter.chapter),
        langCode: chapter.lang_code,
        volume: Number.isNaN(volume) ? 0 : volume,
        mangaId: metadata.mangaId,
        group: chapter.group_name,
        name: chapter.title,
        time: new Date(Number(chapter.timestamp) * 1000)
      });
    });
  }

  getChapterDetailsRequest(mangaId: string, chapId: string): Request {
    return createRequestObject({
      url: `${MD_CHAPTER_API}/${chapId}?mark_read=0`,
      method: 'GET',
      incognito: false
    });
  }

  getChapterDetails(data: any, metadata: any): ChapterDetails {
    let chapterDetails = JSON.parse(data) as any;

    return createChapterDetails({
      id: chapterDetails['id'].toString(),
      longStrip: parseInt(chapterDetails['long_strip']) == 1,
      mangaId: chapterDetails['manga_id'].toString(),
      pages: chapterDetails['page_array'].map((x: string) => `${chapterDetails['server']}${chapterDetails['hash']}/${x}`)
    });
  }

  constructFilterUpdatedMangaRequest(ids: string[], time: Date, page: number) {
    let metadata = { 'ids': ids, 'referenceTime': time, page: page };

    console.log(`time ${time}, idCount: ${ids.length}`);

    return createRequestObject({
      metadata: metadata,
      url: 'https://mangadex.org/titles/0/' + page.toString(),
      method: "GET",
      incognito: true,
      cookies: [
        createCookie({
          name: "mangadex_title_mode",
          value: "2",
          domain: MD_DOMAIN
        })
      ]
    });
  }

  filterUpdatedMangaRequest(ids: string[], time: Date): Request | null {
    return this.constructFilterUpdatedMangaRequest(ids, time, 1);
  }

  filterUpdatedManga(data: any, metadata: any): MangaUpdates {
    let $ = this.cheerio.load(data);

    console.log(`REFERENCE TIME: ${metadata.referenceTime}`);

    let returnObject: MangaUpdates = {
      'ids': [],
      nextPage: this.constructFilterUpdatedMangaRequest(metadata.ids, metadata.referenceTime, metadata.page + 1)
    };

    for (let elem of $('.manga-entry').toArray()) {
      let id = elem.attribs['data-id'];
      let mangaDate = new Date(($(elem).find('time').attr('datetime') ?? "").replace(/-/g, "/"));
      console.log(`${id} updated at ${mangaDate}}`);
      if (mangaDate >= metadata.referenceTime) {
        if (metadata.ids.includes(id)) {
          console.log(`${id} marked as an update`);
          returnObject.ids.push(id);
        }
      }
      else {
        returnObject.nextPage = undefined;
        return createMangaUpdates(returnObject);
      }
    }

    console.log(`Found ${returnObject.ids.length} updates`);
    return createMangaUpdates(returnObject);
  }

  getHomePageSectionRequest(): HomeSectionRequest[] {
    console.log(JSON.stringify(this));
    let request1 = createRequestObject({
      url: 'https://mangadex.org',
      method: "GET"
    });
    let request2 = createRequestObject({
      url: 'https://mangadex.org/updates',
      method: 'GET'
    });

    let section1 = createHomeSection({ id: 'featured_titles', title: 'FEATURED TITLES' });
    let section2 = createHomeSection({ id: 'new_titles', title: 'NEW TITLES' });
    let section3 = createHomeSection({
      id: 'recently_updated',
      title: 'RECENTLY UPDATED TITLES',
      view_more: this.constructGetViewMoreRequest('recently_updated', 1)
    });

    return [
      createHomeSectionRequest({
        request: request1,
        sections: [section1, section2]
      }),
      createHomeSectionRequest({
        request: request2,
        sections: [section3]
      })
    ];
  }

  getHomePageSections(data: any, sections: HomeSection[]): HomeSection[] {
    console.log(JSON.stringify(this));

    let $ = this.cheerio.load(data);
    return sections.map(section => {
      switch (section.id) {
        case 'featured_titles':
          section.items = this.parseFeaturedMangaTiles($);
          break;
        case 'new_titles':
          section.items = this.parseNewMangaSectionTiles($);
          break;
        case 'recently_updated':
          section.items = this.parseRecentlyUpdatedMangaSectionTiles($);
          break;
      }

      return section;
    });
  }

  constructGetViewMoreRequest(key: string, page: number) {
    return createRequestObject({
      url: 'https://mangadex.org/updates/' + page.toString(),
      method: 'GET',
      metadata: {
        key, page
      }
    });
  }

  getViewMoreItems(data: string, key: string, metadata: any): PagedResults {
    let $ = this.cheerio.load(data);

    let updates = this.parseRecentlyUpdatedMangaSectionTiles($);

    return createPagedResults({
      results: updates,
      nextPage: updates.length > 0 ? this.constructGetViewMoreRequest(key, metadata.page + 1) : undefined
    });
  }

  parseFeaturedMangaTiles($: CheerioSelector): MangaTile[] {
    let featuredManga: MangaTile[] = [];

    $("#hled_titles_owl_carousel .large_logo").each(function (i: any, elem: any) {
      let title = $(elem);

      let img = title.find("img").first();
      let links = title.find("a");

      let idStr: any = links.first().attr("href");
      let id = idStr!!.match(/(\d+)(?=\/)/) ?? "-1";

      let caption = title.find(".car-caption p:nth-child(2)");
      let bookmarks = caption.find("span[title=Follows]").text();
      let rating = caption.find("span[title=Rating]").text();

      featuredManga.push(createMangaTile({
        id: id[0],
        image: img.attr("data-src") ?? "",
        title: createIconText({ text: img.attr("title") ?? "" }),
        primaryText: createIconText({ text: bookmarks, icon: 'bookmark.fill' }),
        secondaryText: createIconText({ text: rating, icon: 'star.fill' })
      }));
    });

    return featuredManga;
  }

  parseNewMangaSectionTiles($: CheerioSelector): MangaTile[] {
    let newManga: MangaTile[] = [];

    $("#new_titles_owl_carousel .large_logo").each(function (i: any, elem: any) {
      let title = $(elem);

      let img = title.find("img").first();
      let links = title.find("a");

      let idStr: any = links.first().attr("href");
      let id = idStr.match(/(\d+)(?=\/)/);

      let caption = title.find(".car-caption p:nth-child(2)");
      let obj: any = { name: caption.find("a").text(), group: "", time: Date.parse(caption.find("span").attr("title") ?? " "), langCode: "" };
      let updateTime: string = caption.find("span").text();
      newManga.push(createMangaTile({
        id: id[0],
        image: img.attr("data-src") ?? " ",
        title: createIconText({ text: img.attr("title") ?? " " }),
        subtitleText: createIconText({ text: caption.find("a").text() }),
        secondaryText: createIconText({ text: updateTime, icon: 'clock.fill' })
      }));
    });

    return newManga;
  }

  parseRecentlyUpdatedMangaSectionTiles($: CheerioSelector): MangaTile[] {
    let updates: MangaTile[] = [];
    let elem = $('tr', 'tbody').toArray();
    let i = 0;

    while (i < elem.length) {
      let hasImg: boolean = false;
      let idStr: string = $('a.manga_title', elem[i]).attr('href') ?? '';
      let id: string = (idStr.match(/(\d+)(?=\/)/) ?? '')[0] ?? '';
      let title: string = $('a.manga_title', elem[i]).text() ?? '';
      let image: string = (MD_DOMAIN + $('img', elem[i]).attr('src')) ?? '';

      // in this case: badge will be number of updates
      // that the manga has received within last week
      let badge = 0;
      let pIcon = 'eye.fill';
      let sIcon = 'clock.fill';
      let subTitle = '';
      let pText = '';
      let sText = '';

      let first = true;
      i++;
      while (!hasImg && i < elem.length) {
        // for the manga tile, we only care about the first/latest entry
        if (first && !hasImg) {
          subTitle = $('a', elem[i]).first().text();
          pText = $('.text-center.text-info', elem[i]).text();
          sText = $('time', elem[i]).text().replace('ago', '').trim();
          first = false;
        }
        badge++;
        i++;

        hasImg = $(elem[i]).find('img').length > 0;
      }

      updates.push(createMangaTile({
        id,
        image,
        title: createIconText({ text: title }),
        subtitleText: createIconText({ text: subTitle }),
        primaryText: createIconText({ text: pText, icon: pIcon }),
        secondaryText: createIconText({ text: sText, icon: sIcon }),
        badge
      }));
    }

    return updates;
  }

  constructSearchRequest(query: SearchRequest, page: number) {
    return createRequestObject({
      url: CACHE_SEARCH + `?page=${page}&items=100`,
      method: "POST",
      data: JSON.stringify({
        title: query.title
      }),
      headers: {
        "content-type": "application/json"
      },
      metadata: {
        page: page,
        query: query
      }
    });
  }

  searchRequest(query: SearchRequest): Request | null {
    return this.constructSearchRequest(query, 1);
  }

  search(data: any, metadata: any): PagedResults | null {
    let result = JSON.parse(data);

    let mangas = [];
    for (let mangaDetails of result["result"]) {
      mangas.push(
        createMangaTile({
          id: mangaDetails["id"].toString(),
          image: mangaDetails["image"],
          title: createIconText({
            text: mangaDetails["titles"][0] ?? "UNKNOWN"
          })
        })
      );
    }

    return createPagedResults({
      results: mangas,
      nextPage: mangas.length > 0 ? this.constructSearchRequest(metadata.query, metadata.page + 1) : undefined
    });
  }

  getMangaShareUrl(mangaId: string) {
    return `${MD_DOMAIN}/manga/${mangaId}`;
  }
}
