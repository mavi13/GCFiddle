// MapProxy.Google.js - MapProxy.Google for GCFiddle
//
/* globals MapProxy, Utils, google */ // make ESlint happy

"use strict";

MapProxy.Google = { };

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
			window.console.log("GoogleMaps " + google.maps.version + " loaded");
			that.div = document.getElementById(that.options.mapDivId);
			that.map = new google.maps.Map(that.div, {
				zoom: that.options.zoom
			});
			if (that.options.onload) {
				that.options.onload(that);
			}
		});
	},
	getDiv: function () {
		return this.div;
	},
	setZoom: function (zoom) {
		this.map.setZoom(zoom);
	},
	setCenter: function (position) {
		this.map.setCenter(position);
	},
	fitBounds: function (bounds) {
		this.map.fitBounds(bounds.getBounds());
	},
	resize: function () {
		var oMap = this.map;

		google.maps.event.trigger(oMap, "resize");
	},
	getMap: function () {
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
		this.bounds.extend(position);
	}
};


MapProxy.Google.Marker = function (options) {
	this.init(options);
};

MapProxy.Google.Marker.prototype = {
	init: function (options) {
		var that = this,
			oMarkerOptions, oMarker;

		this.options = Utils.objectAssign({	}, options);
		oMarkerOptions = this.options;

		oMarkerOptions.position = new google.maps.LatLng(oMarkerOptions.position.lat, oMarkerOptions.position.lng); // make Google happy: LatLng or LatLngLiteral
		this.marker = new google.maps.Marker(oMarkerOptions);
		oMarker = this.marker;
		google.maps.event.addListener(oMarker, "click", function () {
			var oInfoWindow = that.options.infoWindow;

			if (oInfoWindow) {
				if (oInfoWindow.getAnchor() !== oMarker) {
					oInfoWindow.setContent(that);
					oInfoWindow.open(that.map, that);
				} else {
					oInfoWindow.close();
				}
			}
		});
		google.maps.event.addListener(oMarker, "drag", function () {
			var oInfoWindow = that.options.infoWindow;

			if (oInfoWindow && oInfoWindow.getAnchor() === oMarker) {
				oInfoWindow.setContent(that);
			}
		});
	},
	getSimplePosition: function () {
		var oPosition = this.getPosition();

		return {
			lat: oPosition.lat(),
			lng: oPosition.lng()
		};
	},
	getPosition: function () {
		return this.marker.getPosition();
	},
	setPosition: function (position) {
		this.marker.setPosition(position);
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
		this.marker.setMap(map ? map.getMap() : null);
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
		this.polyline.setMap(map ? map.getMap() : null);
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
	setPosition: function (position) {
		this.infoWindow.setPosition(position);
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		this.map = map;
		this.infoWindow.setMap(map ? map.getMap() : null);
	},
	getAnchor: function () {
		return this.infoWindow.getAnchor();
	},
	open: function (map, marker) {
		this.infoWindow.open(map.getMap(), marker.marker);
	},
	close: function () {
		this.infoWindow.close();
	}
};
// end
