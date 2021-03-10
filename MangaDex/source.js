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
exports.MangaDex = exports.MangaDexInfo = void 0;
/* eslint-disable camelcase, @typescript-eslint/explicit-module-boundary-types, radix, unicorn/filename-case */
const paperback_extensions_common_1 = require("paperback-extensions-common");
const Parser_1 = require("./Parser");
let IS_BETA;
try {
    // `IS_PUBLIC` is not defined at bundle time
    // this will throw an error at bundle time
    IS_BETA = IS_PUBLIC === 'false';
}
catch (_a) {
    IS_BETA = false;
}
// Paperback has a beta server that sometimes has changes specific
// to the beta/alpha version of the app
const PAPERBACK_API = `https://${IS_BETA ? 'md-cacher.herokuapp.com' : 'api.paperback.moe'}`;
const MANGADEX_DOMAIN = 'https://mangadex.org';
const MANGADEX_API_V2 = 'https://api.mangadex.org/v2';
const MANGA_ENDPOINT = PAPERBACK_API + '/manga';
const CHAPTER_LIST_ENDPOINT = MANGADEX_API_V2 + '/manga';
const CHAPTER_DETAILS_ENDPOINT = MANGADEX_API_V2 + '/chapter';
const SEARCH_ENDPOINT = PAPERBACK_API + '/search';
exports.MangaDexInfo = {
    author: 'Faizan Durrani',
    description: 'The default source for Papaerback, supports notifications',
    icon: 'icon.png',
    name: 'SafeDex',
    version: '2.0.3',
    authorWebsite: 'https://github.com/FaizanDurrani',
    websiteBaseURL: MANGADEX_DOMAIN,
    hentaiSource: false,
    language: paperback_extensions_common_1.LanguageCode.ENGLISH,
    sourceTags: [
        {
            text: 'Recommended',
            type: paperback_extensions_common_1.TagType.BLUE,
        },
    ],
};
class MangaDex extends paperback_extensions_common_1.Source {
    constructor() {
        super(...arguments);
        this.parser = new Parser_1.Parser();
        this.requestManager = createRequestManager({
            requestsPerSecond: 2,
            requestTimeout: 10000,
        });
    }
    getMangaShareUrl(mangaId) {
        return `${MANGADEX_DOMAIN}/manga/${mangaId}`;
    }
    async getMangaDetails(mangaId) {
        const request = createRequestObject({
            url: MANGA_ENDPOINT,
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            data: JSON.stringify({
                id: [parseInt(mangaId)],
            }),
        });
        const response = await this.requestManager.schedule(request, 1);
        const json = JSON.parse(response.data);
        return this.parser.parseMangaDetails(json)[0];
    }
    async getBatchMangaDetails(mangaIds) {
        let batchedIds;
        const fetchedDetails = [];
        // Get manga in 50 manga batches
        const chunk = 50;
        for (let i = 0; i < mangaIds.length; i += chunk) {
            batchedIds = mangaIds.slice(i, i + chunk);
            const request = createRequestObject({
                url: MANGA_ENDPOINT,
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                data: JSON.stringify({
                    id: batchedIds.map(x => parseInt(x)),
                }),
            });
            // eslint-disable-next-line no-await-in-loop
            const response = await this.requestManager.schedule(request, 1);
            const json = JSON.parse(response.data);
            for (const manga of this.parser.parseMangaDetails(json)) {
                fetchedDetails.push(manga);
            }
        }
        console.log(fetchedDetails);
        return fetchedDetails !== null && fetchedDetails !== void 0 ? fetchedDetails : [];
    }
    async getChapters(mangaId) {
        const request = createRequestObject({
            url: `${CHAPTER_LIST_ENDPOINT}/${mangaId}/chapters`,
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        const json = JSON.parse(response.data);
        return this.parser.parseChapterList(mangaId, json);
    }
    async getChapterDetails(_mangaId, chapterId) {
        const request = createRequestObject({
            url: `${CHAPTER_DETAILS_ENDPOINT}/${chapterId}`,
            method: 'GET'
        });
        const response = await this.requestManager.schedule(request, 1);
        const json = JSON.parse(response.data);
        return this.parser.parseChapterDetails(json.data);
    }
    async searchRequest(query, metadata) {
        var _a, _b;
        const page = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.page) !== null && _a !== void 0 ? _a : 1;
        const items = (_b = metadata === null || metadata === void 0 ? void 0 : metadata.items) !== null && _b !== void 0 ? _b : 50;
        const request = this.constructSearchRequest(query, page, items);
        const response = await this.requestManager.schedule(request, 1);
        const json = JSON.parse(response.data);
        const results = this.parser.parseSearchResults(json);
        return createPagedResults({
            results,
            metadata: {
                page: page,
                items: items,
            },
        });
    }
    async getHomePageSections(sectionCallback) {
        const sections = [
            {
                request: this.constructSearchRequest({
                    includeDemographic: ['1'],
                }, 1, 10),
                section: createHomeSection({
                    id: 'shounen',
                    title: 'UPDATED SHOUNEN TITLES',
                    view_more: true,
                }),
            },
            {
                request: this.constructSearchRequest({
                    includeGenre: ['2'],
                }, 1, 10),
                section: createHomeSection({
                    id: 'action',
                    title: 'UPDATED ACTION TITLES',
                    view_more: true,
                }),
            },
        ];
        const promises = [];
        for (const section of sections) {
            // Let the app load empty sections
            sectionCallback(section.section);
            // Get the section data
            promises.push(this.requestManager.schedule(section.request, 1).then(response => {
                const json = JSON.parse(response.data);
                const tiles = this.parser.parseMangaTiles(json);
                section.section.items = tiles;
                sectionCallback(section.section);
            }));
        }
        // Make sure the function completes
        await Promise.all(promises);
    }
    async filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) {
        const allManga = new Set(ids);
        let hasManga = true;
        let page = 1;
        while (hasManga) {
            const request = createRequestObject({
                url: 'https://mangadex.org/titles/0/' + (page++).toString(),
                method: 'GET',
                incognito: true,
                cookies: [
                    createCookie({
                        name: 'mangadex_title_mode',
                        value: '2',
                        domain: MANGADEX_DOMAIN,
                    }),
                ],
            });
            // eslint-disable-next-line no-await-in-loop
            const response = await this.requestManager.schedule(request, 1);
            const selector = this.cheerio.load(response.data);
            const updatedManga = this.parser.filterUpdatedManga(selector, time, allManga);
            hasManga = updatedManga.hasMore;
            if (updatedManga.updates.length > 0) {
                // If we found updates on this page, notify the app
                // This is needed so that the app can save the updates
                // in case the background job is killed by iOS
                mangaUpdatesFoundCallback(createMangaUpdates({ ids: updatedManga.updates }));
            }
        }
    }
    constructSearchRequest(query, page, items = 50) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        return createRequestObject({
            url: SEARCH_ENDPOINT + `?page=${page}&items=${items}`,
            method: 'POST',
            // We cant just JSON.stringify the `SearchRequest` object
            // so this is necessary
            data: JSON.stringify({
                title: query.title,
                includeDemographic: (_a = query.includeDemographic) === null || _a === void 0 ? void 0 : _a.map(x => parseInt(x)),
                includeTheme: (_b = query.includeTheme) === null || _b === void 0 ? void 0 : _b.map(x => parseInt(x)),
                includeFormat: (_c = query.includeFormat) === null || _c === void 0 ? void 0 : _c.map(x => parseInt(x)),
                includeContent: (_d = query.includeContent) === null || _d === void 0 ? void 0 : _d.map(x => parseInt(x)),
                includeGenre: (_e = query.includeGenre) === null || _e === void 0 ? void 0 : _e.map(x => parseInt(x)),
                excludeDemographic: (_f = query.excludeDemographic) === null || _f === void 0 ? void 0 : _f.map(x => parseInt(x)),
                excludeTheme: (_g = query.excludeTheme) === null || _g === void 0 ? void 0 : _g.map(x => parseInt(x)),
                excludeFormat: (_h = query.excludeFormat) === null || _h === void 0 ? void 0 : _h.map(x => parseInt(x)),
                excludeContent: (_j = query.excludeContent) === null || _j === void 0 ? void 0 : _j.map(x => parseInt(x)),
                excludeGenre: (_k = query.excludeGenre) === null || _k === void 0 ? void 0 : _k.map(x => parseInt(x)),
                includeOperator: query.includeOperator,
                excludeOperator: query.excludeOperator,
                author: query.author,
                artist: query.artist,
                status: query.status,
                hStatus: query.hStatus,
            }),
            headers: {
                'content-type': 'application/json',
            },
        });
    }
}
exports.MangaDex = MangaDex;

},{"./Parser":24,"paperback-extensions-common":4}],24:[function(require,module,exports){
"use strict";
/* eslint-disable camelcase, @typescript-eslint/explicit-module-boundary-types, radix, unicorn/filename-case */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
class Parser {
    parseMangaDetails(json) {
        var _a;
        const mangas = [];
        for (const mangaDetails of json.result) {
            mangas.push(createManga({
                id: mangaDetails.id.toString(),
                titles: mangaDetails.titles,
                image: (_a = mangaDetails.image) !== null && _a !== void 0 ? _a : 'https://mangadex.org/images/avatars/default1.jpg',
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
                        tags: mangaDetails.content.map((x) => createTag({ id: x.id.toString(), label: x.value })),
                    }),
                    createTagSection({
                        id: 'demographic',
                        label: 'Demographic',
                        tags: mangaDetails.demographic.map((x) => createTag({ id: x.id.toString(), label: x.value })),
                    }),
                    createTagSection({
                        id: 'format',
                        label: 'Format',
                        tags: mangaDetails.format.map((x) => createTag({ id: x.id.toString(), label: x.value })),
                    }),
                    createTagSection({
                        id: 'genre',
                        label: 'Genre',
                        tags: mangaDetails.genre.map((x) => createTag({ id: x.id.toString(), label: x.value })),
                    }),
                    createTagSection({
                        id: 'theme',
                        label: 'Theme',
                        tags: mangaDetails.theme.map((x) => createTag({ id: x.id.toString(), label: x.value })),
                    }),
                ],
                users: mangaDetails.users,
                views: mangaDetails.views,
                hentai: mangaDetails.hentai,
                relatedIds: mangaDetails.relatedIds,
                lastUpdate: mangaDetails.lastUpdate,
            }));
        }
        return mangas;
    }
    parseChapterList(mangaId, json) {
        let chapters = [];
        const groups = Object.assign({}, ...json.data.groups.map((x) => ({ [x.id]: x.name })));
        for (const chapter of json.data.chapters) {
            chapters.push(createChapter({
                id: chapter.id.toString(),
                mangaId: mangaId,
                chapNum: Number(chapter.chapter),
                langCode: chapter.language,
                volume: Number.isNaN(chapter.volume) ? 0 : chapter.volume,
                group: chapter.groups.map((x) => groups[x]).join(', '),
                name: chapter.title,
                time: new Date(Number(chapter.timestamp) * 1000)
            }));
        }
        return chapters;
    }
    parseChapterDetails(chapterDetails) {
        return createChapterDetails({
            id: chapterDetails.id.toString(),
            longStrip: false,
            mangaId: chapterDetails.mangaId.toString(),
            pages: chapterDetails.pages.map((x) => `${chapterDetails.server}${chapterDetails.hash}/${x}`),
        });
    }
    filterUpdatedManga($, referenceTime, allManga) {
        var _a;
        console.log(`REFERENCE TIME: ${referenceTime}`);
        const ids = [];
        for (const elem of $('.manga-entry').toArray()) {
            const id = elem.attribs['data-id'];
            const mangaDate = new Date(((_a = $(elem).find('time').attr('datetime')) !== null && _a !== void 0 ? _a : '').replace(/-/g, '/'));
            console.log(`${id} updated at ${mangaDate}}`);
            if (mangaDate >= referenceTime) {
                if (allManga.has(id)) {
                    console.log(`${id} marked as an update`);
                    ids.push(id);
                }
            }
            else {
                return { updates: ids, hasMore: false };
            }
        }
        console.log(`Found ${ids.length} updates`);
        return { updates: ids, hasMore: true };
    }
    parseMangaTiles(json) {
        var _a;
        const updates = [];
        const result = json.result;
        for (const manga of result) {
            console.log(manga.lastUpdate);
            updates.push(createMangaTile({
                id: manga.id.toString(),
                image: manga.image,
                title: createIconText({
                    text: (_a = manga.titles[0]) !== null && _a !== void 0 ? _a : 'UNKNOWN',
                }),
                subtitleText: createIconText({
                    icon: 'clock.fill',
                    text: this.timeDifference(new Date().getTime(), new Date(manga.lastUpdate).getTime()),
                }),
            }));
        }
        return updates;
    }
    parseSearchResults(json) {
        var _a;
        const mangas = [];
        for (const mangaDetails of json.result) {
            mangas.push(createMangaTile({
                id: mangaDetails.id.toString(),
                image: mangaDetails.image,
                title: createIconText({
                    text: (_a = mangaDetails.titles[0]) !== null && _a !== void 0 ? _a : 'UNKNOWN',
                }),
            }));
        }
        return mangas;
    }
    timeDifference(current, previous) {
        const msPerMinute = 60 * 1000;
        const msPerHour = msPerMinute * 60;
        const msPerDay = msPerHour * 24;
        const msPerMonth = msPerDay * 30;
        const msPerYear = msPerDay * 365;
        const elapsed = current - previous;
        if (elapsed < msPerMinute) {
            return Math.round(elapsed / 1000) + ' sec ago';
        }
        if (elapsed < msPerHour) {
            return Math.round(elapsed / msPerMinute) + ' min ago';
        }
        if (elapsed < msPerDay) {
            return Math.round(elapsed / msPerHour) + ' hrs ago';
        }
        if (elapsed < msPerMonth) {
            return Math.round(elapsed / msPerDay) + ' days ago';
        }
        if (elapsed < msPerYear) {
            return Math.round(elapsed / msPerMonth) + ' months ago';
        }
        return Math.round(elapsed / msPerYear) + ' years ago';
    }
}
exports.Parser = Parser;

},{}]},{},[23])(23)
});
