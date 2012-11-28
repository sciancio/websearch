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

const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;

const Lang = imports.lang;
const Gettext = imports.gettext.domain('gnome-shell-websearch');
const _ = Gettext.gettext;

const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

let settings = null;


const WebsearchWindowSettingsWidget = new GObject.Class({
    Name: 'WebSearchWindow.Prefs.WebsearchWindowSettingsWidget',
    GTypeName: 'WebsearchtWindowSettingsWidget',
    Extends: Gtk.Grid,

    _init : function(params) {
        this.parent(params);
        this.orientation = Gtk.Orientation.VERTICAL;
        this.expand = true;
        this.column_homogeneous = true;
        
        this.set_margin_left(5);
        this.set_margin_right(5);
        this.set_row_spacing(2);
                
        // Bool Settings
        this._createBoolSetting("Switch right/left button mouse:",
            "Default->OFF: right button open textbox; left button start search", 
            'ws-switch-button');

        this._createBoolSetting("Search primary or clipboard selection:",
            "Default->OFF: search clipboard selection",
            'ws-clipboard');

        // Combo Settings
        this._createComboSetting("Choose your preferred search engine",
            "You can choose your search engine",
            'ws-searchengine', Convenience.getSearchEngine());

        // Keybindings Settings
        let bindings = {
            "ws-search": "Search!",
            "ws-show-textbox": "Open the text box",
            "ws-shift-searchengine": "Change your search engine"
        };
        this._createKeyboardConfig("Keyboard Shortcuts", bindings);

    },


    /*
     * Create Keybindings Widget
    */
    _createKeyboardConfig: function(label, bindings) {
        let model = new Gtk.ListStore();

        model.set_column_types([
          GObject.TYPE_STRING,
          GObject.TYPE_STRING,
          GObject.TYPE_INT,
          GObject.TYPE_INT
        ]);

        for (name in bindings) {
          let [key, mods] = Gtk.accelerator_parse(settings.get_strv(name)[0]);
          let row = model.insert(10);
          model.set(row, [0, 1, 2, 3], [name, bindings[name], mods, key ]);
        }

        let treeview = new Gtk.TreeView({
          'expand': true,
          'model': model
        });

        // Action column
        let cellrend = new Gtk.CellRendererText();
        let col = new Gtk.TreeViewColumn({ 'title': 'Action', 'expand': true });
        col.pack_start(cellrend, true);
        col.add_attribute(cellrend, 'text', 1);
        treeview.append_column(col);

        // keybinding column
        cellrend = new Gtk.CellRendererAccel({
          'editable': true,
          'accel-mode': Gtk.CellRendererAccelMode.GTK
        });

        cellrend.connect('accel-edited', function(rend, iter, key, mods) {
          let value = Gtk.accelerator_name(key, mods);
          let [succ, iterator ] = model.get_iter_from_string(iter);

          if(!succ) {
            throw new Error("Error updating Keybinding");
          }

          let name = model.get_value(iterator, 0);

          model.set(iterator, [ 2, 3], [ mods, key ]);
          settings.set_strv(name, [value]);
        });

        col = new Gtk.TreeViewColumn({'title': 'Modify'});

        col.pack_end(cellrend, false);
        col.add_attribute(cellrend, 'accel-mods', 2);
        col.add_attribute(cellrend, 'accel-key', 3);

        treeview.append_column(col);

        let keyExpander = new Gtk.Expander();
        keyExpander.set_label(label);
        keyExpander.add(treeview);
        this.attach(keyExpander, 0, 4, 2, 1);
    },


    /*
     * Create Combo Widget
    */
    _createComboSetting : function(label, tooltip, setting, values) {
    
        let labelwidget = new Gtk.Label({
            halign: Gtk.Align.START,
            label: label,
            tooltip_text: tooltip,
        });
        this.add(labelwidget);
    
        this._model = new Gtk.ListStore();
        this._model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);

        let myCombo = new Gtk.ComboBox({ model: this._model, halign: Gtk.Align.END});

        let currentValue = settings.get_int(setting, 0);

        let selectMe = null;
        for (let i=0; i< values.length; i++) {
          let iter = this._model.append();
          this._model.set(iter, [0, 1], [values[i][0],values[i][1]]);
          if (values[i][0] == currentValue) {
            selectMe = iter;
          }
        }

        if (selectMe != null) {
          myCombo.set_active_iter(selectMe);
        }

        let renderer = new Gtk.CellRendererText();
        myCombo.pack_start(renderer, true);
        myCombo.add_attribute(renderer, 'text', 1);
        myCombo.connect("changed", Lang.bind(this,
          function(obj) {
            let[success, iter] = obj.get_active_iter();
            if (!success) {
              return;
            }
            settings.set_int(setting, this._model.get_value(iter, 0));
          })
        );
        
        this.attach_next_to(myCombo, labelwidget, Gtk.PositionType.RIGHT, 1, 1);
    },
    
    /*
     * Create Boolean Button Widget
    */
    _createBoolSetting : function(label, tooltip, setting) {
    
        let labelwidget = new Gtk.Label({
            halign: Gtk.Align.START,
            label: label,
            tooltip_text: tooltip,
        });
        this.add(labelwidget);

        let mySwitch = new Gtk.Switch({
            active: settings.get_boolean(setting), 
            sensitive: true, 
            halign: Gtk.Align.END });
        mySwitch.connect('notify::active', function(button) {
            settings.set_boolean(setting, button.active);
        });

        this.attach_next_to(mySwitch, labelwidget, Gtk.PositionType.RIGHT, 1, 1);
    },
})



function init() {
    settings = Convenience.getSettings();
}

function buildPrefsWidget() {

    let widget = new WebsearchWindowSettingsWidget();
    widget.show_all();

    return widget;
};

