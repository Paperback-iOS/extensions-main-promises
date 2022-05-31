"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Paperback = exports.KomgaRequestInterceptor = exports.capitalize = exports.parseMangaStatus = exports.PaperbackInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const Languages_1 = require("./Languages");
const Settings_1 = require("./Settings");
const Common_1 = require("./Common");
// This source use Komga REST API
// https://komga.org/guides/rest.html
// Manga are represented by `series`
// Chapters are represented by `books`
// The Basic Authentication is handled by the interceptor
// Code and method used by both the source and the tracker are defined in the duplicated `KomgaCommon.ts` file
// Due to the self hosted nature of Komga, this source requires the user to enter its server credentials in the source settings menu
// Some methods are known to throw errors without specific actions from the user. They try to prevent this behavior when server settings are not set.
// This include:
//  - homepage sections
//  - getTags() which is called on the homepage
//  - search method which is called even if the user search in an other source
exports.PaperbackInfo = {
    version: "1.2.2",
    name: "Paperback",
    icon: "icon.png",
    author: "Lemon | Faizan Durrani",
    authorWebsite: "https://github.com/FramboisePi",
    description: "Komga client extension for Paperback",
    contentRating: paperback_extensions_common_1.ContentRating.EVERYONE,
    websiteBaseURL: "https://komga.org",
    sourceTags: [
        {
            text: "Self hosted",
            type: paperback_extensions_common_1.TagType.RED,
        },
    ],
};
const SUPPORTED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
];
// Number of items requested for paged requests
const PAGE_SIZE = 40;
const parseMangaStatus = (komgaStatus) => {
    switch (komgaStatus) {
        case "ENDED":
            return paperback_extensions_common_1.MangaStatus.COMPLETED;
        case "ONGOING":
            return paperback_extensions_common_1.MangaStatus.ONGOING;
        case "ABANDONED":
            return paperback_extensions_common_1.MangaStatus.ONGOING;
        case "HIATUS":
            return paperback_extensions_common_1.MangaStatus.ONGOING;
    }
    return paperback_extensions_common_1.MangaStatus.ONGOING;
};
exports.parseMangaStatus = parseMangaStatus;
const capitalize = (tag) => {
    return tag.replace(/^\w/, (c) => c.toUpperCase());
};
exports.capitalize = capitalize;
class KomgaRequestInterceptor {
    constructor(stateManager) {
        this.stateManager = stateManager;
    }
    async interceptResponse(response) {
        return response;
    }
    async interceptRequest(request) {
        if (request.headers === undefined) {
            request.headers = {};
        }
        // We mustn't call this.getAuthorizationString() for the stateful submission request.
        // This procedure indeed catchs the request used to check user credentials
        // which can happen before an authorizationString is saved,
        // raising an error in getAuthorizationString when we check for its existence
        // Thus we only inject an authorizationString if none are defined in the request
        if (request.headers.authorization === undefined) {
            request.headers.authorization = await (0, Common_1.getAuthorizationString)(this.stateManager);
        }
        return request;
    }
}
exports.KomgaRequestInterceptor = KomgaRequestInterceptor;
class Paperback extends paperback_extensions_common_1.Source {
    constructor() {
        super(...arguments);
        this.stateManager = createSourceStateManager({});
        this.requestManager = createRequestManager({
            requestsPerSecond: 4,
            requestTimeout: 20000,
            interceptor: new KomgaRequestInterceptor(this.stateManager),
        });
    }
    async getSourceMenu() {
        return createSection({
            id: "main",
            header: "Source Settings",
            rows: async () => [
                (0, Settings_1.serverSettingsMenu)(this.stateManager),
                (0, Settings_1.testServerSettingsMenu)(this.stateManager, this.requestManager),
                (0, Settings_1.resetSettingsButton)(this.stateManager),
            ],
        });
    }
    async getTags() {
        // This function is called on the homepage and should not throw if the server is unavailable
        // We define two types of tags:
        // - `genre`
        // - `tag`
        // To be able to make the difference between theses types, we append `genre-` or `tag-` at the beginning of the tag id
        // TODO: we could add: collections
        let genresResponse;
        let tagsResponse;
        // We try to make the requests. If this fail, we return a placeholder tags list to inform the user and prevent the function from throwing an error
        try {
            const komgaAPI = await (0, Common_1.getKomgaAPI)(this.stateManager);
            const genresRequest = createRequestObject({
                url: `${komgaAPI}/genres/`,
                method: "GET",
            });
            genresResponse = await this.requestManager.schedule(genresRequest, 1);
            const tagsRequest = createRequestObject({
                url: `${komgaAPI}/tags/series/`,
                method: "GET",
            });
            tagsResponse = await this.requestManager.schedule(tagsRequest, 1);
        }
        catch (error) {
            console.log(`getTags failed with error: ${error}`);
            return [
                createTagSection({ id: "-1", label: "Server unavailable", tags: [] }),
            ];
        }
        // The following part of the function should throw if there is an error and thus is not in the try/catch block
        const genresResult = typeof genresResponse.data === "string"
            ? JSON.parse(genresResponse.data)
            : genresResponse.data;
        const tagsResult = typeof tagsResponse.data === "string"
            ? JSON.parse(tagsResponse.data)
            : tagsResponse.data;
        const tagSections = [
            createTagSection({ id: "0", label: "genres", tags: [] }),
            createTagSection({ id: "1", label: "tags", tags: [] }),
        ];
        // For each tag, we append a type identifier to its id and capitalize its label
        tagSections[0].tags = genresResult.map((elem) => createTag({ id: "genre-" + elem, label: (0, exports.capitalize)(elem) }));
        tagSections[1].tags = tagsResult.map((elem) => createTag({ id: "tag-" + elem, label: (0, exports.capitalize)(elem) }));
        return tagSections;
    }
    async getMangaDetails(mangaId) {
        /*
                In Komga a manga is represented by a `serie`
                */
        const komgaAPI = await (0, Common_1.getKomgaAPI)(this.stateManager);
        const request = createRequestObject({
            url: `${komgaAPI}/series/${mangaId}/`,
            method: "GET",
        });
        const response = await this.requestManager.schedule(request, 1);
        const result = typeof response.data === "string"
            ? JSON.parse(response.data)
            : response.data;
        const metadata = result.metadata;
        const booksMetadata = result.booksMetadata;
        const tagSections = [
            createTagSection({ id: "0", label: "genres", tags: [] }),
            createTagSection({ id: "1", label: "tags", tags: [] }),
        ];
        // For each tag, we append a type identifier to its id and capitalize its label
        tagSections[0].tags = metadata.genres.map((elem) => createTag({ id: "genre-" + elem, label: (0, exports.capitalize)(elem) }));
        tagSections[1].tags = metadata.tags.map((elem) => createTag({ id: "tag-" + elem, label: (0, exports.capitalize)(elem) }));
        const authors = [];
        const artists = [];
        // Additional roles: colorist, inker, letterer, cover, editor
        for (const entry of booksMetadata.authors) {
            if (entry.role === "writer") {
                authors.push(entry.name);
            }
            if (entry.role === "penciller") {
                artists.push(entry.name);
            }
        }
        return createManga({
            id: mangaId,
            titles: [metadata.title],
            image: `${komgaAPI}/series/${mangaId}/thumbnail`,
            status: (0, exports.parseMangaStatus)(metadata.status),
            langFlag: metadata.language,
            // Unused: langName
            artist: artists.join(", "),
            author: authors.join(", "),
            desc: metadata.summary ? metadata.summary : booksMetadata.summary,
            tags: tagSections,
            lastUpdate: metadata.lastModified,
        });
    }
    async getChapters(mangaId) {
        /*
                In Komga a chapter is a `book`
                */
        const komgaAPI = await (0, Common_1.getKomgaAPI)(this.stateManager);
        const booksRequest = createRequestObject({
            url: `${komgaAPI}/series/${mangaId}/books`,
            param: "?unpaged=true&media_status=READY&deleted=false",
            method: "GET",
        });
        const booksResponse = await this.requestManager.schedule(booksRequest, 1);
        const booksResult = typeof booksResponse.data === "string"
            ? JSON.parse(booksResponse.data)
            : booksResponse.data;
        const chapters = [];
        // Chapters language is only available on the serie page
        const serieRequest = createRequestObject({
            url: `${komgaAPI}/series/${mangaId}/`,
            method: "GET",
        });
        const serieResponse = await this.requestManager.schedule(serieRequest, 1);
        const serieResult = typeof serieResponse.data === "string"
            ? JSON.parse(serieResponse.data)
            : serieResponse.data;
        const languageCode = (0, Languages_1.parseLangCode)(serieResult.metadata.language);
        for (const book of booksResult.content) {
            chapters.push(createChapter({
                id: book.id,
                mangaId: mangaId,
                chapNum: book.metadata.numberSort,
                langCode: languageCode,
                name: `${book.metadata.number} - ${book.metadata.title} (${book.size})`,
                time: new Date(book.fileLastModified),
            }));
        }
        return chapters;
    }
    async getChapterDetails(mangaId, chapterId) {
        const komgaAPI = await (0, Common_1.getKomgaAPI)(this.stateManager);
        const request = createRequestObject({
            url: `${komgaAPI}/books/${chapterId}/pages`,
            method: "GET",
        });
        const data = await this.requestManager.schedule(request, 1);
        const result = typeof data.data === "string" ? JSON.parse(data.data) : data.data;
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
            method: "GET",
        });
        const serieResponse = await this.requestManager.schedule(serieRequest, 1);
        const serieResult = typeof serieResponse.data === "string"
            ? JSON.parse(serieResponse.data)
            : serieResponse.data;
        let longStrip = false;
        if (["VERTICAL", "WEBTOON"].includes(serieResult.metadata.readingDirection)) {
            longStrip = true;
        }
        return createChapterDetails({
            id: chapterId,
            longStrip: longStrip,
            mangaId: mangaId,
            pages: pages,
        });
    }
    async getSearchResults(searchQuery, metadata) {
        // This function is also called when the user search in an other source. It should not throw if the server is unavailable.
        return (0, Common_1.searchRequest)(searchQuery, metadata, this.requestManager, this.stateManager, PAGE_SIZE);
    }
    async getHomePageSections(sectionCallback) {
        // This function is called on the homepage and should not throw if the server is unavailable
        // We won't use `await this.getKomgaAPI()` as we do not want to throw an error on
        // the homepage when server settings are not set
        const komgaAPI = await this.stateManager.retrieve("komgaAPI");
        if (komgaAPI === null) {
            console.log("searchRequest failed because server settings are unset");
            const section = createHomeSection({
                id: "unset",
                title: "Go to source settings to set your Komga server credentials.",
                view_more: false,
                items: (0, Common_1.getServerUnavailableMangaTiles)(),
            });
            sectionCallback(section);
            return;
        }
        // The source define two homepage sections: new and latest
        const sections = [
            createHomeSection({
                id: "new",
                title: "Recently added series",
                view_more: true,
            }),
            createHomeSection({
                id: "updated",
                title: "Recently updated series",
                view_more: true,
            }),
        ];
        const promises = [];
        for (const section of sections) {
            // Let the app load empty tagSections
            sectionCallback(section);
            const request = createRequestObject({
                url: `${komgaAPI}/series/${section.id}`,
                param: "?page=0&size=20&deleted=false",
                method: "GET",
            });
            // Get the section data
            promises.push(this.requestManager.schedule(request, 1).then((data) => {
                const result = typeof data.data === "string" ? JSON.parse(data.data) : data.data;
                const tiles = [];
                for (const serie of result.content) {
                    tiles.push(createMangaTile({
                        id: serie.id,
                        title: createIconText({ text: serie.metadata.title }),
                        image: `${komgaAPI}/series/${serie.id}/thumbnail`,
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
        const komgaAPI = await (0, Common_1.getKomgaAPI)(this.stateManager);
        const page = metadata?.page ?? 0;
        const request = createRequestObject({
            url: `${komgaAPI}/series/${homepageSectionId}`,
            param: `?page=${page}&size=${PAGE_SIZE}&deleted=false`,
            method: "GET",
        });
        const data = await this.requestManager.schedule(request, 1);
        const result = typeof data.data === "string" ? JSON.parse(data.data) : data.data;
        const tiles = [];
        for (const serie of result.content) {
            tiles.push(createMangaTile({
                id: serie.id,
                title: createIconText({ text: serie.metadata.title }),
                image: `${komgaAPI}/series/${serie.id}/thumbnail`,
            }));
        }
        // If no series were returned we are on the last page
        metadata = tiles.length === 0 ? undefined : { page: page + 1 };
        return createPagedResults({
            results: tiles,
            metadata: metadata,
        });
    }
    async filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) {
        const komgaAPI = await (0, Common_1.getKomgaAPI)(this.stateManager);
        // We make requests of PAGE_SIZE titles to `series/updated/` until we got every titles
        // or we got a title which `lastModified` metadata is older than `time`
        let page = 0;
        const foundIds = [];
        let loadMore = true;
        while (loadMore) {
            const request = createRequestObject({
                url: `${komgaAPI}/series/updated/`,
                param: `?page=${page}&size=${PAGE_SIZE}&deleted=false`,
                method: "GET",
            });
            const data = await this.requestManager.schedule(request, 1);
            const result = typeof data.data === "string" ? JSON.parse(data.data) : data.data;
            for (const serie of result.content) {
                const serieUpdated = new Date(serie.metadata.lastModified);
                if (serieUpdated >= time) {
                    if (ids.includes(serie)) {
                        foundIds.push(serie);
                    }
                }
                else {
                    loadMore = false;
                    break;
                }
            }
            // If no series were returned we are on the last page
            if (result.content.length === 0) {
                loadMore = false;
            }
            page = page + 1;
            if (foundIds.length > 0) {
                mangaUpdatesFoundCallback(createMangaUpdates({
                    ids: foundIds,
                }));
            }
        }
    }
}
exports.Paperback = Paperback;
//# sourceMappingURL=Paperback.js.map