/* -*- mode: js; js-basic-offset: 4; indent-tabs-mode: nil -*- */

/* This file is copied from gnome-shell-extensions and is released under
 * GPL version 2 or later. */

const Gettext = imports.gettext;
const Gio = imports.gi.Gio;

const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;


// Search Engine definitions
let _searchEngine = [ // [<id>, <name>, <tooltip>, <searchurl> ]
    ["0", "Google", "Search with Google", "http://www.google.com/search?q="],
    ["1", "Google IT", "Search with Google IT", "http://www.google.it/search?q="],
    ["2", "Encrypted Google", "Search with encrypted Google", "https://encrypted.google.com/search?q="],
    ["3", "Google Translate", "Translate with Google", "http://translate.google.com/?q="],
    ["4", "DuckDuckGo", "Search with DuckDuckGo", "https://duckduckgo.com/?q="],
    ["5", "Wikipedia", "Search with Wikipedia", "http://en.wikipedia.org/wiki/Special:Search?search="],
    ["6", "Yandex", "Search with Yandex", "http://yandex.ru?yandsearch?text="],
];

function getSearchEngine() {
    return _searchEngine;
}


/**
 * initTranslations:
 * @domain: (optional): the gettext domain to use
 *
 * Initialize Gettext to load translations from extensionsdir/locale.
 * If @domain is not provided, it will be taken from metadata['gettext-domain']
 */
function initTranslations(domain) {
    let extension = ExtensionUtils.getCurrentExtension();

    domain = domain || extension.metadata['gettext-domain'];

    // check if this extension was built with "make zip-file", and thus
    // has the locale files in a subfolder
    // otherwise assume that extension has been installed in the
    // same prefix as gnome-shell
    let localeDir = extension.dir.get_child('locale');
    if (localeDir.query_exists(null))
        Gettext.bindtextdomain(domain, localeDir.get_path());
    else
        Gettext.bindtextdomain(domain, Config.LOCALEDIR);
}

/**
 * getSettings:
 * @schema: (optional): the GSettings schema id
 *
 * Builds and return a GSettings schema for @schema, using schema files
 * in extensionsdir/schemas. If @schema is not provided, it is taken from
 * metadata['settings-schema'].
 */
function getSettings(schema) {
    let extension = ExtensionUtils.getCurrentExtension();

    schema = schema || extension.metadata['settings-schema'];

    const GioSSS = Gio.SettingsSchemaSource;

    // check if this extension was built with "make zip-file", and thus
    // has the schema files in a subfolder
    // otherwise assume that extension has been installed in the
    // same prefix as gnome-shell (and therefore schemas are available
    // in the standard folders)
    let schemaDir = extension.dir.get_child('schemas');
    let schemaSource;
    if (schemaDir.query_exists(null))
        schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),
                                                 GioSSS.get_default(),
                                                 false);
    else
        schemaSource = GioSSS.get_default();

    let schemaObj = schemaSource.lookup(schema, true);
    if (!schemaObj)
        throw new Error('Schema ' + schema + ' could not be found for extension '
                        + extension.metadata.uuid + '. Please check your installation.');

    return new Gio.Settings({ settings_schema: schemaObj });
}

