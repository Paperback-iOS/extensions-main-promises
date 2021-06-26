(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Sources = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
"use strict";
/**
 * Request objects hold information for a particular source (see sources for example)
 * This allows us to to use a generic api to make the calls against any source
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Source = void 0;
class Source {
    constructor(cheerio) {
        // <-----------        OPTIONAL METHODS        -----------> //
        /**
         * Manages the ratelimits and the number of requests that can be done per second
         * This is also used to fetch pages when a chapter is downloading
         */
        this.requestManager = createRequestManager({
            requestsPerSecond: 2.5,
            requestTimeout: 5000
        });
        this.cheerio = cheerio;
    }
    /**
     * (OPTIONAL METHOD) This function is called when ANY request is made by the Paperback Application out to the internet.
     * By modifying the parameter and returning it, the user can inject any additional headers, cookies, or anything else
     * a source may need to load correctly.
     * The most common use of this function is to add headers to image requests, since you cannot directly access these requests through
     * the source implementation itself.
     *
     * NOTE: This does **NOT** influence any requests defined in the source implementation. This function will only influence requests
     * which happen behind the scenes and are not defined in your source.
     */
    globalRequestHeaders() { return {}; }
    globalRequestCookies() { return []; }
    /**
     * (OPTIONAL METHOD) Given a manga ID, return a URL which Safari can open in a browser to display.
     * @param mangaId
     */
    getMangaShareUrl(mangaId) { return null; }
    /**
     * If a source is secured by Cloudflare, this method should be filled out.
     * By returning a request to the website, this source will attempt to create a session
     * so that the source can load correctly.
     * Usually the {@link Request} url can simply be the base URL to the source.
     */
    getCloudflareBypassRequest() { return null; }
    /**
     * (OPTIONAL METHOD) A function which communicates with a given source, and returns a list of all possible tags which the source supports.
     * These tags are generic and depend on the source. They could be genres such as 'Isekai, Action, Drama', or they can be
     * listings such as 'Completed, Ongoing'
     * These tags must be tags which can be used in the {@link searchRequest} function to augment the searching capability of the application
     */
    getTags() { return Promise.resolve(null); }
    /**
     * (OPTIONAL METHOD) A function which should scan through the latest updates section of a website, and report back with a list of IDs which have been
     * updated BEFORE the supplied timeframe.
     * This function may have to scan through multiple pages in order to discover the full list of updated manga.
     * Because of this, each batch of IDs should be returned with the mangaUpdatesFoundCallback. The IDs which have been reported for
     * one page, should not be reported again on another page, unless the relevent ID has been detected again. You do not want to persist
     * this internal list between {@link Request} calls
     * @param mangaUpdatesFoundCallback A callback which is used to report a list of manga IDs back to the API
     * @param time This function should find all manga which has been updated between the current time, and this parameter's reported time.
     *             After this time has been passed, the system should stop parsing and return
     */
    filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) { return Promise.resolve(); }
    /**
     * (OPTIONAL METHOD) A function which should readonly allf the available homepage sections for a given source, and return a {@link HomeSection} object.
     * The sectionCallback is to be used for each given section on the website. This may include a 'Latest Updates' section, or a 'Hot Manga' section.
     * It is recommended that before anything else in your source, you first use this sectionCallback and send it {@link HomeSection} objects
     * which are blank, and have not had any requests done on them just yet. This way, you provide the App with the sections to render on screen,
     * which then will be populated with each additional sectionCallback method called. This is optional, but recommended.
     * @param sectionCallback A callback which is run for each independant HomeSection.
     */
    getHomePageSections(sectionCallback) { return Promise.resolve(); }
    /**
     * (OPTIONAL METHOD) This function will take a given homepageSectionId and metadata value, and with this information, should return
     * all of the manga tiles supplied for the given state of parameters. Most commonly, the metadata value will contain some sort of page information,
     * and this request will target the given page. (Incrementing the page in the response so that the next call will return relevent data)
     * @param homepageSectionId The given ID to the homepage defined in {@link getHomePageSections} which this method is to readonly moreata about
     * @param metadata This is a metadata parameter which is filled our in the {@link getHomePageSections}'s return
     * function. Afterwards, if the metadata value returned in the {@link PagedResults} has been modified, the modified version
     * will be supplied to this function instead of the origional {@link getHomePageSections}'s version.
     * This is useful for keeping track of which page a user is on, pagnating to other pages as ViewMore is called multiple times.
     */
    getViewMoreItems(homepageSectionId, metadata) { return Promise.resolve(null); }
    /**
     * (OPTIONAL METHOD) This function is to return the entire library of a manga website, page by page.
     * If there is an additional page which needs to be called, the {@link PagedResults} value should have it's metadata filled out
     * with information needed to continue pulling information from this website.
     * Note that if the metadata value of {@link PagedResults} is undefined, this method will not continue to run when the user
     * attempts to readonly morenformation
     * @param metadata Identifying information as to what the source needs to call in order to readonly theext batch of data
     * of the directory. Usually this is a page counter.
     */
    getWebsiteMangaDirectory(metadata) { return Promise.resolve(null); }
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

},{}],3:[function(require,module,exports){
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
__exportStar(require("./Source"), exports);

},{"./Source":2}],4:[function(require,module,exports){
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

},{"./APIWrapper":1,"./base":3,"./models":22}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],6:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],7:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],8:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MangaStatus = void 0;
var MangaStatus;
(function (MangaStatus) {
    MangaStatus[MangaStatus["ONGOING"] = 1] = "ONGOING";
    MangaStatus[MangaStatus["COMPLETED"] = 0] = "COMPLETED";
})(MangaStatus = exports.MangaStatus || (exports.MangaStatus = {}));

},{}],11:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],12:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],13:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],14:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],15:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],16:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],17:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],18:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],19:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],22:[function(require,module,exports){
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
__exportStar(require("./ResponseObject"), exports);
__exportStar(require("./RequestManager"), exports);
__exportStar(require("./RequestHeaders"), exports);
__exportStar(require("./SourceInfo"), exports);

},{"./Chapter":5,"./ChapterDetails":6,"./Constants":7,"./HomeSection":8,"./Languages":9,"./Manga":10,"./MangaTile":11,"./MangaUpdate":12,"./PagedResults":13,"./RequestHeaders":14,"./RequestManager":15,"./RequestObject":16,"./ResponseObject":17,"./SearchRequest":18,"./SourceInfo":19,"./SourceTag":20,"./TagSection":21}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reverseLangCode = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
exports.reverseLangCode = {
    '_unknown': paperback_extensions_common_1.LanguageCode.UNKNOWN,
    'bd': paperback_extensions_common_1.LanguageCode.BENGALI,
    'bg': paperback_extensions_common_1.LanguageCode.BULGARIAN,
    'br': paperback_extensions_common_1.LanguageCode.BRAZILIAN,
    'cn': paperback_extensions_common_1.LanguageCode.CHINEESE,
    'cz': paperback_extensions_common_1.LanguageCode.CZECH,
    'de': paperback_extensions_common_1.LanguageCode.GERMAN,
    'dk': paperback_extensions_common_1.LanguageCode.DANISH,
    'gb': paperback_extensions_common_1.LanguageCode.ENGLISH,
    'en': paperback_extensions_common_1.LanguageCode.ENGLISH,
    'es': paperback_extensions_common_1.LanguageCode.SPANISH,
    'fi': paperback_extensions_common_1.LanguageCode.FINNISH,
    'fr': paperback_extensions_common_1.LanguageCode.FRENCH,
    'gr': paperback_extensions_common_1.LanguageCode.GREEK,
    'hk': paperback_extensions_common_1.LanguageCode.CHINEESE_HONGKONG,
    'hu': paperback_extensions_common_1.LanguageCode.HUNGARIAN,
    'id': paperback_extensions_common_1.LanguageCode.INDONESIAN,
    'il': paperback_extensions_common_1.LanguageCode.ISRELI,
    'in': paperback_extensions_common_1.LanguageCode.INDIAN,
    'ir': paperback_extensions_common_1.LanguageCode.IRAN,
    'it': paperback_extensions_common_1.LanguageCode.ITALIAN,
    'jp': paperback_extensions_common_1.LanguageCode.JAPANESE,
    'kr': paperback_extensions_common_1.LanguageCode.KOREAN,
    'lt': paperback_extensions_common_1.LanguageCode.LITHUANIAN,
    'mn': paperback_extensions_common_1.LanguageCode.MONGOLIAN,
    'mx': paperback_extensions_common_1.LanguageCode.MEXIAN,
    'my': paperback_extensions_common_1.LanguageCode.MALAY,
    'nl': paperback_extensions_common_1.LanguageCode.DUTCH,
    'no': paperback_extensions_common_1.LanguageCode.NORWEGIAN,
    'ph': paperback_extensions_common_1.LanguageCode.PHILIPPINE,
    'pl': paperback_extensions_common_1.LanguageCode.POLISH,
    'pt': paperback_extensions_common_1.LanguageCode.PORTUGUESE,
    'ro': paperback_extensions_common_1.LanguageCode.ROMANIAN,
    'ru': paperback_extensions_common_1.LanguageCode.RUSSIAN,
    'sa': paperback_extensions_common_1.LanguageCode.SANSKRIT,
    'si': paperback_extensions_common_1.LanguageCode.SAMI,
    'th': paperback_extensions_common_1.LanguageCode.THAI,
    'tr': paperback_extensions_common_1.LanguageCode.TURKISH,
    'ua': paperback_extensions_common_1.LanguageCode.UKRAINIAN,
    'vn': paperback_extensions_common_1.LanguageCode.VIETNAMESE
};

},{"paperback-extensions-common":4}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Paperback = exports.parseMangaStatus = exports.PaperbackInfo = void 0;
/* eslint-disable unicorn/filename-case */
const paperback_extensions_common_1 = require("paperback-extensions-common");
const Languages_1 = require("./Languages");
exports.PaperbackInfo = {
    version: '2.0.1',
    name: 'Paperback',
    icon: 'icon.png',
    author: 'Lemon & Faizan Durrani',
    authorWebsite: 'https://github.com/FramboisePi',
    description: 'Access Public Domain books from Paperback!',
    hentaiSource: false,
    websiteBaseURL: 'https://Paperback.moe',
    sourceTags: []
};
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
// Number of items requested for paged requests
const PAGE_SIZE = 40;
const komgaAPI = 'https://api.paperback.moe';
exports.parseMangaStatus = (komgaStatus) => {
    switch (komgaStatus) {
        case 'ENDED':
            return paperback_extensions_common_1.MangaStatus.COMPLETED;
        case 'ONGOING':
            return paperback_extensions_common_1.MangaStatus.ONGOING;
        case 'ABANDONED':
            return paperback_extensions_common_1.MangaStatus.ONGOING;
        case 'HIATUS':
            return paperback_extensions_common_1.MangaStatus.ONGOING;
    }
    return paperback_extensions_common_1.MangaStatus.ONGOING;
};
class Paperback extends paperback_extensions_common_1.Source {
    constructor() {
        super(...arguments);
        this.requestManager = createRequestManager({
            requestsPerSecond: 4, requestTimeout: 60000
        });
        // async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {
        //   const komgaAPI = await this.getKomgaAPI()
        //   // We make requests of PAGE_SIZE titles to `series/updated/` until we got every titles
        //   // or we got a title which `lastModified` metadata is older than `time`
        //   let page = 0
        //   const foundIds: string[] = []
        //   let loadMore = true
        //   while (loadMore) {
        //     const request = createRequestObject({
        //       url: `${komgaAPI}/series/updated/`,
        //       param: `?page=${page}&size=${PAGE_SIZE}`,
        //       method: 'GET',
        //     })
        //     const data = await this.requestManager.schedule(request, 1)
        //     const result = (typeof data.data) === 'string' ? JSON.parse(data.data) : data.data
        //     for (const serie of result.content) {
        //       const serieUpdated = new Date(serie.metadata.lastModified)
        //       if (serieUpdated >= time) {
        //         if (ids.includes(serie)) {
        //           foundIds.push(serie)
        //         }
        //       } else {
        //         loadMore = false
        //         break
        //       }
        //     }
        //     // If no series were returned we are on the last page
        //     if (result.content.length === 0) {
        //       loadMore = false
        //     }
        //     page += 1
        //     if (foundIds.length > 0) {
        //       mangaUpdatesFoundCallback(createMangaUpdates({
        //         ids: foundIds,
        //       }))
        //     }
        //   }
        // }
    }
    createKomgaAPI(serverAddress) {
        return serverAddress + (serverAddress.slice(-1) === '/' ? 'api/v1' : '/api/v1');
    }
    getKomgaAPI() {
        return Promise.resolve(this.createKomgaAPI(komgaAPI));
    }
    async getMangaDetails(mangaId) {
        /*
          In Komga a manga is represented by a `serie`
         */
        const komgaAPI = await this.getKomgaAPI();
        const request = createRequestObject({
            url: `${komgaAPI}/series/${mangaId}/`,
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        const result = (typeof response.data) === 'string' ? JSON.parse(response.data) : response.data;
        const metadata = result.metadata;
        const booksMetadata = result.booksMetadata;
        const tagSections = [
            createTagSection({ id: '0', label: 'genres', tags: metadata.genres.map((elem) => createTag({ id: elem, label: elem })) }),
            createTagSection({ id: '1', label: 'tags', tags: metadata.tags.map((elem) => createTag({ id: elem, label: elem })) })
        ];
        const authors = [];
        const artists = [];
        // Additional roles: colorist, inker, letterer, cover, editor
        for (const entry of booksMetadata.authors) {
            if (entry.role === 'writer') {
                authors.push(entry.name);
            }
            if (entry.role === 'penciller') {
                artists.push(entry.name);
            }
        }
        return createManga({
            id: mangaId,
            titles: [metadata.title],
            image: `${komgaAPI}/series/${mangaId}/thumbnail`,
            rating: 5,
            status: exports.parseMangaStatus(metadata.status),
            langFlag: metadata.language,
            // langName:,
            artist: artists.join(', '),
            author: authors.join(', '),
            desc: (metadata.summary ? metadata.summary : booksMetadata.summary),
            tags: tagSections,
            lastUpdate: metadata.lastModified,
        });
    }
    async getChapters(mangaId) {
        /*
          In Komga a chapter is a `book`
         */
        var _a, _b, _c;
        const komgaAPI = await this.getKomgaAPI();
        const request = createRequestObject({
            url: `${komgaAPI}/series/${mangaId}/books`,
            param: '?unpaged=true&media_status=READY',
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        const result = (typeof response.data) === 'string' ? JSON.parse(response.data) : response.data;
        console.log(response.data);
        const chapters = [];
        // Chapters language is only available on the serie page
        const requestSerie = createRequestObject({
            url: `${komgaAPI}/series/${mangaId}/`,
            method: 'GET',
        });
        const responseSerie = await this.requestManager.schedule(requestSerie, 1);
        const resultSerie = (typeof responseSerie.data) === 'string' ? JSON.parse(responseSerie.data) : responseSerie.data;
        const languageCode = (_c = Languages_1.reverseLangCode[(_b = (_a = resultSerie === null || resultSerie === void 0 ? void 0 : resultSerie.metadata) === null || _a === void 0 ? void 0 : _a.language) !== null && _b !== void 0 ? _b : '']) !== null && _c !== void 0 ? _c : Languages_1.reverseLangCode._unknown;
        for (const book of result.content) {
            chapters.push(createChapter({
                id: book.id,
                mangaId: mangaId,
                chapNum: book.metadata.numberSort,
                langCode: languageCode !== null && languageCode !== void 0 ? languageCode : paperback_extensions_common_1.LanguageCode.UNKNOWN,
                name: `${book.metadata.number} - ${book.metadata.title} (${book.size})`,
                time: new Date(book.fileLastModified),
            }));
        }
        return chapters;
    }
    async getChapterDetails(mangaId, chapterId) {
        const komgaAPI = await this.getKomgaAPI();
        const request = createRequestObject({
            url: `${komgaAPI}/books/${chapterId}/pages`,
            method: 'GET',
        });
        const data = await this.requestManager.schedule(request, 1);
        const result = (typeof data.data) === 'string' ? JSON.parse(data.data) : data.data;
        const pages = [];
        for (const page of result) {
            if (SUPPORTED_IMAGE_TYPES.includes(page.mediaType)) {
                pages.push(`${komgaAPI}/books/${chapterId}/pages/${page.number}`);
            }
            else {
                pages.push(`${komgaAPI}/books/${chapterId}/pages/${page.number}?convert=png`);
            }
        }
        // Determine the preferred reading direction which is only available in the serie metadata
        const serieRequest = createRequestObject({
            url: `${komgaAPI}/series/${mangaId}/`,
            method: 'GET',
        });
        const serieResponse = await this.requestManager.schedule(serieRequest, 1);
        const serieResult = (typeof serieResponse.data) === 'string' ? JSON.parse(serieResponse.data) : serieResponse.data;
        let longStrip = false;
        if (['VERTICAL', 'WEBTOON'].includes(serieResult.metadata.readingDirection)) {
            longStrip = true;
        }
        return createChapterDetails({
            id: chapterId,
            longStrip: longStrip,
            mangaId: mangaId,
            pages: pages,
        });
    }
    async searchRequest(searchQuery, metadata) {
        var _a;
        const komgaAPI = await this.getKomgaAPI();
        const page = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.page) !== null && _a !== void 0 ? _a : 0;
        const paramsList = [`page=${page}`, `size=${PAGE_SIZE}`];
        if (searchQuery.title !== undefined) {
            paramsList.push('search=' + encodeURIComponent(searchQuery.title));
        }
        /*
        if (query.status !== undefined) {
          paramsList.push("status=" + KOMGA_STATUS_LIST[query.status])
        }
        */
        let paramsString = '';
        if (paramsList.length > 0) {
            paramsString = '?' + paramsList.join('&');
        }
        const request = createRequestObject({
            url: `${komgaAPI}/series`,
            method: 'GET',
            param: paramsString,
        });
        const data = await this.requestManager.schedule(request, 1);
        const result = (typeof data.data) === 'string' ? JSON.parse(data.data) : data.data;
        const tiles = [];
        for (const serie of result.content) {
            tiles.push(createMangaTile({
                id: serie.id,
                title: createIconText({ text: serie.metadata.title }),
                image: `${komgaAPI}/series/${serie.id}/thumbnail`,
                subtitleText: createIconText({ text: 'id: ' + serie.id }),
            }));
        }
        // If no series were returned we are on the last page
        metadata = tiles.length === 0 ? undefined : { page: page + 1 };
        return createPagedResults({
            results: tiles,
            metadata,
        });
    }
    async getHomePageSections(sectionCallback) {
        const komgaAPI = await this.getKomgaAPI();
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
        ];
        const promises = [];
        for (const section of sections) {
            // Let the app load empty tagSections
            sectionCallback(section);
            const request = createRequestObject({
                url: `${komgaAPI}/series/${section.id}`,
                param: '?page=0&size=20',
                method: 'GET',
            });
            // Get the section data
            promises.push(this.requestManager.schedule(request, 1).then(data => {
                const result = (typeof data.data) === 'string' ? JSON.parse(data.data) : data.data;
                console.log(data);
                const tiles = [];
                for (const serie of result.content) {
                    tiles.push(createMangaTile({
                        id: serie.id,
                        title: createIconText({ text: serie.metadata.title }),
                        image: `${komgaAPI}/series/${serie.id}/thumbnail`,
                        subtitleText: createIconText({ text: 'id: ' + serie.id }),
                    }));
                }
                section.items = tiles;
                sectionCallback(section);
            }));
        }
        // Make sure the function completes
        await Promise.all(promises);
    }
    async getViewMoreItems(homepageSectionId, metadata) {
        var _a;
        const komgaAPI = await this.getKomgaAPI();
        const page = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.page) !== null && _a !== void 0 ? _a : 0;
        const request = createRequestObject({
            url: `${komgaAPI}/series/${homepageSectionId}`,
            param: `?page=${page}&size=${PAGE_SIZE}`,
            method: 'GET',
        });
        const data = await this.requestManager.schedule(request, 1);
        const result = (typeof data.data) === 'string' ? JSON.parse(data.data) : data.data;
        const tiles = [];
        for (const serie of result.content) {
            tiles.push(createMangaTile({
                id: serie.id,
                title: createIconText({ text: serie.metadata.title }),
                image: `${komgaAPI}/series/${serie.id}/thumbnail`,
                subtitleText: createIconText({ text: 'id: ' + serie.id }),
            }));
        }
        // If no series were returned we are on the last page
        metadata = tiles.length === 0 ? undefined : { page: page + 1 };
        return createPagedResults({
            results: tiles,
            metadata: metadata,
        });
    }
}
exports.Paperback = Paperback;

},{"./Languages":23,"paperback-extensions-common":4}]},{},[24])(24)
});
