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
			if (that.options.onload) {
				that.options.onload(that);
			}
		});
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
	privGetMap: function () {
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


// TEST
// use https://leafletjs.com/reference-1.3.4.html#featuregroup?
MapProxy.Leaflet.FeatureGroup = function (options) {
	this.init(options);
};

MapProxy.Leaflet.FeatureGroup.prototype = {
	init: function (options) {
		var that = this,
			oPopup;

		this.options = Utils.objectAssign({	}, options);
		//this.registeredMarkers = {};
		this.iPopupSourceId = null;
		this.featureGroup = L.featureGroup();

		// map.addLayer(featureGroup);
		// https://gis.stackexchange.com/questions/258929/add-layers-to-a-feature-group-with-a-function-loop
		// https://leafletjs.com/reference-1.3.4.html#featuregroup
		// L.marker([54.962725, 12.548215]).addTo(featureGroup);

		//oInfoWindow = this.options.infoWindow;
		this.oPopup = new L.Popup();
		//if (oPopup) {
			//this.featureGroup.bindPopup(oInfoWindow.privGetinfoWindow()).on("click", function (event) {
		this.featureGroup.bindPopup(oPopup).on("click", function (event) {
			// https://leafletjs.com/reference-1.3.4.html#event-objects
			var oFeatureGroup = event.target, // event.target === that.featuregroup
				oLeafletMarker = event.sourceTarget, // or: event.propagatedFrom (event.layer is deprecated)
				oPopup2 = oFeatureGroup.getPopup();

			// window.console.log("click: " + oLeafletMarker.getTooltip().getContent() + " " + MapProxy.Leaflet.leaflet2position(oLeafletMarker.getLatLng()).toFormattedString() + " isOpen=" + oPopup.isOpen());
			that.iPopupSourceId = oFeatureGroup.getLayerId(oLeafletMarker); // marker with popup id
			if (oPopup2.isOpen()) {
				oPopup2.setContent(that.privGetPopupContent(oLeafletMarker));
				//oInfoWindow.privGetinfoWindow().openOn(that.map.privGetMap(), oLeafletMarker); //TTT
			}
		});
		//}
	},
	/*
	fnDebounce: function (func, wait, immediate) {
		var timeout,
			that = this;

		return function () {
			var args = arguments,
				later = function () {
					timeout = null;
					if (!immediate) {
						func.apply(that, args);
					}
				},
				callNow = immediate && !timeout;

			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) {
				func.apply(that, args);
			}
		};
	},
	*/

	privAddPolyline: function (path) {
		var oPolylineOptions, oPolyline;

		oPolylineOptions = {
			color: "blue", // "red", // default: #3388FF
			weight: 2, // default: 3
			opacity: 0.7 // default: 1
		};
		oPolyline = new L.Polyline(path, oPolylineOptions);
		// oPolyline.setLatLngs(path);
		oPolyline.addTo(this.featureGroup);
	},

	privOnDragStart: function (event) {
		var oLeafletMarker = event.target,
			oPopup = this.featureGroup.getPopup();

		// window.console.log("dragstart: " + oLeafletMarker.getTooltip().getContent() + " " + MapProxy.Leaflet.leaflet2position(oLeafletMarker.getLatLng()).toFormattedString());
		if (oPopup.isOpen()) {
			oPopup.openOn(oLeafletMarker); // reopen during drag
			if (!oLeafletMarker.getPopup()) {
				oLeafletMarker.bindPopup(oPopup);
			}
		}
	},
	privOnDrag: function (event) {
		var oLeafletMarker = event.target,
			oPopup = this.featureGroup.getPopup();

		// window.console.log("drag: " + oLeafletMarker.getTooltip().getContent() + " " + MapProxy.Leaflet.leaflet2position(oLeafletMarker.getLatLng()).toFormattedString());
		if (oPopup.isOpen()) {
			oPopup.setContent(this.privGetPopupContent(oLeafletMarker));
		}
	},
	privOnDragEnd: function (event) {
		var oLeafletMarker = event.target;

		// window.console.log("dragend: " + oLeafletMarker.getTooltip().getContent() + " " + MapProxy.Leaflet.leaflet2position(oLeafletMarker.getLatLng()).toFormattedString());
		if (oLeafletMarker.getPopup()) {
			oLeafletMarker.unbindPopup();
		}
	},

	addMarkers: function (aList) {
		var	//oInfoWindow = this.options.infoWindow,
			aPath = [],
			i, oItem, oMarker, leafLetId, oPosition, aLayers, oPolyline, oPopup;

		oPopup = this.featureGroup.getPopup();
		if (!oPopup.isOpen()) {
			oPopup = null;
		}
		// now oPopup is <> null if it exists and is open

		aLayers = this.featureGroup.getLayers();
		if (aLayers.length) {
			oPolyline = aLayers[aLayers.length - 1]; // we assume the last layer is the polyline
		}
		for (i = 0; i < aList.length; i += 1) {
			oItem = aList[i];
			oPosition = MapProxy.Leaflet.position2leaflet(oItem.position);
			aPath.push(oPosition);
			if (i >= aLayers.length) {
				oMarker = new L.Marker(oPosition, {
					draggable: true,
					label: oItem.label,
					icon: new L.DivIcon({
						html: oItem.label,
						iconSize: [16, 16] // eslint-disable-line array-element-newline
					})
				});

				oMarker.bindTooltip(oItem.title);

				//if (oInfoWindow) {
				if (this.oPopup) {
					//oMarker.on("dragstart", fnOnDragStart).on("drag", this.fnDebounce(fnOnDrag.bind(this), 50, false)).on("dragend", fnOnDragEnd);
					if (Object.bind) {
						oMarker.on("dragstart", this.privOnDragStart.bind(this)).on("drag", this.privOnDrag.bind(this)).on("dragend", this.privOnDragEnd.bind(this));
					}
				}

				oMarker.addTo(this.featureGroup);
				leafLetId = this.featureGroup.getLayerId(oMarker);
				oItem.leafLetId = leafLetId; //TTT
			} else { //TODO: deal with polyline!!
				oMarker = aLayers[i];
				oMarker.options.label = oItem.label; //TTT
				oMarker.getTooltip().setContent(oItem.title); //oMarker.options.title = oItem.title; //TTT

				oMarker.setLatLng(oPosition);

				//if (oMarker.getPopup() && oMarker.getPopup().isOpen()) {
				//if (oPopup && oPopup._source === oMarker) { //TTT
				if (oPopup && this.featureGroup.getLayerId(oMarker) === this.iPopupSourceId) {
					//oMarker.setLatLng(oMarker.getLatLng()); //TTT does not work/not needed
					//oMarker.getPopup().setLatLng(oPosition);
					oPopup.setLatLng(oPosition);
					oPopup.setContent(this.privGetPopupContent(oMarker));
					//oInfoWindow.privGetinfoWindow().openOn(that.map.privGetMap(), oLeafletMarker); //TTT
				}
				//if (oInfoWindow && oInfoWindow.privGetinfoWindow().isOpen() && oInfoWindow.getAnchor() !== this) { //TTT TODO
					//oInfoWindowMarker = oInfoWindow.getAnchor();
					//oInfoWindowMarker.privGetMarker().setLatLng(oInfoWindowMarker.privGetMarker().getLatLng()); //fast hack: after each move reset position of marker with open popup
				//}
			}
		}
		if (oPolyline) {
			oPolyline.setLatLngs(aPath);
		} else {
			this.privAddPolyline(aPath);
		}
	},
	/*
	changeMarker: function (oItem, options) {
		var leafLetId = oItem.leafLetId,
			oMarker;

		oMarker = this.featureGroup.getLayer(leafLetId);
		//TTT
	},
	*/
	deleteMarkers: function () {
		this.featureGroup.clearLayers(); // delete markers and polyline
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		var oBounds;

		if (map) {
			oBounds = this.featureGroup.getBounds();
			if (oBounds.isValid()) {
				map.privGetMap().fitBounds(oBounds, {
					padding: [10, 10] // eslint-disable-line array-element-newline
				});
			} else {
				window.console.warn("bounds are not vaild."); //TTT
			}
			this.featureGroup.addTo(map.privGetMap());
		} else if (this.map) {
			this.featureGroup.removeFrom(this.map.privGetMap());
		}
		this.map = map;
	},
	fitBounds: function () {
		var oBounds;

		if (this.map) {
			oBounds = this.featureGroup.getBounds();
			if (oBounds.isValid()) {
				this.map.privGetMap().fitBounds(oBounds, {
					padding: [10, 10] // eslint-disable-line array-element-newline
				});
			}
		}
		/*
		this.map.fitBounds(bounds.getBounds(), {
			padding: [10, 10] // eslint-disable-line array-element-newline
		});
		*/
	},
	privGetPopupContent: function (oLeafletMarker) {
		var oFeatureGroup = this.featureGroup, // event.target === that.featuregroup
			oMarker, aMarkers, oPreviousLeafletMarker, oPreviousMarker,	sContent, iIndex;

		oMarker = {
			title: oLeafletMarker.getTooltip().getContent(), // title
			position: MapProxy.Leaflet.leaflet2position(oLeafletMarker.getLatLng())
		};
		aMarkers = oFeatureGroup.getLayers();
		iIndex = aMarkers.indexOf(oLeafletMarker);
		if (iIndex >= 1) { // not the first one?
			oPreviousLeafletMarker = aMarkers[iIndex - 1];
			oPreviousMarker = {
				title: oPreviousLeafletMarker.getTooltip().getContent(), // title
				position: MapProxy.Leaflet.leaflet2position(oPreviousLeafletMarker.getLatLng())
			};
		}
		sContent = this.privGetInfoWindowContent2(oMarker, oPreviousMarker);
		return sContent;
	},
	privGetInfoWindowContent2: function (marker, previousMarker) {
		var aDirections = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"], // eslint-disable-line array-element-newline
			sContent, oPosition1, oPosition2, iAngle, iDistance, sDirection;

		sContent = marker.title + "=" + marker.position.toFormattedString(this.options.positionFormat); //TTT TODO

		if (previousMarker) {
			oPosition1 = previousMarker.position;
			oPosition2 = marker.position;
			iAngle = Math.round(LatLng.prototype.bearingTo.call(oPosition1, oPosition2));
			iDistance = Math.round(LatLng.prototype.distanceTo.call(oPosition1, oPosition2));
			sDirection = aDirections[Math.round(iAngle / (360 / aDirections.length)) % aDirections.length];
			sContent += "<br>" + sDirection + ": " + iAngle + "° " + iDistance + "m";
		}
		return sContent;
	},
	/*
	privRegisterMarker: function (marker) {
		this.registeredMarkers[marker.privGetMarker().id] = marker;
	},
	privUnregisterMarker: function (marker) {
		delete this.registeredMarkers[marker.privGetMarker().id];
	},
	privGetRegisteredMarker: function (id) {
		return this.registeredMarkers[id];
	}
	*/
	deleteFeatureGroup: function () {
		this.deleteMarkers();
		this.polyLine = null;
		if (this.infoWindow) {
			this.infoWindow.close();
			this.infoWindow = null;
		}
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
			draggable: true,
			icon: new L.DivIcon({
				html: this.options.label,
				iconSize: [16, 16] // eslint-disable-line array-element-newline
			})
		});
		this.marker.bindTooltip(this.options.title);
		oInfoWindow = this.options.infoWindow;
		if (oInfoWindow) {
			this.marker.bindPopup(oInfoWindow.privGetinfoWindow()).on("click", function () {
				// window.console.log("click: " + that.getLabel() + " " + that.getPosition() + " isOpen=" + oInfoWindow.privGetinfoWindow().isOpen());
				if (oInfoWindow.privGetinfoWindow().isOpen()) {
					oInfoWindow.privSetAnchor(that);
					oInfoWindow.setContent(that);
				} else {
					oInfoWindow.privSetAnchor(null);
				}
			/*
			}).on("popupopen", function () {
				window.console.log("popupopen: " + that.getLabel() + " " + that.getPosition());
			}).on("popupclose", function () {
				window.console.log("popupclose: " + that.getLabel() + " " + that.getPosition());
			}).on("dragend", function () {
				window.console.log("dragend: " + that.getLabel() + " " + that.getPosition());
			*/
			}).on("dragstart", function (/* event */) {
				// window.console.log("dragstart: " + that.getLabel() + " " + that.getPosition());
				if (oInfoWindow.getAnchor() === that) {
					oInfoWindow.privGetinfoWindow().openOn(that.marker); // reopen during drag
				}
			}).on("drag", function (/* event */) {
				// window.console.log("drag: " + that.getLabel() + " " + that.getPosition());
				if (oInfoWindow.privGetinfoWindow().isOpen()) {
					if (oInfoWindow.getAnchor() === that) {
						oInfoWindow.setContent(that);
					}
				}
			});
		}
	},
	getPosition: function () {
		var oPos = this.marker.getLatLng();

		return MapProxy.Leaflet.leaflet2position(oPos);
	},
	setPosition: function (position) {
		var oInfoWindow = this.options.infoWindow,
			oInfoWindowMarker;

		this.marker.setLatLng(MapProxy.Leaflet.position2leaflet(position));

		if (oInfoWindow && oInfoWindow.privGetinfoWindow().isOpen() && oInfoWindow.getAnchor() !== this) {
			oInfoWindowMarker = oInfoWindow.getAnchor();
			oInfoWindowMarker.privGetMarker().setLatLng(oInfoWindowMarker.privGetMarker().getLatLng()); //fast hack: after each move reset position of marker with open popup
		}
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
			this.marker.addTo(map.privGetMap());
		} else if (this.map) {
			this.marker.removeFrom(this.map.privGetMap());
		}
		this.map = map;
	},
	privGetMarker: function () {
		return this.marker;
	}
};


