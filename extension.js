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

const ExtensionUtils = imports.misc.extensionUtils;
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

const Meta = imports.gi.Meta;

const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Gettext = imports.gettext.domain('gnome-shell-websearch');
const _ = Gettext.gettext;

const PREFS_DIALOG = 'gnome-shell-extension-prefs websearch@ciancio.net'

let settings = null;
let extensionPath;

const SearchButton = new Lang.Class({
    Name: 'SearchButton',
    Extends: PanelMenu.SystemStatusButton,

    _init: function() {

        this.parent('websearch-symbolic');

        this._clipboard = St.Clipboard.get_default();
        this._fromTextBox = false;

        // Entry
        let box = new St.BoxLayout(
        {
            vertical: true,
            margin_left: "10",
            margin_right: "10",
        });
        this.menu.addActor(box);

        this._inputF = new St.Entry(
        {
            name: "searchEntry",
            hint_text: _("Write text to search for and click ..."),
            track_hover: true,
            can_focus: true,
        });
        box.add(this._inputF);
        this._inputF.clutter_text.connect('activate', Lang.bind(this, this._webSearchFromTextBox));

        // Return action on input
        this.actor.connect("button-press-event", Lang.bind(this, this._onKeyPress));

        // Update search engine label
        this._addSearchButton();

        // Separator
        let menuSepPref = new PopupMenu.PopupSeparatorMenuItem();
        this.menu.addMenuItem(menuSepPref, 1);

        // Setting Menu
        let menuPref = new PopupMenu.PopupMenuItem("WebSearch Settings");
        menuPref.connect('activate', Lang.bind(this, function() {
                Util.trySpawnCommandLine(PREFS_DIALOG);
        }));
        this.menu.addMenuItem(menuPref, 2);

        // Keybinding to open websearch menu
        global.display.add_keybinding('ws-show-textbox', settings,
                Meta.KeyBindingFlags.NONE,
                Lang.bind(this, function () {
                    this.menu.open();
                    
                    // Focus on this._inputF
                    this._inputF.grab_key_focus();
                    // Select all
                    this._inputF.clutter_text.set_cursor_visible(true);
                    this._inputF.clutter_text.set_selection(-1, 0);
                }));

        // Keybinding to change search engine
        global.display.add_keybinding('ws-shift-searchengine', settings,
                Meta.KeyBindingFlags.NONE,
                Lang.bind(this, function () {
                    let new_search_engine_index = (settings.get_int('ws-searchengine') + 1) % 
                        Convenience.getSearchEngine().length;
                    settings.set_int('ws-searchengine', new_search_engine_index);
                    
                    Main.notify("Websearch: search engine changed in \"" + 
                        Convenience.getSearchEngine()[settings.get_int('ws-searchengine')][1] + "\"");
                }));

        // Keybinding to search
        global.display.add_keybinding('ws-search', settings,
                Meta.KeyBindingFlags.NONE,
                Lang.bind(this, this._webSearch));

    },


    /*
     * Add Search Button with engine label
     */
    _addSearchButton: function() {

        // Destroy search button
        if (this._searchButton) {this._searchButton.destroy(); }
        
        let engine = Convenience.getSearchEngine()[settings.get_int('ws-searchengine')][2]
        this._searchButton =  new PopupMenu.PopupMenuItem(engine + " ...");
        
        this._searchButton.connect('activate', Lang.bind(this, this._webSearchFromTextBox));
        this.menu.addMenuItem(this._searchButton, 0);
    },


    /*
     * Action on click search icon
     */
    _onKeyPress: function(actor, event) {

        let button = event.get_button();

        // Update search engine label
        this._addSearchButton();

        let baction;
        if (settings.get_boolean('ws-switch-button')) {
            baction = !(button === 1);
        } else {
            baction = (button === 1);
        }

        if ( baction ) {                          // Search
            this._webSearch();

            return;
        } else {    // Menu open
        
            // Focus on this._inputF
            this._inputF.grab_key_focus();
            // Select all
            this._inputF.clutter_text.set_cursor_visible(true);
            this._inputF.clutter_text.set_selection(-1, 0);
        }

        return;
    },


    /*
     * Callback clipboard get_text and search
     */
    _getTextCallbackandSearch: function(clipboard, text) {
    
        this.menu.close();

        if (this._fromTextBox) {
            text = this._inputF.clutter_text.get_text();

        } else {

            // Check for primary or clipboard selection
            if (settings.get_boolean('ws-clipboard')) {
                // There is non way to capture primary selection in gnome-shell
                let command = 'python -c "from gi.repository import Gtk, Gdk; import sys; clipboard = Gtk.Clipboard.get(Gdk.SELECTION_PRIMARY); text = clipboard.wait_for_text(); sys.stdout.write(text);"';
                let [res, stdout, stderr, status] = GLib.spawn_command_line_sync(command);
                text = '' + stdout;
            }

            if (text != null)
                this._inputF.set_text(text);
        }

        if (text == '') {
            Main.notify("Nothing in clipboard");
            return;
        }

        let searchurl = Convenience.getSearchEngine()[settings.get_int('ws-searchengine')][3] + text;
        Gtk.show_uri(null, searchurl, Gdk.CURRENT_TIME);
    },


    /*
     * Websearch function
     */
    _webSearch: function() {
        this._fromTextBox = false;
        this._clipboard.get_text(Lang.bind(this, this._getTextCallbackandSearch));
        return true;
    },

    /*
     * Websearch function - priority to text box content
     */
    _webSearchFromTextBox: function() {
        this._fromTextBox = true;
        this._clipboard.get_text(Lang.bind(this, this._getTextCallbackandSearch));
        return true;
    },

});



let _indicator;

function init(extensionMeta) {
    extensionPath = extensionMeta.path;

    let theme = imports.gi.Gtk.IconTheme.get_default();
    theme.append_search_path(extensionPath + "/images/");
}


function enable() {
    settings = Convenience.getSettings();

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
    settings = null;
}

