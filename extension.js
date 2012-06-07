// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-
//
//   Web Search is a GNOME Shell extension to search by a click.
//   Copyright (C) 2011  Stefano Ciancio
//
//   This library is free software; you can redistribute it and/or
//   modify it under the terms of the GNU Library General Public
//   License as published by the Free Software Foundation; either
//   version 2 of the License, or (at your option) any later version.
//
//   This library is distributed in the hope that it will be useful,
//   but WITHOUT ANY WARRANTY; without even the implied warranty of
//   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
//   Library General Public License for more details.
//
//   You should have received a copy of the GNU Library General Public
//   License along with this library; if not, write to the Free Software
//   Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

const Lang = imports.lang;

const Gio = imports.gi.Gio;

const Gtk = imports.gi.Gtk
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const St = imports.gi.St;
const Main = imports.ui.main;
const Util = imports.misc.util;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Gettext = imports.gettext.domain('gnome-shell-web-search');
const _ = Gettext.gettext;

let _searchEngineDefault = 0;   // Index of used search engine
let _searchEngine = [ // [<name>, <tooltip>, <searchurl> ]
    ["Google", "Search with Google", "http://www.google.com/search?q="],
    ["Google IT", "Search with Google IT", "http://www.google.it/search?q="],
    ["Encrypted Google", "Search with encrypted Google", "https://encrypted.google.com/search?q="],
    ["Google Translate", "Translate with Google", "http://translate.google.it/?q="],
    ["DuckDuckGo", "Search with DuckDuckGo", "https://duckduckgo.com/?q="],
    ["Wikipedia", "Search with Wikipedia", "http://en.wikipedia.org/wiki/Special:Search?search="],
];


function SearchButton() {
    this._init.apply(this, arguments);
}

SearchButton.prototype = {

    __proto__: PanelMenu.Button.prototype,

    _init: function() {

        PanelMenu.Button.prototype._init.call(this, St.Align.START);

        // Configuration file
        this._configDir = GLib.get_user_config_dir() + "/gnome-shell-websearch";
        this._configFile = this._configDir + "/gnome_shell_websearch.json";
        // Read Config
        this._parseConfig();

        // Icon
        this.icon = new St.Icon({
            style_class: "webfind", can_focus: true, reactive: true, track_hover: true
        });
        this.actor.add_actor(this.icon);

        // Entry
        let box = new St.BoxLayout({vertical: true,
            pack_start: false,
            style_class: "menu-box"});
        this.menu.addActor(box);

        this._inputF = new St.Entry(
        {
            name: "searchEntry",
            hint_text: _("Write text to search and click ..."),
            track_hover: true,
            can_focus: true
        });
        box.add(this._inputF);
        this._inputF.clutter_text.connect('activate', Lang.bind(this, this._webSearch));

        // Search Button
        this._searchButton =  new PopupMenu.PopupMenuItem(_("Search it!"));
        this._searchButton.actor.tooltip_text = _("Click to search in the web");
        this._searchButton.connect('activate', Lang.bind(this, this._webSearch));
        this.menu.addMenuItem(this._searchButton);

        // Separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Options SubMenu
        this._searchEngineItem = [];
        this._optionsMenu = new PopupMenu.PopupSubMenuMenuItem(_("Search Options"));
        this.menu.addMenuItem(this._optionsMenu);
        this._buildOptionsMenu();

        this.actor.connect("button-press-event", Lang.bind(this, this._onKeyPress));

    },



    _buildOptionsMenu: function() {
        for(let i = 0; i < _searchEngine.length; i++) {

            // PopupMenuRadioButtonItem
            this._searchEngineItem[i] = new PopupMenu.PopupMenuItem("   "+_searchEngine[i][0]);
            this._searchEngineItem[i].connect('activate', Lang.bind(this, this._onActivate, i));

            this._searchEngineItem[i].actor.tooltip_text = _searchEngine[i][1];
            this._optionsMenu.menu.addMenuItem(this._searchEngineItem[i]);
        }
        
        this._searchEngineItem[_searchEngineDefault].setShowDot(true);
    },


    _onActivate: function(menuItem, event, index) {
        _searchEngineDefault = index;
        // Set choosen search engine
        for(let i = 0; i < _searchEngine.length; i++) {
            this._searchEngineItem[i].setShowDot(false);
        }
        menuItem.setShowDot(true);
        this._searchButton.actor.tooltip_text = _searchEngine[index][0];
        
        // Save Config
        this._saveConfig();
    },


    _onKeyPress: function(actor, event) {

        // Set clipboard text to entry
        let clipboard = St.Clipboard.get_default();
        clipboard.get_text(Lang.bind(this,
            function(clipboard, text) {
            
                if (text != null)
                    this._inputF.set_text(text);

                let button = event.get_button();
                if (button == 1) {                          // Search
                    this.menu.close();
                    this._webSearch();
                    return;
                } else {    // Menu open
                    // Focus on this._inputF
                    this._inputF.grab_key_focus();
                    // Select all
                    this._inputF.clutter_text.set_cursor_visible(true);
                    this._inputF.clutter_text.set_selection(-1, 0);
                }

        }));

        return;
    },


    _webSearch: function() {
        let input = this._inputF.clutter_text;
        let text = input.get_text();
    
        if (text == '') {
            Main.notify("Nothing in clipboard");
            return;
        }

        let searchurl = _searchEngine[_searchEngineDefault][2] + text;
        Gtk.show_uri(null, searchurl, Gdk.CURRENT_TIME);

        this.menu.close();
    },



    _parseConfig: function() {
        if (GLib.file_test(this._configFile, GLib.FileTest.EXISTS)) {
            let filedata = null;
            try {
                filedata = GLib.file_get_contents(this._configFile, null, 0);
                let jsondata = JSON.parse(filedata[1]);
                let parserVersion = null;
                if (jsondata.hasOwnProperty("searchengine"))
                    _searchEngineDefault = jsondata.searchengine;
                else
                    throw "Default search engine not defined";
            }
            catch (e) {
                global.logError("Websearch: Error reading config file " + _configFile + ", error = " + e);
            }
            finally {
                filedata = null;
            }

        }
    },


    _saveConfig: function() {
        let filedata = null;
        let jsondata = {};

        if (GLib.file_test(this._configDir, GLib.FileTest.EXISTS | GLib.FileTest.IS_DIR) == false &&
                GLib.mkdir_with_parents(this._configDir, 0755) != 0) {
                    global.logError("Websearch: Failed to create configuration directory. Path = " +
                            this._configDir + ". Configuration will not be saved.");
                }

        try {
            jsondata["searchengine"] = _searchEngineDefault;

            filedata = JSON.stringify(jsondata, null, "  ");
            GLib.file_set_contents(this._configFile, filedata, filedata.length);
        }
        catch (e) {
            global.logError("Websearch: Error writing config file = " + e);
        }
        finally {
            jsondata = null;
            filedata = null;
        }
    },

};


let _indicator;

function init() {
}

function enable() {
    if (!_indicator) {
        _indicator = new SearchButton();
        Main.panel.addToStatusArea('web-search', _indicator);
    }
}

function disable() {
    if (_indicator) {
        _indicator.destroy();
        _indicator = null;
    }
}

