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
const Shell = imports.gi.Shell;

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
const Prefs = Me.imports.prefs;

const Gettext = imports.gettext.domain('gnome-shell-websearch');
const _ = Gettext.gettext;

const PREFS_DIALOG = 'gnome-shell-extension-prefs websearch@ciancio.net'

let settings = null;

const SearchButton = new Lang.Class({
    Name: 'SearchButton',
    Extends: PanelMenu.Button,

    _init: function() {

        this.parent(0.0, "Search Button");

        this._box = new St.BoxLayout();

        this._icon = new St.Icon({ gicon: Gio.icon_new_for_string('websearch-symbolic'),
                                             icon_size: 15 });

        this._bin = new St.Bin({child: this._icon});

        this._box.add(this._bin);
        this.actor.add_actor(this._box);
        this.actor.add_style_class_name('panel-status-button');

        this._clipboard = St.Clipboard.get_default();
        this._fromTextBox = false;

        // Entry
        this.item = new PopupMenu.PopupBaseMenuItem({ activate: false });
        this._inputF = new St.Entry(
        {
            name: "searchEntry",
            hint_text: _("Text to search ..."),
            track_hover: true,
            can_focus: true,
        });
        this.item.actor.add(this._inputF, { expand: true });
        this.menu.addMenuItem(this.item, 1)
        this._inputF.clutter_text.connect('activate', Lang.bind(this, this._webSearchFromTextBox));

        // Return action on input
        this.actor.connect("button-press-event", Lang.bind(this, this._onKeyPress));

        // Update search engine label
        this._addSearchButton();

        // Separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(), 2);

        // Setting Menu
        let menuPref = new PopupMenu.PopupMenuItem("WebSearch Settings");
        menuPref.connect('activate', this._LaunchExtensionPrefs);
        this.menu.addMenuItem(menuPref, 3);

    },


    _LaunchExtensionPrefs: function() {
	Util.spawn(["gnome-shell-extension-prefs", Me.metadata.uuid]);
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
        this.menu.addMenuItem(this._searchButton, 1);
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
        let Typology;
        
        if (settings.get_boolean('ws-clipboard')) {
            Typology = St.ClipboardType.PRIMARY
        } else {
            Typology = St.ClipboardType.CLIPBOARD
        }
        
        this._clipboard.get_text(Typology, Lang.bind(this, this._getTextCallbackandSearch));
        return true;
    },

    /*
     * Websearch function - priority to text box content
     */
    _webSearchFromTextBox: function() {
        this._fromTextBox = true;
        this._clipboard.get_text(St.ClipboardType.CLIPBOARD, Lang.bind(this, this._getTextCallbackandSearch));
        return true;
    },
    
    enable: function() {
        Main.wm.addKeybinding(
            Prefs.SHOWTEXTBOX_SHORTCUT_KEY,
            settings,
            Meta.KeyBindingFlags.NONE,
            Shell.KeyBindingMode.NORMAL |
            Shell.KeyBindingMode.MESSAGE_TRAY |
            Shell.KeyBindingMode.OVERVIEW,


            Lang.bind(this, function () {
                this.menu.open();
                
                // Focus on this._inputF
                this._inputF.grab_key_focus();
                // Select all
                this._inputF.clutter_text.set_cursor_visible(true);
                this._inputF.clutter_text.set_selection(-1, 0);
            })
        );

        Main.wm.addKeybinding(
            Prefs.SEARCH_SHORTCUT_KEY,
            settings,
            Meta.KeyBindingFlags.NONE,
            Shell.KeyBindingMode.NORMAL |
            Shell.KeyBindingMode.MESSAGE_TRAY |
            Shell.KeyBindingMode.OVERVIEW,
            
            Lang.bind(this, this._webSearch)
        );

        Main.wm.addKeybinding(
            Prefs.SHIFTSEARCHENGINE_SHORTCUT_KEY,
            settings,
            Meta.KeyBindingFlags.NONE,
            Shell.KeyBindingMode.NORMAL |
            Shell.KeyBindingMode.MESSAGE_TRAY |
            Shell.KeyBindingMode.OVERVIEW,

            Lang.bind(this, function () {
                let new_search_engine_index = (settings.get_int('ws-searchengine') + 1) % 
                    Convenience.getSearchEngine().length;
                settings.set_int('ws-searchengine', new_search_engine_index);
                
                Main.notify("Websearch: search engine changed in \"" + 
                    Convenience.getSearchEngine()[settings.get_int('ws-searchengine')][1] + "\"");
            })
        );
    },
    
    disable: function() {
        Main.wm.removeKeybinding(Prefs.SHOWTEXTBOX_SHORTCUT_KEY);
        Main.wm.removeKeybinding(Prefs.SEARCH_SHORTCUT_KEY);
        Main.wm.removeKeybinding(Prefs.SHIFTSEARCHENGINE_SHORTCUT_KEY);
    },

});



let _indicator;

function init(extensionMeta) {

    let theme = imports.gi.Gtk.IconTheme.get_default();
    theme.append_search_path(extensionMeta.path + "/images/");
}


function enable() {

    settings = Convenience.getSettings();
    if (!_indicator) {
        _indicator = new SearchButton();
        _indicator.enable();
        Main.panel.addToStatusArea('web-search', _indicator);
    }
}


function disable() {
    if (_indicator) {
        _indicator.disable();
        _indicator.destroy();
        _indicator = null;
    }
    settings = null;
}

