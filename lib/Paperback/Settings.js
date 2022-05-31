"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetSettingsButton = exports.testServerSettingsMenu = exports.serverSettingsMenu = exports.testServerSettings = void 0;
const Common_1 = require("./Common");
/* Helper functions */
const testServerSettings = async (stateManager, requestManager) => {
    // Try to establish a connection with the server. Return an human readable string containing the test result
    const komgaAPI = await (0, Common_1.getKomgaAPI)(stateManager);
    const authorization = await (0, Common_1.getAuthorizationString)(stateManager);
    // We check credentials are set in server settings
    if (komgaAPI === null || authorization === null) {
        return "Impossible: Unset credentials in server settings";
    }
    // To test these information, we try to make a connection to the server
    // We could use a better endpoint to test the connection
    const request = createRequestObject({
        url: `${komgaAPI}/libraries/`,
        method: "GET",
        incognito: true,
        headers: { authorization: authorization },
    });
    let responseStatus = undefined;
    try {
        const response = await requestManager.schedule(request, 1);
        responseStatus = response.status;
    }
    catch (error) {
        // If the server is unavailable error.message will be 'AsyncOperationTimedOutError'
        return `Failed: Could not connect to server - ${error.message}`;
    }
    switch (responseStatus) {
        case 200: {
            return "Successful connection!";
        }
        case 401: {
            return "Error 401 Unauthorized: Invalid credentials";
        }
        default: {
            return `Error ${responseStatus}`;
        }
    }
};
exports.testServerSettings = testServerSettings;
/* UI definition */
// NOTE: Submitted data won't be tested
const serverSettingsMenu = (stateManager) => {
    return createNavigationButton({
        id: "server_settings",
        value: "",
        label: "Server Settings",
        form: createForm({
            onSubmit: async (values) => (0, Common_1.setStateData)(stateManager, values),
            validate: async () => true,
            sections: async () => [
                createSection({
                    id: "information",
                    header: "Komga",
                    rows: async () => [
                        createMultilineLabel({
                            label: "Enter your Komga server credentials\n\nA demonstration server is available on:\nhttps://komga.org/guides/#demo\n\nMinimal Komga version: v0.100.0",
                            value: "",
                            id: "description",
                        }),
                    ],
                }),
                createSection({
                    id: "serverSettings",
                    header: "Server Settings",
                    rows: async () => (0, Common_1.retrieveStateData)(stateManager).then((values) => [
                        createInputField({
                            id: "serverAddress",
                            label: "Server URL",
                            placeholder: "http://127.0.0.1:8080",
                            value: values.serverURL,
                            maskInput: false,
                        }),
                        createInputField({
                            id: "serverUsername",
                            label: "Username",
                            placeholder: "AnimeLover420",
                            value: values.serverUsername,
                            maskInput: false,
                        }),
                        createInputField({
                            id: "serverPassword",
                            label: "Password",
                            placeholder: "Some Super Secret Password",
                            value: values.serverPassword,
                            maskInput: true,
                        }),
                    ]),
                }),
            ],
        }),
    });
};
exports.serverSettingsMenu = serverSettingsMenu;
const testServerSettingsMenu = (stateManager, requestManager) => {
    return createNavigationButton({
        id: "test_settings",
        value: "",
        label: "Try settings",
        form: createForm({
            onSubmit: async () => { },
            validate: async () => true,
            sections: async () => [
                createSection({
                    id: "information",
                    header: "Connection to Komga server:",
                    rows: () => (0, exports.testServerSettings)(stateManager, requestManager).then(async (value) => [
                        createLabel({
                            label: value,
                            value: "",
                            id: "description",
                        }),
                    ]),
                }),
            ],
        }),
    });
};
exports.testServerSettingsMenu = testServerSettingsMenu;
const resetSettingsButton = (stateManager) => {
    return createButton({
        id: "reset",
        label: "Reset to Default",
        value: "",
        onTap: () => (0, Common_1.setStateData)(stateManager, {}),
    });
};
exports.resetSettingsButton = resetSettingsButton;
//# sourceMappingURL=Settings.js.map