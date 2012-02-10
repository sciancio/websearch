//   ConnectionManager 3 - Simple GUI app for Gnome 3 that provides a menu 
//   for initiating SSH/Telnet/Custom Apps connections. 
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
const Gtk = imports.gi.Gtk
const Gdk = imports.gi.Gdk;
const St = imports.gi.St;
const Main = imports.ui.main;
const Util = imports.misc.util;
const PanelMenu = imports.ui.panelMenu;


function SearchButton() {
	this._init();
}

SearchButton.prototype = {

	_init: function() {
		this.actor = new St.Button({style_class: "webfind", can_focus: true, reactive: true, track_hover: true});
		let icon = new St.Icon();
		this.actor.add_actor(icon);
		this.actor.set_tooltip_text('Click me to google');
		this.actor.connect("clicked", Lang.bind(this, this._webSearch));
	},


	_webSearch: function() {

		let clipboard = St.Clipboard.get_default()
		clipboard.get_text(Lang.bind(this,
			function(clipboard, text) {

				if (text == null) {
					Main.notifyError("Nothing in clipboard");
					return;
				}

				let googlesearchurl = 'http://www.google.com/search?q=' + escape(text);
				Gtk.show_uri(null, googlesearchurl, Gdk.CURRENT_TIME);

				return;

			}));
	}

};


let _button;

function init() {
	_button = new SearchButton();
}

function enable() {
	let _children = Main.panel._rightBox.get_children();
	Main.panel._rightBox.insert_actor(_button.actor, 0);
	Main.panel._rightBox.add(_button.actor, 0);
}

function disable() {
	Main.panel._rightBox.remove_actor(_button.actor);
}