MapProxy.Leaflet.Polyline = function (options) {
	this.init(options);
};

MapProxy.Leaflet.Polyline.prototype = {
	init: function (options) {
		var polylineOptions;

		this.options = Utils.objectAssign({
			strokeColor: "red",
			strokeWidth: 2,
			strokeOpacity: 0.7
		}, options);

		polylineOptions = {
			color: this.options.strokeColor, // default: #3388FF
			weight: this.options.strokeWidth, // default: 3
			opacity: this.options.strokeOpacity // default: 1
		};

		// https://stackoverflow.com/questions/32882523/how-to-apply-css-on-polylines-leaflet
		// https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Fills_and_Strokes
		// https://leafletjs.com/reference-1.3.4.html#path
		this.polyline = new L.Polyline([], polylineOptions);
	},
	setPath: function (path) {
		this.polyline.setLatLngs(path);
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		if (map) {
			this.polyline.addTo(map.privGetMap());
		} else if (this.map) {
			this.polyline.removeFrom(this.map.privGetMap());
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
	getAnchor: function () {
		return this.anchor;
	},
	privSetAnchor: function (marker) {
		this.anchor = marker;
	},
	open: function (map, marker) {
		this.infoWindow.open(map.privGetMap(), marker.privGetMarker());
	},
	close: function () {
		this.infoWindow.closePopup();
	},
	privGetinfoWindow: function () {
		return this.infoWindow;
	}
};
// end
