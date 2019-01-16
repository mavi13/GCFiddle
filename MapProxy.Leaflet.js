// MapProxy.Leaflet.js - MapProxy.Leaflet for GCFiddle
// https://leafletjs.com/reference-1.3.0.html
//
/* globals MapProxy, Utils, gDebug, LatLng, L */ // make ESlint happy

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
		Utils.loadStyle(sUrl, function () {
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
				accessToken: that.options.leafletMapboxKey
			}).addTo(this.map);
			*/

			that.featureGroup = new MapProxy.Leaflet.FeatureGroup({
				onGetInfoWindowContent: options.onGetInfoWindowContent
			});

			if (that.options.onload) {
				that.options.onload(that);
			}
		});
	},
	getFeatureGroup: function () {
		return this.featureGroup;
	},
	setCenter: function (position) {
		this.map.setView(MapProxy.Leaflet.position2leaflet(position)); // keep zoom level
	},
	resize: function () {
		var oMap = this.map;

		oMap.invalidateSize();
	},
	privGetMap: function () {
		return this.map;
	}
};


// https://leafletjs.com/reference-1.3.4.html#featuregroup
MapProxy.Leaflet.FeatureGroup = function (options) {
	this.init(options);
};

MapProxy.Leaflet.FeatureGroup.prototype = {
	init: function (options) {
		var that = this,
			oNewPopup,
			mMarkerDragListener = {
				dragstart: function (event) {
					var oLeafletMarker = event.target,
						oPopup = that.markerGroup.getPopup();

					if (oPopup.isOpen()) {
						oPopup.openOn(oLeafletMarker); // reopen during drag
						if (!oLeafletMarker.getPopup()) {
							oLeafletMarker.bindPopup(oPopup);
						}
					}
				},
				drag: function (event) {
					var oLeafletMarker = event.target,
						oPopup = that.markerGroup.getPopup();

					if (oPopup.isOpen()) {
						oPopup.setContent(that.privGetPopupContent(oLeafletMarker));
					}
				},
				dragend: function (event) {
					var oLeafletMarker = event.target;

					if (oLeafletMarker.getPopup()) {
						oLeafletMarker.unbindPopup();
					}
				}
			};

		this.options = Utils.objectAssign({	}, options);
		this.iPopupSourceId = null; // current marker id with popup
		this.markerGroup = L.featureGroup(); // featureGroup for markers
		this.polylineGroup = L.featureGroup(); // featureGroup for polyline
		this.aMarkerPool = [];

		oNewPopup = new L.Popup();
		this.markerGroup.bindPopup(oNewPopup).on("click", function (event) {
			// https://leafletjs.com/reference-1.3.4.html#event-objects
			var oMarkerGroup = event.target, // event.target === that.markerGroup
				oMarker = event.sourceTarget, // or: event.propagatedFrom (event.layer is deprecated)
				oPopup = oMarkerGroup.getPopup(),
				iOldPopupSourceId = that.iPopupSourceId,
				oOldMarker;

			that.iPopupSourceId = oMarkerGroup.getLayerId(oMarker); // marker with popup id

			if (iOldPopupSourceId && iOldPopupSourceId !== that.iPopupSourceId) { // old marker id different from current marker?
				oOldMarker = oMarkerGroup.getLayer(iOldPopupSourceId);
				if (oOldMarker && oOldMarker.listens("dragstart")) {
					oOldMarker.off(mMarkerDragListener);
					if (gDebug) {
						gDebug.log("DEBUG: drag events removed from old marker id " + iOldPopupSourceId);
					}
				}
			}

			// set drag binding on clicked marker, if not done already
			if (oPopup.isOpen()) {
				if (!oMarker.listens("dragstart")) {
					oMarker.on(mMarkerDragListener);
					if (gDebug) {
						gDebug.log("DEBUG: drag events set to marker id " + that.iPopupSourceId);
					}
				}

				oPopup.setContent(that.privGetPopupContent(oMarker));
			} else if (oMarker.listens("dragstart")) { // not really needed to check
				oMarker.off(mMarkerDragListener);
				if (gDebug) {
					gDebug.log("DEBUG: drag events removed from marker id " + that.iPopupSourceId);
				}
			}
		});
	},

	privSetPolyline: function (path) {
		var aLayers = this.polylineGroup.getLayers(),
			mPolylineOptions, oPolyline;

		if (aLayers.length) {
			oPolyline = aLayers[0];
			oPolyline.setLatLngs(path);
		} else {
			mPolylineOptions = {
				color: "blue", // "red", // default: #3388FF
				weight: 2, // default: 3
				opacity: 0.7 // default: 1
			};
			oPolyline = new L.Polyline(path, mPolylineOptions);
			oPolyline.addTo(this.polylineGroup);
		}
	},

	addMarkers: function (aList) {
		var aMarkerPool = this.aMarkerPool,
			markerGroup = this.markerGroup,
			oPopup = markerGroup.getPopup(),
			aLayers = markerGroup.getLayers(),
			aPath = [],
			i, oMarkerOptions, oMarker;

		for (i = 0; i < aList.length; i += 1) {
			oMarkerOptions = aList[i];
			aPath.push(oMarkerOptions.position);
			if (!aMarkerPool[i]) {
				oMarker = new MapProxy.Leaflet.Marker(oMarkerOptions);
				aMarkerPool[i] = oMarker;
			} else {
				oMarker = aMarkerPool[i];
				oMarker.setLabel(oMarkerOptions.label).setTitle(oMarkerOptions.title).setPosition(oMarkerOptions.position);
				if (oPopup && oPopup.isOpen() && this.markerGroup.getLayerId(oMarker.marker) === this.iPopupSourceId) {
					oPopup.setLatLng(MapProxy.Leaflet.position2leaflet(oMarkerOptions.position));
					oPopup.setContent(this.privGetPopupContent(oMarker));
				}
			}
			if (i >= aLayers.length) {
				oMarker.marker.addTo(markerGroup);
			}
		}
		this.privSetPolyline(aPath);
	},
	deleteMarkers: function () {
		var oPopup = this.markerGroup.getPopup();

		if (oPopup && oPopup.isOpen()) {
			oPopup.remove();
		}
		this.markerGroup.clearLayers();
		this.polylineGroup.clearLayers();
	},
	setMap: function (map) {
		var oBounds;

		if (map) {
			oBounds = this.markerGroup.getBounds();
			if (oBounds.isValid()) {
				map.privGetMap().fitBounds(oBounds, {
					padding: [10, 10] // eslint-disable-line array-element-newline
				});
			} else {
				window.console.warn("bounds are not vaild.");
			}
			this.polylineGroup.addTo(map.privGetMap());
			this.markerGroup.addTo(map.privGetMap());
		} else if (this.map) {
			this.markerGroup.removeFrom(this.map.privGetMap());
			this.polylineGroup.removeFrom(this.map.privGetMap());
		}
		this.map = map;
	},
	fitBounds: function () {
		var oBounds;

		if (this.map) {
			oBounds = this.markerGroup.getBounds();
			if (oBounds.isValid()) {
				this.map.privGetMap().fitBounds(oBounds, {
					padding: [10, 10] // eslint-disable-line array-element-newline
				});
			}
		}
	},
	privGetPopupContent: function (oLeafletMarker) {
		var aMarkerPool = this.aMarkerPool,
			markerGroup = this.markerGroup,
			aLayers = markerGroup.getLayers(),
			oMarker, oPreviousMarker, sContent, iIndex;

		iIndex = aLayers.indexOf(oLeafletMarker);
		if (iIndex >= 0 && iIndex < aMarkerPool.length) { // we assume same index in markerGroup and markerPool
			oMarker = aMarkerPool[iIndex];
			if (iIndex >= 1) { // not the first one?
				oPreviousMarker = aMarkerPool[iIndex - 1];
			}
			sContent = this.options.onGetInfoWindowContent ? this.options.onGetInfoWindowContent(oMarker, oPreviousMarker) : "";
		} else {
			window.console.error("privGetPopupContent: wrong index: " + iIndex);
		}
		return sContent;
	}
};


