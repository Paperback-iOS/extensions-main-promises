(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MangaDex = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
class MangaDex extends paperback_extensions_common_1.Source {
    constructor(cheerio) {
        super(cheerio);
    }
    get version() {
        return "1.1.0";
    }
    get name() {
        return "SafeDex";
    }
    get icon() {
        return "icon.png";
    }
    get author() {
        return "Faizan Durrani";
    }
    get authorWebsite() {
        return "https://github.com/FaizanDurrani";
    }
    get description() {
        return "The default source for Papaerback, supports notifications";
    }
    get hentaiSource() {
        return false;
    }
    get websiteBaseURL() {
        return "https://mangadex.org";
    }
    get sourceTags() {
        return [
            {
                text: "Recommended",
                type: paperback_extensions_common_1.TagType.BLUE,
            },
        ];
    }
    get rateLimit() {
        return 1;
    }
    getMangaDetailsRequest(ids) {
        return [
            createRequestObject({
                metadata: { ids },
                url: CACHE_MANGA,
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                data: JSON.stringify({
                    id: ids.map((x) => parseInt(x)),
                }),
            }),
        ];
    }
    getMangaDetails(data, metadata) {
        var _a;
        let result = JSON.parse(data);
        let mangas = [];
        for (let mangaDetails of result["result"]) {
            mangas.push(createManga({
                id: mangaDetails["id"].toString(),
                titles: mangaDetails["titles"],
                image: (_a = mangaDetails["image"]) !== null && _a !== void 0 ? _a : "https://mangadex.org/images/avatars/default1.jpg",
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
                        tags: mangaDetails["content"].map((x) => createTag({ id: x["id"].toString(), label: x["value"] })),
                    }),
                    createTagSection({
                        id: "demographic",
                        label: "Demographic",
                        tags: mangaDetails["demographic"].map((x) => createTag({ id: x["id"].toString(), label: x["value"] })),
                    }),
                    createTagSection({
                        id: "format",
                        label: "Format",
                        tags: mangaDetails["format"].map((x) => createTag({ id: x["id"].toString(), label: x["value"] })),
                    }),
                    createTagSection({
                        id: "genre",
                        label: "Genre",
                        tags: mangaDetails["genre"].map((x) => createTag({ id: x["id"].toString(), label: x["value"] })),
                    }),
                    createTagSection({
                        id: "theme",
                        label: "Theme",
                        tags: mangaDetails["theme"].map((x) => createTag({ id: x["id"].toString(), label: x["value"] })),
                    }),
                ],
                users: mangaDetails["users"],
                views: mangaDetails["views"],
                hentai: mangaDetails["hentai"],
                relatedIds: mangaDetails["relatedIds"],
                lastUpdate: mangaDetails["lastUpdate"],
            }));
        }
        return mangas;
    }
    getChaptersRequest(mangaId) {
        let metadata = { mangaId };
        return createRequestObject({
            metadata,
            url: `${MD_MANGA_API}/${mangaId}`,
            method: "GET",
        });
    }
    getChapters(data, metadata) {
        let chapters = JSON.parse(data).chapter;
        return Object.keys(chapters).map((id) => {
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
                time: new Date(Number(chapter.timestamp) * 1000),
            });
        });
    }
    getChapterDetailsRequest(mangaId, chapId) {
        return createRequestObject({
            url: `${MD_CHAPTER_API}/${chapId}?mark_read=0`,
            method: "GET",
            incognito: false,
        });
    }
    getChapterDetails(data, metadata) {
        let chapterDetails = JSON.parse(data);
        return createChapterDetails({
            id: chapterDetails["id"].toString(),
            longStrip: parseInt(chapterDetails["long_strip"]) == 1,
            mangaId: chapterDetails["manga_id"].toString(),
            pages: chapterDetails["page_array"].map((x) => `${chapterDetails["server"]}${chapterDetails["hash"]}/${x}`),
        });
    }
    constructFilterUpdatedMangaRequest(ids, time, page) {
        let metadata = { ids: ids, referenceTime: time, page: page };
        console.log(`time ${time}, idCount: ${ids.length}`);
        return createRequestObject({
            metadata: metadata,
            url: "https://mangadex.org/titles/0/" + page.toString(),
            method: "GET",
            incognito: true,
            cookies: [
                createCookie({
                    name: "mangadex_title_mode",
                    value: "2",
                    domain: MD_DOMAIN,
                }),
            ],
        });
    }
    filterUpdatedMangaRequest(ids, time) {
        return this.constructFilterUpdatedMangaRequest(ids, time, 1);
    }
    filterUpdatedManga(data, metadata) {
        var _a;
        let $ = this.cheerio.load(data);
        console.log(`REFERENCE TIME: ${metadata.referenceTime}`);
        let returnObject = {
            ids: [],
            nextPage: this.constructFilterUpdatedMangaRequest(metadata.ids, metadata.referenceTime, metadata.page + 1),
        };
        for (let elem of $(".manga-entry").toArray()) {
            let id = elem.attribs["data-id"];
            let mangaDate = new Date(((_a = $(elem).find("time").attr("datetime")) !== null && _a !== void 0 ? _a : "").replace(/-/g, "/"));
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
    getHomePageSectionRequest() {
        console.log(JSON.stringify(this));
        let request1 = createRequestObject({
            url: "https://mangadex.org",
            method: "GET",
        });
        let request2 = createRequestObject({
            url: CACHE_DOMAIN + "/updates?limit=10",
            method: "GET",
        });
        let section1 = createHomeSection({
            id: "featured_titles",
            title: "FEATURED TITLES",
        });
        let section3 = createHomeSection({
            id: "recently_updated",
            title: "RECENTLY UPDATED TITLES",
            view_more: this.constructGetViewMoreRequest("recently_updated", 1),
        });
        return [
            createHomeSectionRequest({
                request: request1,
                sections: [section1],
            }),
            createHomeSectionRequest({
                request: request2,
                sections: [section3],
            }),
        ];
    }
    getHomePageSections(data, sections) {
        return sections.map((section) => {
            switch (section.id) {
                case "featured_titles":
                    let $ = this.cheerio.load(data);
                    section.items = this.parseFeaturedMangaTiles($);
                    break;
                case "recently_updated":
                    section.items = this.parseRecentlyUpdatedMangaSectionTiles(data);
                    break;
            }
            return section;
        });
    }
    constructGetViewMoreRequest(key, page) {
        return createRequestObject({
            url: CACHE_DOMAIN + "/updates?page=" + page.toString(),
            method: "GET",
            metadata: {
                key,
                page,
            },
        });
    }
    getViewMoreItems(data, key, metadata) {
        let $ = this.cheerio.load(data);
        let updates = this.parseRecentlyUpdatedMangaSectionTiles($);
        return createPagedResults({
            results: updates,
            nextPage: updates.length > 0
                ? this.constructGetViewMoreRequest(key, metadata.page + 1)
                : undefined,
        });
    }
    parseFeaturedMangaTiles($) {
        let featuredManga = [];
        $("#hled_titles_owl_carousel .large_logo").each(function (i, elem) {
            var _a, _b, _c;
            let title = $(elem);
            let img = title.find("img").first();
            let links = title.find("a");
            let idStr = links.first().attr("href");
            let id = (_a = idStr.match(/(\d+)(?=\/)/)) !== null && _a !== void 0 ? _a : "-1";
            let caption = title.find(".car-caption p:nth-child(2)");
            let bookmarks = caption.find("span[title=Follows]").text();
            let rating = caption.find("span[title=Rating]").text();
            featuredManga.push(createMangaTile({
                id: id[0],
                image: (_b = img.attr("data-src")) !== null && _b !== void 0 ? _b : "",
                title: createIconText({ text: (_c = img.attr("title")) !== null && _c !== void 0 ? _c : "" }),
                primaryText: createIconText({
                    text: bookmarks,
                    icon: "bookmark.fill",
                }),
                secondaryText: createIconText({ text: rating, icon: "star.fill" }),
            }));
        });
        return featuredManga;
    }
    parseNewMangaSectionTiles($) {
        let newManga = [];
        $("#new_titles_owl_carousel .large_logo").each(function (i, elem) {
            var _a, _b, _c;
            let title = $(elem);
            let img = title.find("img").first();
            let links = title.find("a");
            let idStr = links.first().attr("href");
            let id = idStr.match(/(\d+)(?=\/)/);
            let caption = title.find(".car-caption p:nth-child(2)");
            let obj = {
                name: caption.find("a").text(),
                group: "",
                time: Date.parse((_a = caption.find("span").attr("title")) !== null && _a !== void 0 ? _a : " "),
                langCode: "",
            };
            let updateTime = caption.find("span").text();
            newManga.push(createMangaTile({
                id: id[0],
                image: (_b = img.attr("data-src")) !== null && _b !== void 0 ? _b : " ",
                title: createIconText({ text: (_c = img.attr("title")) !== null && _c !== void 0 ? _c : " " }),
                subtitleText: createIconText({ text: caption.find("a").text() }),
                secondaryText: createIconText({
                    text: updateTime,
                    icon: "clock.fill",
                }),
            }));
        });
        return newManga;
    }
    parseRecentlyUpdatedMangaSectionTiles(data) {
        var _a;
        let updates = [];
        let result = JSON.parse(data).result;
        for (let manga of result) {
            updates.push(createMangaTile({
                id: manga.id.toString(),
                image: manga.image,
                title: createIconText({
                    text: (_a = manga.titles[0]) !== null && _a !== void 0 ? _a : "UNKNOWN",
                }),
                subtitleText: createIconText({
                    icon: "clock.fill",
                    text: this.timeDifference(new Date().getTime(), manga.lastUpdate.getTime()),
                }),
            }));
        }
        return updates;
    }
    constructSearchRequest(query, page) {
        return createRequestObject({
            url: CACHE_SEARCH + `?page=${page}&items=100`,
            method: "POST",
            data: JSON.stringify({
                title: query.title,
            }),
            headers: {
                "content-type": "application/json",
            },
            metadata: {
                page: page,
                query: query,
            },
        });
    }
    searchRequest(query) {
        return this.constructSearchRequest(query, 1);
    }
    search(data, metadata) {
        var _a;
        let result = JSON.parse(data);
        let mangas = [];
        for (let mangaDetails of result["result"]) {
            mangas.push(createMangaTile({
                id: mangaDetails["id"].toString(),
                image: mangaDetails["image"],
                title: createIconText({
                    text: (_a = mangaDetails["titles"][0]) !== null && _a !== void 0 ? _a : "UNKNOWN",
                }),
            }));
        }
        return createPagedResults({
            results: mangas,
            nextPage: mangas.length > 0
                ? this.constructSearchRequest(metadata.query, metadata.page + 1)
                : undefined,
        });
    }
    getMangaShareUrl(mangaId) {
        return `${MD_DOMAIN}/manga/${mangaId}`;
    }
    timeDifference(current, previous) {
        var msPerMinute = 60 * 1000;
        var msPerHour = msPerMinute * 60;
        var msPerDay = msPerHour * 24;
        var msPerMonth = msPerDay * 30;
        var msPerYear = msPerDay * 365;
        var elapsed = current - previous;
        if (elapsed < msPerMinute) {
            return Math.round(elapsed / 1000) + " sec ago";
        }
        else if (elapsed < msPerHour) {
            return Math.round(elapsed / msPerMinute) + " min ago";
        }
        else if (elapsed < msPerDay) {
            return Math.round(elapsed / msPerHour) + " hrs ago";
        }
        else if (elapsed < msPerMonth) {
            return Math.round(elapsed / msPerDay) + " days ago";
        }
        else if (elapsed < msPerYear) {
            return Math.round(elapsed / msPerMonth) + " months ago";
        }
        else {
            return Math.round(elapsed / msPerYear) + " years ago";
        }
    }
}
exports.MangaDex = MangaDex;

},{"paperback-extensions-common":5}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Madara = void 0;
const Source_1 = require("./Source");
const Manga_1 = require("../models/Manga");
class Madara extends Source_1.Source {
    constructor(cheerio) {
        super(cheerio);
    }
    //This is to let Madara sources override selectors without needing to override whole methods
    get titleSelector() { return 'div.post-title h1'; }
    get authorSelector() { return 'div.author-content'; }
    get genresSelector() { return 'div.genres-content a'; }
    get artistSelector() { return 'div.artist-content'; }
    get ratingSelector() { return 'span#averagerate'; }
    get thumbnailSelector() { return 'div.summary_image img'; }
    get thumbnailAttr() { return 'src'; }
    get chapterListSelector() { return 'li.wp-manga-chapter'; }
    get pageListSelector() { return 'div.page-break'; }
    get pageImageAttr() { return 'src'; }
    get searchMangaSelector() { return 'div.c-tabs-item__content'; }
    get searchCoverAttr() { return 'src'; }
    getMangaDetailsRequest(ids) {
        let requests = [];
        for (let id of ids) {
            let metadata = { 'id': id };
            requests.push(createRequestObject({
                url: this.MadaraDomain + "/manga/" + id,
                metadata: metadata,
                method: 'GET'
            }));
        }
        return requests;
    }
    getMangaDetails(data, metadata) {
        var _a, _b;
        let manga = [];
        let $ = this.cheerio.load(data);
        let title = $(this.titleSelector).first().children().remove().end().text().trim();
        let titles = [title];
        titles.push.apply(titles, $('div.summary-content').eq(2).text().trim().split(", "));
        let author = $(this.authorSelector).text().trim();
        let tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] })];
        for (let genre of $(this.genresSelector).toArray()) {
            let id = (_b = (_a = $(genre).attr("href")) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : '';
            let tag = $(genre).text();
            tagSections[0].tags.push(createTag({ id: id, label: tag }));
        }
        let status = ($("div.summary-content").last().text() == "Completed") ? Manga_1.MangaStatus.COMPLETED : Manga_1.MangaStatus.ONGOING;
        let averageRating = $(this.ratingSelector).text().trim();
        let src = $(this.thumbnailSelector).attr(this.thumbnailAttr);
        //Not sure if that double slash happens with any Madara source, but added just in case
        src = (src === null || src === void 0 ? void 0 : src.startsWith("http")) ? src : this.MadaraDomain + (src === null || src === void 0 ? void 0 : src.replace("//", ""));
        let artist = $(this.artistSelector).text().trim();
        let description = ($("div.description-summary  div.summary__content").find("p").text() != "") ? $("div.description-summary  div.summary__content").find("p").text().replace(/<br>/g, '\n') : $("div.description-summary  div.summary__content").text();
        return [createManga({
                id: metadata.id,
                titles: titles,
                image: src,
                avgRating: Number(averageRating),
                rating: Number(averageRating),
                author: author,
                artist: artist,
                desc: description,
                status: status,
                tags: tagSections,
                langName: this.language,
                langFlag: this.langFlag
            })];
    }
    getChaptersRequest(mangaId) {
        let metadata = { 'id': mangaId };
        return createRequestObject({
            url: `${this.MadaraDomain}/manga/${mangaId}`,
            method: "GET",
            metadata: metadata
        });
    }
    getChapters(data, metadata) {
        let $ = this.cheerio.load(data);
        let chapters = [];
        for (let elem of $(this.chapterListSelector).toArray()) {
            let name = $(elem).find("a").first().text().trim();
            let id = /[0-9.]+/.exec(name)[0];
            let imgDate = $(elem).find("img").attr("alt");
            let time = (imgDate != undefined) ? this.convertTime(imgDate) : this.parseChapterDate($(elem).find("span.chapter-release-date i").first().text());
            chapters.push(createChapter({
                id: id !== null && id !== void 0 ? id : '',
                chapNum: Number(id),
                mangaId: metadata.id,
                name: name,
                time: time,
                langCode: this.langCode,
            }));
        }
        return chapters;
    }
    parseChapterDate(date) {
        if (date.toLowerCase().includes("ago")) {
            return this.convertTime(date);
        }
        if (date.toLowerCase().startsWith("yesterday")) {
            //To start it at the beginning of yesterday, instead of exactly 24 hrs prior to now
            return new Date((Math.floor(Date.now() / 86400000) * 86400000) - 86400000);
        }
        if (date.toLowerCase().startsWith("today")) {
            return new Date(Math.floor(Date.now() / 86400000) * 8640000);
        }
        if (/\d+(st|nd|rd|th)/.test(date)) {
            let match = /\d+(st|nd|rd|th)/.exec(date)[0];
            let day = match.replace(/\D/g, "");
            return new Date(date.replace(match, day));
        }
        return new Date(date);
    }
    getChapterDetailsRequest(mangaId, chId) {
        let metadata = { 'mangaId': mangaId, 'chapterId': chId, 'nextPage': false, 'page': 1 };
        return createRequestObject({
            url: `${this.MadaraDomain}/manga/${mangaId}/chapter-${chId.replace('.', '-')}`,
            method: "GET",
            metadata: metadata
        });
    }
    getChapterDetails(data, metadata) {
        var _a;
        let pages = [];
        let $ = this.cheerio.load(data);
        let pageElements = $(this.pageListSelector);
        for (let page of pageElements.toArray()) {
            pages.push((_a = $(page)) === null || _a === void 0 ? void 0 : _a.find("img").first().attr(this.pageImageAttr).trim());
        }
        let chapterDetails = createChapterDetails({
            id: metadata.chapterId,
            mangaId: metadata.mangaId,
            pages: pages,
            longStrip: false
        });
        return chapterDetails;
    }
    constructSearchRequest(query, page) {
        var _a;
        let url = `${this.MadaraDomain}/page/${page}/?`;
        let author = query.author || '';
        let artist = query.artist || '';
        let genres = ((_a = query.includeGenre) !== null && _a !== void 0 ? _a : []).join(",");
        let paramaters = { "s": query.title, "post_type": "wp-manga", "author": author, "artist": artist, "genres": genres };
        return createRequestObject({
            url: url + new URLSearchParams(paramaters).toString(),
            method: 'GET',
            metadata: {
                request: query,
                page: page
            }
        });
    }
    searchRequest(query) {
        var _a;
        return (_a = this.constructSearchRequest(query, 1)) !== null && _a !== void 0 ? _a : null;
    }
    search(data, metadata) {
        var _a, _b, _c;
        let $ = this.cheerio.load(data);
        let mangas = [];
        for (let manga of $(this.searchMangaSelector).toArray()) {
            let id = (_b = (_a = $("div.post-title a", manga).attr("href")) === null || _a === void 0 ? void 0 : _a.split("/")[4]) !== null && _b !== void 0 ? _b : '';
            if (!id.endsWith("novel")) {
                let cover = $("img", manga).first().attr(this.searchCoverAttr);
                cover = (cover === null || cover === void 0 ? void 0 : cover.startsWith("http")) ? cover : this.MadaraDomain + (cover === null || cover === void 0 ? void 0 : cover.replace("//", "/"));
                let title = $("div.post-title a", manga).text();
                let author = $("div.summary-content > a[href*=manga-author]", manga).text().trim();
                let alternatives = $("div.summary-content", manga).first().text().trim();
                mangas.push(createMangaTile({
                    id: id,
                    image: cover,
                    title: createIconText({ text: title !== null && title !== void 0 ? title : '' }),
                    subtitleText: createIconText({ text: author !== null && author !== void 0 ? author : '' })
                }));
            }
        }
        return createPagedResults({
            results: mangas,
            nextPage: (_c = this.constructSearchRequest(metadata.query, metadata.page + 1)) !== null && _c !== void 0 ? _c : undefined
        });
    }
}
exports.Madara = Madara;

},{"../models/Manga":11,"./Source":3}],3:[function(require,module,exports){
"use strict";
/**
 * Request objects hold information for a particular source (see sources for example)
 * This allows us to to use a generic api to make the calls against any source
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Source = void 0;
class Source {
    constructor(cheerio) {
        this.cheerio = cheerio;
    }
    /**
     * An optional field where the author may put a link to their website
     */
    get authorWebsite() { return null; }
    /**
     * An optional field that defines the language of the extension's source
     */
    get language() { return 'all'; }
    /**
     * An optional field of source tags: Little bits of metadata which is rendered on the website
     * under your repositories section
     */
    get sourceTags() { return []; }
    // <-----------        OPTIONAL METHODS        -----------> //
    requestModifier(request) { return request; }
    getMangaShareUrl(mangaId) { return null; }
    getCloudflareBypassRequest() { return null; }
    /**
     * Returns the number of calls that can be done per second from the application
     * This is to avoid IP bans from many of the sources
     * Can be adjusted per source since different sites have different limits
     */
    get rateLimit() { return 2; }
    /**
     * (OPTIONAL METHOD) Different sources have different tags available for searching. This method
     * should target a URL which allows you to parse apart all of the available tags which a website has.
     * This will populate tags in the iOS application where the user can use
     * @returns A request object which can provide HTML for determining tags that a source uses
     */
    getTagsRequest() { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle parsing apart HTML returned from {@link Source.getTags}
     * and generate a list of {@link TagSection} objects, determining what sections of tags an app has, as well as
     * what tags are associated with each section
     * @param data HTML which can be parsed to get tag information
     */
    getTags(data) { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle generating a request for determining whether or
     * not a manga has been updated since a specific reference time.
     * This method is different depending on the source. A current implementation for a source, as example,
     * is going through multiple pages of the 'latest' section, and determining whether or not there
     * are entries available before your supplied date.
     * @param ids The manga IDs which you are searching for updates on
     * @param time A {@link Date} marking the point in time you'd like to search up from.
     * Eg, A date of November 2020, when it is currently December 2020, should return all instances
     * of the image you are searching for, which has been updated in the last month
     * @param page A page number parameter may be used if your update scanning requires you to
     * traverse multiple pages.
     */
    filterUpdatedMangaRequest(ids, time) { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle parsing apart HTML returned from {@link Source.filterUpdatedMangaRequest}
     * and generate a list manga which has been updated within the timeframe specified in the request.
     * @param data HTML which can be parsed to determine whether or not a Manga has been updated or not
     * @param metadata Anything passed to the {@link Request} object in {@link Source.filterUpdatedMangaRequest}
     * with the key of metadata will be available to this method here in this parameter
     * @returns A list of mangaID which has been updated. Also, a nextPage parameter is required. This is a flag
     * which should be set to true, if you need to traverse to the next page of your search, in order to fully
     * determine whether or not you've gotten all of the updated manga or not. This will increment
     * the page number in the {@link Source.filterUpdatedMangaRequest} method and run it again with the new
     * parameter
     */
    filterUpdatedManga(data, metadata) { return null; }
    /**
     * (OPTIONAL METHOD) A function which should generate a {@link HomeSectionRequest} with the intention
     * of parsing apart a home page of a source, and grouping content into multiple categories.
     * This does not exist for all sources, but sections you would commonly see would be
     * 'Latest Manga', 'Hot Manga', 'Recommended Manga', etc.
     * @returns A list of {@link HomeSectionRequest} objects. A request for search section on the home page.
     * It is likely that your request object will be the same in all of them.
     */
    getHomePageSectionRequest() { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle parsing apart HTML returned from {@link Source.getHomePageSectionRequest}
     * and finish filling out the {@link HomeSection} objects.
     * Generally this simply should update the parameter objects with all of the correct contents, and
     * return the completed array
     * @param data The HTML which should be parsed into the {@link HomeSection} objects. There may only be one element in the array, that is okay
     * if only one section exists
     * @param section The list of HomeSection objects which are unfinished, and need filled out
     */
    getHomePageSections(data, section) { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle parsing apart a page
     * and generate different {@link MangaTile} objects which can be found on it
     * @param data HTML which should be parsed into a {@link MangaTile} object
     * @param key
     */
    getViewMoreItems(data, key, metadata) { return null; }
    // <-----------        PROTECTED METHODS        -----------> //
    // Many sites use '[x] time ago' - Figured it would be good to handle these cases in general
    convertTime(timeAgo) {
        var _a;
        let time;
        let trimmed = Number(((_a = /\d*/.exec(timeAgo)) !== null && _a !== void 0 ? _a : [])[0]);
        trimmed = (trimmed == 0 && timeAgo.includes('a')) ? 1 : trimmed;
        if (timeAgo.includes('minutes')) {
            time = new Date(Date.now() - trimmed * 60000);
        }
        else if (timeAgo.includes('hours')) {
            time = new Date(Date.now() - trimmed * 3600000);
        }
        else if (timeAgo.includes('days')) {
            time = new Date(Date.now() - trimmed * 86400000);
        }
        else if (timeAgo.includes('year') || timeAgo.includes('years')) {
            time = new Date(Date.now() - trimmed * 31556952000);
        }
        else {
            time = new Date(Date.now());
        }
        return time;
    }
}
exports.Source = Source;

},{}],4:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./Madara"), exports);
__exportStar(require("./Source"), exports);

},{"./Madara":2,"./Source":3}],5:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./base"), exports);
__exportStar(require("./models"), exports);
__exportStar(require("./APIWrapper"), exports);

},{"./APIWrapper":20,"./base":4,"./models":19}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],7:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],8:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],9:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageCode = void 0;
var LanguageCode;
(function (LanguageCode) {
    LanguageCode["UNKNOWN"] = "_unknown";
    LanguageCode["BENGALI"] = "bd";
    LanguageCode["BULGARIAN"] = "bg";
    LanguageCode["BRAZILIAN"] = "br";
    LanguageCode["CHINEESE"] = "cn";
    LanguageCode["CZECH"] = "cz";
    LanguageCode["GERMAN"] = "de";
    LanguageCode["DANISH"] = "dk";
    LanguageCode["ENGLISH"] = "gb";
    LanguageCode["SPANISH"] = "es";
    LanguageCode["FINNISH"] = "fi";
    LanguageCode["FRENCH"] = "fr";
    LanguageCode["WELSH"] = "gb";
    LanguageCode["GREEK"] = "gr";
    LanguageCode["CHINEESE_HONGKONG"] = "hk";
    LanguageCode["HUNGARIAN"] = "hu";
    LanguageCode["INDONESIAN"] = "id";
    LanguageCode["ISRELI"] = "il";
    LanguageCode["INDIAN"] = "in";
    LanguageCode["IRAN"] = "ir";
    LanguageCode["ITALIAN"] = "it";
    LanguageCode["JAPANESE"] = "jp";
    LanguageCode["KOREAN"] = "kr";
    LanguageCode["LITHUANIAN"] = "lt";
    LanguageCode["MONGOLIAN"] = "mn";
    LanguageCode["MEXIAN"] = "mx";
    LanguageCode["MALAY"] = "my";
    LanguageCode["DUTCH"] = "nl";
    LanguageCode["NORWEGIAN"] = "no";
    LanguageCode["PHILIPPINE"] = "ph";
    LanguageCode["POLISH"] = "pl";
    LanguageCode["PORTUGUESE"] = "pt";
    LanguageCode["ROMANIAN"] = "ro";
    LanguageCode["RUSSIAN"] = "ru";
    LanguageCode["SANSKRIT"] = "sa";
    LanguageCode["SAMI"] = "si";
    LanguageCode["THAI"] = "th";
    LanguageCode["TURKISH"] = "tr";
    LanguageCode["UKRAINIAN"] = "ua";
    LanguageCode["VIETNAMESE"] = "vn";
})(LanguageCode = exports.LanguageCode || (exports.LanguageCode = {}));

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MangaStatus = void 0;
var MangaStatus;
(function (MangaStatus) {
    MangaStatus[MangaStatus["ONGOING"] = 1] = "ONGOING";
    MangaStatus[MangaStatus["COMPLETED"] = 0] = "COMPLETED";
})(MangaStatus = exports.MangaStatus || (exports.MangaStatus = {}));

},{}],12:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],13:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],14:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],15:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],16:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagType = void 0;
/**
 * An enumerator which {@link SourceTags} uses to define the color of the tag rendered on the website.
 * Five types are available: blue, green, grey, yellow and red, the default one is blue.
 * Common colors are red for (Broken), yellow for (+18), grey for (Country-Proof)
 */
