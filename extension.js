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

	__proto__: PanelMenu.SystemStatusButton.prototype,

	_init: function() {
		PanelMenu.SystemStatusButton.prototype._init.call(this, 'edit-find');
		
		this.actor = new St.Button();
		this.actor.set_tooltip_text('Click me to google');
		this.actor.set_size(40, 26);

		this.actor.set_child(new St.Icon({
				icon_name: 'edit-find',
				icon_size: 14
		}));
		
		this.actor.connect("clicked", Lang.bind(this, this._searchGoogle));
	},


	_searchGoogle: function() {

		let clipboard = St.Clipboard.get_default()
		clipboard.get_text(Lang.bind(this,
			function(clipboard, text) {

				if (text == null) {
					Main.notifyError("Nothing in clipboard");
					return;
				}

				let googlesearchurl = 'http://www.google.it/search?q=' + escape(text)
				Util.spawn(['firefox', '--new-tab', googlesearchurl]);
				
				return;

			}));

	}

};

let _indicator;

function init() {
	button = new SearchButton();
}

function enable() {
	_indicator = new SearchButton;
	Main.panel.addToStatusArea('find-web', _indicator);
}

function disable() {
	_indicator.destroy();
}

