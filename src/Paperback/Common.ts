import {
    SearchRequest,
    PagedResults,
    SourceStateManager,
    RequestManager,
    Response
} from "paperback-extensions-common";

export function getServerUnavailableMangaTiles() {
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

export async function searchRequest(
    searchQuery: SearchRequest,
    metadata: any,
    requestManager: RequestManager,
    stateManager: SourceStateManager,
    page_size: number
): Promise<PagedResults> {
    // This function is also called when the user search in an other source. It should not throw if the server is unavailable.

    // We won't use `await this.getKomgaAPI()` as we do not want to throw an error
    const komgaAPI = await getKomgaAPI(stateManager);
    const { orderResultsAlphabetically } = await getOptions(stateManager);

    if (komgaAPI === null) {
        console.log("searchRequest failed because server settings are unset");
        return createPagedResults({
            results: getServerUnavailableMangaTiles(),
        });
    }

    const page: number = metadata?.page ?? 0;

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
            if (tag.id.substr(0, 11) == "collection-") {
                paramsList.push("collection_id=" + encodeURIComponent(tag.id.substring(11)));
            }
            if (tag.id.substr(0, 8) == "library-") {
                paramsList.push("library_id=" + encodeURIComponent(tag.id.substring(8)));
            }
        });
    }

    if (orderResultsAlphabetically) {
        paramsList.push("sort=titleSort");
    } else {
        paramsList.push("sort=lastModified,desc");
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
    let data: Response;
    try {
        data = await requestManager.schedule(request, 1);
    } catch (error) {
        console.log(`searchRequest failed with error: ${error}`);
        return createPagedResults({
            results: getServerUnavailableMangaTiles(),
        });
    }

    const result =
        typeof data.data === "string" ? JSON.parse(data.data) : data.data;

    const tiles = [];
    for (const serie of result.content) {
        tiles.push(
            createMangaTile({
                id: serie.id,
                title: createIconText({ text: serie.metadata.title }),
                image: `${komgaAPI}/series/${serie.id}/thumbnail`,
            })
        );
    }

    // If no series were returned we are on the last page
    metadata = tiles.length === 0 ? undefined : { page: page + 1 };

    return createPagedResults({
        results: tiles,
        metadata,
    });
}

// 
// KOMGA API STATE METHODS
//

const DEFAULT_KOMGA_SERVER_ADDRESS = 'https://api.paperback.moe'
const DEFAULT_KOMGA_API = DEFAULT_KOMGA_SERVER_ADDRESS + '/api/v1'
const DEFAULT_KOMGA_USERNAME = ''
const DEFAULT_KOMGA_PASSWORD = ''
const DEFAULT_SHOW_ON_DECK = false
const DEFAULT_SORT_RESULTS_ALPHABETICALLY = true
const DEFAULT_SHOW_CONTINUE_READING = false

export async function getAuthorizationString(stateManager: SourceStateManager): Promise<string> {
    return (await stateManager.keychain.retrieve('authorization') as string | undefined) ?? ''
}

export async function getKomgaAPI(stateManager: SourceStateManager): Promise<string> {
    return (await stateManager.retrieve('komgaAPI') as string | undefined) ?? DEFAULT_KOMGA_API
}

export async function getOptions(stateManager: SourceStateManager): Promise<{ showOnDeck: boolean; orderResultsAlphabetically: boolean; showContinueReading: boolean; }> {
    const showOnDeck = (await stateManager.retrieve('showOnDeck') as boolean) ?? DEFAULT_SHOW_ON_DECK
    const orderResultsAlphabetically = (await stateManager.retrieve('orderResultsAlphabetically') as boolean) ?? DEFAULT_SORT_RESULTS_ALPHABETICALLY
    const showContinueReading = (await stateManager.retrieve('showContinueReading') as boolean) ?? DEFAULT_SHOW_CONTINUE_READING

    return { showOnDeck, orderResultsAlphabetically, showContinueReading }
}

export async function retrieveStateData(stateManager: SourceStateManager) {
    // Return serverURL, serverUsername and serverPassword saved in the source.
    // Used to show already saved data in settings

    const serverURL = (await stateManager.retrieve('serverAddress') as string) ?? DEFAULT_KOMGA_SERVER_ADDRESS
    const serverUsername = (await stateManager.keychain.retrieve('serverUsername') as string) ?? DEFAULT_KOMGA_USERNAME
    const serverPassword = (await stateManager.keychain.retrieve('serverPassword') as string) ?? DEFAULT_KOMGA_PASSWORD
    const showOnDeck = (await stateManager.retrieve('showOnDeck') as boolean) ?? DEFAULT_SHOW_ON_DECK
    const orderResultsAlphabetically = (await stateManager.retrieve('orderResultsAlphabetically') as boolean) ?? DEFAULT_SORT_RESULTS_ALPHABETICALLY
    const showContinueReading = (await stateManager.retrieve('showContinueReading') as boolean) ?? DEFAULT_SHOW_CONTINUE_READING

    return { serverURL, serverUsername, serverPassword, showOnDeck, orderResultsAlphabetically, showContinueReading }
}

export async function setStateData(stateManager: SourceStateManager, data: Record<string, any>) {
    await setKomgaServerAddress(
        stateManager,
        data['serverAddress'] ?? DEFAULT_KOMGA_SERVER_ADDRESS
    )
    await setCredentials(
        stateManager,
        data['serverUsername'] ?? DEFAULT_KOMGA_USERNAME,
        data['serverPassword'] ?? DEFAULT_KOMGA_PASSWORD
    )
    await setOptions(
        stateManager,
        data['showOnDeck'] ?? DEFAULT_SHOW_ON_DECK,
        data['orderResultsAlphabetically'] ?? DEFAULT_SORT_RESULTS_ALPHABETICALLY,
        data['showContinueReading'] ?? DEFAULT_SHOW_CONTINUE_READING,
    )
}

async function setKomgaServerAddress(stateManager: SourceStateManager, apiUri: string) {
    await stateManager.store('serverAddress', apiUri)
    await stateManager.store('komgaAPI', createKomgaAPI(apiUri))
}

async function setCredentials(stateManager: SourceStateManager, username: string, password: string) {
    await stateManager.keychain.store('serverUsername', username)
    await stateManager.keychain.store('serverPassword', password)
    await stateManager.keychain.store('authorization', createAuthorizationString(username, password))
}

async function setOptions(stateManager: SourceStateManager, showOnDeck: boolean, orderResultsAlphabetically: boolean, showContinueReading: boolean) {
    await stateManager.store('showOnDeck', showOnDeck)
    await stateManager.store('orderResultsAlphabetically', orderResultsAlphabetically)
    await stateManager.store('showContinueReading', showContinueReading)
}

function createAuthorizationString(username: string, password: string): string {
    return 'Basic ' + Buffer.from(username + ':' + password, 'binary').toString('base64')
}

function createKomgaAPI(serverAddress: string): string {
    return serverAddress + (serverAddress.slice(-1) === '/' ? 'api/v1' : '/api/v1')
}