var TagType;
(function (TagType) {
    TagType["BLUE"] = "default";
    TagType["GREEN"] = "success";
    TagType["GREY"] = "info";
    TagType["YELLOW"] = "warning";
    TagType["RED"] = "danger";
})(TagType = exports.TagType || (exports.TagType = {}));

},{}],18:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],19:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./Chapter"), exports);
__exportStar(require("./ChapterDetails"), exports);
__exportStar(require("./HomeSection"), exports);
__exportStar(require("./Manga"), exports);
__exportStar(require("./MangaTile"), exports);
__exportStar(require("./RequestObject"), exports);
__exportStar(require("./SearchRequest"), exports);
__exportStar(require("./TagSection"), exports);
__exportStar(require("./SourceTag"), exports);
__exportStar(require("./Languages"), exports);
__exportStar(require("./Constants"), exports);
__exportStar(require("./MangaUpdate"), exports);
__exportStar(require("./PagedResults"), exports);

},{"./Chapter":6,"./ChapterDetails":7,"./Constants":8,"./HomeSection":9,"./Languages":10,"./Manga":11,"./MangaTile":12,"./MangaUpdate":13,"./PagedResults":14,"./RequestObject":15,"./SearchRequest":16,"./SourceTag":17,"./TagSection":18}],20:[function(require,module,exports){

},{}]},{},[1]);