MapProxy.Leaflet.Marker = function (options) {
	this.init(options);
};

MapProxy.Leaflet.Marker.prototype = {
	init: function (options) {
		var oMarkerOptions;

		this.options = Utils.objectAssign({	}, options);
		oMarkerOptions = this.options;
		this.marker = new L.Marker(MapProxy.Leaflet.position2leaflet(oMarkerOptions.position), {
			draggable: true,
			label: oMarkerOptions.label,
			title: oMarkerOptions.title,
			icon: new L.DivIcon({
				html: oMarkerOptions.label,
				iconSize: [16, 16] // eslint-disable-line array-element-newline
			})
		});
		this.marker.on("dragend", this.onMarkerDragend.bind(this));
	},

	onMarkerDragend: function (/* event */) {
		this.getPosition(); // update position (to detect change in setPosition)
	},

	getPosition: function () {
		var oPos = this.marker.getLatLng();

		if (oPos) { // without API key we won't get a position
			this.options.position.setLatLng(oPos.lat, oPos.lng); // update position; MapProxy.Leaflet.leaflet2position(oPos)
		}
		return this.options.position;
	},
	setPosition: function (position) {
		if (String(this.options.position) !== String(position)) {
			this.options.position = position;
			this.marker.setLatLng(MapProxy.Leaflet.position2leaflet(position));
		}
		return this;
	},
	getTitle: function () {
		return this.options.title;
	},
	setTitle: function (title) {
		if (this.options.title !== title) {
			this.options.title = title;
			this.marker.options.title = title;
		}
		return this;
	},
	setLabel: function (label) {
		if (this.options.label !== label) {
			this.options.label = label;
			this.marker.options.label = label;
		}
		return this;
	}
	/*
	setMap: function (map) {
		this.map = map;
		this.marker.setMap(map ? map.privGetMap() : null);
		return this;
	}
	*/
};
// end
