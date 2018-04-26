// MapProxy.Leaflet.js - MapProxy.Leaflet for GCFiddle
//
/* globals MapProxy, Utils, L */ // make ESlint happy

"use strict";

MapProxy.Leaflet = { };

MapProxy.Leaflet.Map = function (options) {
	this.init(options);
};

MapProxy.Leaflet.Map.prototype = {
	init: function (options) {
		var that = this,
			sProtocol, sUrl, sUrl2;

		this.options = Utils.objectAssign({ }, options);
		sProtocol = (window.location.protocol === "https:") ? window.location.protocol : "http:";
		// sUrl = sProtocol + "//maps.Leafletapis.com/maps/api/js" + ((this.options.LeafletKey) ? "?key=" + this.options.LeafletKey : "");
		sUrl = this.options.leafletUrl.replace(/^http(s)?:/, sProtocol).replace(/(-src)?\.js$/, ".css");
		Utils.loadStyle(sUrl, function() {
			window.console.log("Leaflet style loaded (" + sUrl + ")");
		});

		sUrl2 = this.options.leafletUrl.replace(/^http(s)?:/, sProtocol);
		Utils.loadScript(sUrl2, function () {
			// var bHidden;

			window.console.log("Leaflet " + L.version + " loaded (" + sUrl2 + ")");
			that.map = L.map(that.options.mapDivId);
			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				maxZoom: 18
			}).addTo(that.map);

			/*
			L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
				attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>"',
				maxZoom: 18,
				id: "mapbox.streets",
				accessToken: that.options.mapboxKey
			}).addTo(this.map);
			*/
			if (that.options.onload) {
				that.options.onload(that);
			}
		});
	},
	getDiv: function () {
		return this.map.getContainer();
	},
	setZoom: function (zoom) {
		this.map.setZoom(zoom);
	},
	setCenter: function (position) {
		this.map.setView(position, this.options.zoom);
	},
	fitBounds: function (bounds) {
		this.map.fitBounds(bounds.getBounds());
	},
	resize: function () {
		var oMap = this.map;

		oMap.invalidateSize();
	},
	getMap: function () {
		return this.map;
	}
};


MapProxy.Leaflet.LatLngBounds = function (options) {
	this.init(options);
};

MapProxy.Leaflet.LatLngBounds.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({	}, options);
		this.bounds = new L.LatLngBounds();
	},
	getBounds: function () {
		return this.bounds;
	},
	extend: function (position) {
		this.bounds.extend(position);
	}
};


MapProxy.Leaflet.Marker = function (options) {
	this.init(options);
};

MapProxy.Leaflet.Marker.prototype = {
	init: function (options) {
		var that = this,
			oInfoWindow;

		this.options = Utils.objectAssign({	}, options);

		this.marker = new L.Marker(this.options.position, {
			draggable: this.options.draggable,
			icon: new L.DivIcon({
				html: this.options.label,
				iconSize: [16, 16] // eslint-disable-line array-element-newline
			})
		});
		this.marker.bindTooltip(this.options.title);
		oInfoWindow = this.options.infoWindow;
		if (oInfoWindow) {
			this.marker.bindPopup(oInfoWindow.infoWindow).on("click", function (/* event */) {
				oInfoWindow.setContent(that);
			}).on("move", function (/* event */) {
				oInfoWindow.setContent(that);
			});
		}
	},
	getSimplePosition: function () {
		return this.getPosition();
	},
	getPosition: function () {
		return this.marker.getLatLng();
	},
	setPosition: function (position) {
		this.marker.setLatLng(position);
	},
	getTitle: function () {
		return this.options.title;
	},
	setTitle: function (title) {
		this.options.title = title;
	},
	getLabel: function () {
		return this.options.label;
	},
	setLabel: function (label) {
		this.options.label = label;
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		this.map = map;
		if (map) {
			this.marker.addTo(map.getMap());
		} else {
			map = this.getMap();
			if (map) {
				this.marker.removeFrom(map.getMap());
			}
		}
	}
};


MapProxy.Leaflet.Polyline = function (options) {
	this.init(options);
};

MapProxy.Leaflet.Polyline.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({	}, options);
		this.polyline = new L.Polyline(this.options);
	},
	setPath: function (path) {
		this.polyline.setLatLngs(path);
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		this.map = map;
		if (map) {
			this.polyline.addTo(map.getMap());
		} else {
			map = this.getMap();
			if (map) {
				this.polyline.removeFrom(map.getMap());
			}
		}
	}
};


MapProxy.Leaflet.InfoWindow = function (options) {
	this.init(options);
};

MapProxy.Leaflet.InfoWindow.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({}, options);
		this.infoWindow = new L.Popup();
	},
	setContent: function (marker) {
		var sContent = this.options.onGetInfoWindowContent ? this.options.onGetInfoWindowContent(marker) : "";

		this.infoWindow.setContent(sContent);
	},
	setPosition: function (position) {
		this.infoWindow.setPosition(position);
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		this.map = map;
	},
	getAnchor: function () {
		return false; // not needed
	},
	open: function (map, marker) {
		this.infoWindow.open(map.getMap(), marker.marker);
	},
	close: function () {
		this.infoWindow.closePopup();
	}
};
// end
