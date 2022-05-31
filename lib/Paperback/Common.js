"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setStateData = exports.retrieveStateData = exports.getKomgaAPI = exports.getAuthorizationString = exports.searchRequest = exports.getServerUnavailableMangaTiles = void 0;
function getServerUnavailableMangaTiles() {
    // This tile is used as a placeholder when the server is unavailable
    return [
        createMangaTile({
            id: "placeholder-id",
            title: createIconText({ text: "Server" }),
            image: "",
            subtitleText: createIconText({ text: "unavailable" }),
        }),
    ];
}
exports.getServerUnavailableMangaTiles = getServerUnavailableMangaTiles;
async function searchRequest(searchQuery, metadata, requestManager, stateManager, page_size) {
    // This function is also called when the user search in an other source. It should not throw if the server is unavailable.
    // We won't use `await this.getKomgaAPI()` as we do not want to throw an error
    const komgaAPI = await stateManager.retrieve("komgaAPI");
    if (komgaAPI === null) {
        console.log("searchRequest failed because server settings are unset");
        return createPagedResults({
            results: getServerUnavailableMangaTiles(),
        });
    }
    const page = metadata?.page ?? 0;
    const paramsList = [`page=${page}`, `size=${page_size}`];
    if (searchQuery.title !== undefined && searchQuery.title !== "") {
        paramsList.push("search=" + encodeURIComponent(searchQuery.title));
    }
    if (searchQuery.includedTags !== undefined) {
        searchQuery.includedTags.forEach((tag) => {
            // There are two types of tags: `tag` and `genre`
            if (tag.id.substr(0, 4) == "tag-") {
                paramsList.push("tag=" + encodeURIComponent(tag.id.substring(4)));
            }
            if (tag.id.substr(0, 6) == "genre-") {
                paramsList.push("genre=" + encodeURIComponent(tag.id.substring(6)));
            }
        });
    }
    let paramsString = "";
    if (paramsList.length > 0) {
        paramsString = "?" + paramsList.join("&");
    }
    const request = createRequestObject({
        url: `${komgaAPI}/series`,
        method: "GET",
        param: paramsString,
    });
    // We don't want to throw if the server is unavailable
    let data;
    try {
        data = await requestManager.schedule(request, 1);
    }
    catch (error) {
        console.log(`searchRequest failed with error: ${error}`);
        return createPagedResults({
            results: getServerUnavailableMangaTiles(),
        });
    }
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
        metadata,
    });
}
exports.searchRequest = searchRequest;
// 
// KOMGA API STATE METHODS
//
const DEFAULT_KOMGA_SERVER_ADDRESS = 'https://api.paperback.moe';
const DEFAULT_KOMGA_API = DEFAULT_KOMGA_SERVER_ADDRESS + '/api/v1';
const DEFAULT_KOMGA_USERNAME = '';
const DEFAULT_KOMGA_PASSWORD = '';
async function getAuthorizationString(stateManager) {
    return await stateManager.retrieve('authorization') ?? '';
}
exports.getAuthorizationString = getAuthorizationString;
async function getKomgaAPI(stateManager) {
    const komgaAPI = await stateManager.retrieve('komgaAPI');
    return komgaAPI ?? DEFAULT_KOMGA_API;
}
exports.getKomgaAPI = getKomgaAPI;
async function retrieveStateData(stateManager) {
    // Return serverURL, serverUsername and serverPassword saved in the source.
    // Used to show already saved data in settings
    const serverURL = await stateManager.retrieve('serverAddress') ?? '';
    const serverUsername = await stateManager.retrieve('serverUsername') ?? '';
    const serverPassword = await stateManager.retrieve('serverPassword') ?? '';
    return {
        serverURL: serverURL,
        serverUsername: serverUsername,
        serverPassword: serverPassword
    };
}
exports.retrieveStateData = retrieveStateData;
async function setStateData(stateManager, data) {
    await setKomgaServerAddress(stateManager, data['serverAddress'] ?? DEFAULT_KOMGA_SERVER_ADDRESS);
    await setCredentials(stateManager, data['serverUsername'] ?? DEFAULT_KOMGA_USERNAME, data['serverPassword'] ?? DEFAULT_KOMGA_PASSWORD);
}
exports.setStateData = setStateData;
async function setKomgaServerAddress(stateManager, apiUri) {
    stateManager.store('komgaAPI', createKomgaAPI(apiUri));
}
async function setCredentials(stateManager, username, password) {
    await stateManager.keychain.store('serverUsername', username);
    await stateManager.keychain.store('serverPassword', password);
    await stateManager.keychain.store('authorization', createAuthorizationString(username, password));
}
function createAuthorizationString(username, password) {
    return 'Basic ' + Buffer.from(username + ':' + password, 'binary').toString('base64');
}
function createKomgaAPI(serverAddress) {
    return serverAddress + (serverAddress.slice(-1) === '/' ? 'api/v1' : '/api/v1');
}
//# sourceMappingURL=Common.js.map