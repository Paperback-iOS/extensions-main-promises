"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLangCode = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const reverseLangCode = {
    _unknown: paperback_extensions_common_1.LanguageCode.UNKNOWN,
    bn: paperback_extensions_common_1.LanguageCode.BENGALI,
    bg: paperback_extensions_common_1.LanguageCode.BULGARIAN,
    // 'br': LanguageCode.BRAZILIAN,         // use pt: Portuguese
    zs: paperback_extensions_common_1.LanguageCode.CHINEESE,
    cs: paperback_extensions_common_1.LanguageCode.CZECH,
    de: paperback_extensions_common_1.LanguageCode.GERMAN,
    da: paperback_extensions_common_1.LanguageCode.DANISH,
    en: paperback_extensions_common_1.LanguageCode.ENGLISH,
    es: paperback_extensions_common_1.LanguageCode.SPANISH,
    fi: paperback_extensions_common_1.LanguageCode.FINNISH,
    fr: paperback_extensions_common_1.LanguageCode.FRENCH,
    el: paperback_extensions_common_1.LanguageCode.GREEK,
    // 'hk': LanguageCode.CHINEESE_HONGKONG,
    hu: paperback_extensions_common_1.LanguageCode.HUNGARIAN,
    id: paperback_extensions_common_1.LanguageCode.INDONESIAN,
    he: paperback_extensions_common_1.LanguageCode.ISRELI,
    hi: paperback_extensions_common_1.LanguageCode.INDIAN,
    fa: paperback_extensions_common_1.LanguageCode.IRAN,
    it: paperback_extensions_common_1.LanguageCode.ITALIAN,
    ja: paperback_extensions_common_1.LanguageCode.JAPANESE,
    ko: paperback_extensions_common_1.LanguageCode.KOREAN,
    lt: paperback_extensions_common_1.LanguageCode.LITHUANIAN,
    mn: paperback_extensions_common_1.LanguageCode.MONGOLIAN,
    // 'mx': LanguageCode.MEXIAN,        // use es: Spanish
    // 'my': LanguageCode.MALAY,
    nl: paperback_extensions_common_1.LanguageCode.DUTCH,
    no: paperback_extensions_common_1.LanguageCode.NORWEGIAN,
    fil: paperback_extensions_common_1.LanguageCode.PHILIPPINE,
    pl: paperback_extensions_common_1.LanguageCode.POLISH,
    pt: paperback_extensions_common_1.LanguageCode.PORTUGUESE,
    ro: paperback_extensions_common_1.LanguageCode.ROMANIAN,
    ru: paperback_extensions_common_1.LanguageCode.RUSSIAN,
    sa: paperback_extensions_common_1.LanguageCode.SANSKRIT,
    // 'si': LanguageCode.SAMI,
    th: paperback_extensions_common_1.LanguageCode.THAI,
    tr: paperback_extensions_common_1.LanguageCode.TURKISH,
    uk: paperback_extensions_common_1.LanguageCode.UKRAINIAN,
    vi: paperback_extensions_common_1.LanguageCode.VIETNAMESE,
};
const parseLangCode = (code) => {
    // The code can have the format 'en' or 'en-gb'.
    // We only use the first 2 or 3 letters.
    // There is 1 three letters code
    if (code.substr(0, 3) === "fil") {
        return paperback_extensions_common_1.LanguageCode.PHILIPPINE;
    }
    // Other are two letters codes
    return reverseLangCode[code.substr(0, 2)] ?? paperback_extensions_common_1.LanguageCode.UNKNOWN;
};
exports.parseLangCode = parseLangCode;
//# sourceMappingURL=Languages.js.map