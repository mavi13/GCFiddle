// MapProxy.Google.js - MapProxy.Google for GCFiddle
// https://developers.google.com/maps/documentation/javascript/reference
//
/* globals MapProxy, Utils, LatLng, google */ // make ESlint happy

"use strict";

MapProxy.Google = {
	position2google: function (position) {
		return new google.maps.LatLng(position.lat, position.lng);
	},
	google2position: function (position) {
		return new LatLng(position.lat(), position.lng());
	}
};

MapProxy.Google.Map = function (options) {
	this.init(options);
};

MapProxy.Google.Map.prototype = {
	init: function (options) {
		var that = this,
			sProtocol, sUrl;

		this.options = Utils.objectAssign({ }, options);
		sProtocol = (window.location.protocol === "https:") ? window.location.protocol : "http:";
		sUrl = sProtocol + "//maps.googleapis.com/maps/api/js" + ((this.options.googleKey) ? "?key=" + this.options.googleKey : "");
		Utils.loadScript(sUrl, function () {
			var mapDiv = document.getElementById(that.options.mapDivId);

			window.console.log("GoogleMaps " + google.maps.version + " loaded");
			that.map = new google.maps.Map(mapDiv, {
				zoom: that.options.zoom
			});

			google.maps.event.addListener(that.map, "zoom_changed", function () {
				var iFitBoundsZoom = that.fitBoundsZoom;

				if (iFitBoundsZoom && that.map.getZoom() !== iFitBoundsZoom) {
					that.fitBoundsZoom = 0; // avoid recursive call!
					that.map.setZoom(iFitBoundsZoom);
				}
			});

			if (that.options.onload) {
				that.options.onload(that);
			}
		});
	},
	setZoom: function (zoom) {
		this.map.setZoom(zoom);
	},
	setCenter: function (position) {
		this.map.setCenter(MapProxy.Google.position2google(position));
	},
	fitBounds: function (bounds) {
		var oBounds = bounds.getBounds(),
			that = this;

		if (oBounds.getSouthWest()) { // Google maps available? (with API key)
			if (oBounds.getSouthWest().toString() === oBounds.getNorthEast().toString()) { // only one waypoint
				this.fitBoundsZoom = that.options.zoom; // limit zoom level
			}
		}
		this.map.fitBounds(oBounds);
	},
	resize: function () {
		var oMap = this.map;

		google.maps.event.trigger(oMap, "resize");
	},
	privGetMap: function () {
		return this.map;
	}
};


MapProxy.Google.LatLngBounds = function (options) {
	this.init(options);
};

MapProxy.Google.LatLngBounds.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({	}, options);
		this.bounds = new google.maps.LatLngBounds();
	},
	getBounds: function () {
		return this.bounds;
	},
	extend: function (position) {
		this.bounds.extend(MapProxy.Google.position2google(position));
	}
};


MapProxy.Google.Marker = function (options) {
	this.init(options);
};

MapProxy.Google.Marker.prototype = {
	init: function (options) {
		var that = this,
			oMarkerOptions;

		this.options = Utils.objectAssign({	}, options);
		oMarkerOptions = this.options;

		this.marker = new google.maps.Marker({
			position: MapProxy.Google.position2google(oMarkerOptions.position),
			label: oMarkerOptions.label,
			title: oMarkerOptions.title,
			draggable: oMarkerOptions.draggable
		});
		google.maps.event.addListener(this.marker, "click", function () {
			var oInfoWindow = that.options.infoWindow;

			if (oInfoWindow) {
				if (oInfoWindow.getAnchor() !== that) {
					oInfoWindow.setContent(that);
					oInfoWindow.open(that.map, that);
				} else {
					oInfoWindow.close();
				}
			}
		});
		google.maps.event.addListener(this.marker, "drag", function () {
			var oInfoWindow = that.options.infoWindow;

			if (oInfoWindow && oInfoWindow.getAnchor() === that) {
				oInfoWindow.setContent(that);
			}
		});
	},
	getPosition: function () {
		var oPos = this.marker.getPosition();

		return oPos ? MapProxy.Google.google2position(oPos) : this.options.position; // if no API key, retrun initial position
	},
	setPosition: function (position) {
		this.marker.setPosition(MapProxy.Google.position2google(position));
	},
	getTitle: function () {
		return this.marker.getTitle();
	},
	setTitle: function (title) {
		this.marker.setTitle(title);
	},
	getLabel: function () {
		return this.marker.getLabel();
	},
	setLabel: function (label) {
		this.marker.setLabel(label);
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		this.map = map;
		this.marker.setMap(map ? map.privGetMap() : null);
	},
	privGetMarker: function () {
		return this.marker;
	}
};


MapProxy.Google.Polyline = function (options) {
	this.init(options);
};

MapProxy.Google.Polyline.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({	}, options);
		this.polyline = new google.maps.Polyline(this.options);
	},
	setPath: function (path) {
		this.polyline.setPath(path);
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		this.map = map;
		this.polyline.setMap(map ? map.privGetMap() : null);
	}
};


MapProxy.Google.InfoWindow = function (options) {
	this.init(options);
};

MapProxy.Google.InfoWindow.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({}, options);
		this.infoWindow = new google.maps.InfoWindow();
	},
	setContent: function (marker) {
		var sContent = this.options.onGetInfoWindowContent ? this.options.onGetInfoWindowContent(marker) : "";

		this.infoWindow.setContent(sContent);
	},
	getAnchor: function () {
		return this.anchor;
	},
	open: function (map, marker) {
		this.anchor = marker;
		this.infoWindow.open(map.privGetMap(), marker.privGetMarker());
	},
	close: function () {
		this.anchor = null;
		this.infoWindow.close();
	}
};
// end
