// MapProxy.Leaflet.js - MapProxy.Leaflet for GCFiddle
// https://leafletjs.com/reference-1.3.0.html
//
/* globals MapProxy, Utils, LatLng, L */ // make ESlint happy

"use strict";

MapProxy.Leaflet = {
	position2leaflet: function (position) {
		return position; // not needed
	},
	leaflet2position: function (position) {
		return new LatLng(position.lat, position.lng);
	}
};

MapProxy.Leaflet.Map = function (options) {
	this.init(options);
};

MapProxy.Leaflet.Map.prototype = {
	init: function (options) {
		var that = this,
			sProtocol, sUrl, sUrl2;

		this.options = Utils.objectAssign({ }, options);
		sProtocol = (window.location.protocol === "https:") ? window.location.protocol : "http:";
		sUrl = this.options.leafletUrl.replace(/^http(s)?:/, sProtocol).replace(/(-src)?\.js$/, ".css");
		Utils.loadStyle(sUrl, function() {
			window.console.log("Leaflet style loaded (" + sUrl + ")");
		});

		sUrl2 = this.options.leafletUrl.replace(/^http(s)?:/, sProtocol);
		Utils.loadScript(sUrl2, function () {
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
		this.map.setView(MapProxy.Leaflet.position2leaflet(position), this.options.zoom);
	},
	fitBounds: function (bounds) {
		this.map.fitBounds(bounds.getBounds(), {
			padding: [10, 10] // eslint-disable-line array-element-newline
		});
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
		this.bounds.extend(MapProxy.Leaflet.position2leaflet(position));
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

		this.marker = new L.Marker(MapProxy.Leaflet.position2leaflet(this.options.position), {
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
	getPosition: function () {
		var oPos = this.marker.getLatLng();

		return MapProxy.Leaflet.leaflet2position(oPos);
	},
	setPosition: function (position) {
		this.marker.setLatLng(MapProxy.Leaflet.position2leaflet(position));
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
		if (map) {
			this.marker.addTo(map.getMap());
		} else if (this.map) {
			this.marker.removeFrom(this.map.getMap());
		}
		this.map = map;
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
		if (map) {
			this.polyline.addTo(map.getMap());
		} else if (this.map) {
			this.polyline.removeFrom(this.map.getMap());
		}
		this.map = map;
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
