// MapProxy.OpenLayers.js - MapProxy for OpenLayers
// http://dev.openlayers.org/releases/OpenLayers-2.13.1/doc/apidocs/files/OpenLayers-js.html
//
/* globals MapProxy, Utils, LatLng, OpenLayers */ // make ESlint happy

"use strict";

MapProxy.OpenLayers = {
	position2openlayers: function (position) {
		var oPos = new OpenLayers.LonLat(position.lng, position.lat).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));

		return oPos;
	},
	openlayers2position: function (position) {
		var oPos = position.clone().transform(new OpenLayers.Projection("EPSG:900913"), new OpenLayers.Projection("EPSG:4326")); // transform back

		return new LatLng(oPos.lat, oPos.lon);
	}
};

MapProxy.OpenLayers.Map = function (options) {
	this.init(options);
};

MapProxy.OpenLayers.Map.prototype = {
	init: function (options) {
		var that = this,
			sProtocol, sUrl;

		this.options = Utils.objectAssign({ }, options);
		this.registeredMarkers = {};
		sProtocol = (window.location.protocol === "https:") ? window.location.protocol : "http:";
		sUrl = this.options.openlayersUrl.replace(/^http(s)?:/, sProtocol);
		Utils.loadScript(sUrl, function () {
			var mapDivId = that.options.mapDivId,
				bHidden;

			window.console.log("OpenLayers " + OpenLayers.VERSION_NUMBER + " loaded (" + sUrl + ")");
			bHidden = Utils.setHidden(mapDivId, false); // make sure canvas is not hidden
			that.map = new OpenLayers.Map(mapDivId, { });
			Utils.setHidden(mapDivId, bHidden); // restore
			that.doInit2();
			if (that.options.onload) {
				that.options.onload(that);
			}
		});
	},
	doInit2: function () {
		var that = this,
			oMarkers, oLines;

		oMarkers = new OpenLayers.Layer.Vector("Markers", {
			// http://docs.OpenLayers.org/library/feature_styling.html
			styleMap: new OpenLayers.StyleMap(
				{
					"default": {
						fillColor: "#FF5500",
						fillOpacity: 0.4,
						fontFamily: "Courier New, monospace",
						fontSize: "12px",
						fontWeight: "bold",
						label: "${label}",
						labelOutlineColor: "white",
						labelOutlineWidth: 3,
						pointRadius: 12,
						strokeColor: "#00FF00",
						strokeOpacity: 0.9,
						strokeWidth: 1,
						title: "${title}"
					},
					select: {
						strokeWidth: 3,
						pointRadius: 14
					}
				}
			)
		});

		oMarkers.events.on({
			featureselected: function (event) {
				var oInternalMarker = event.feature,
					oMarker, oInfoWindow;

				oMarker = that.privGetRegisteredMarker(oInternalMarker.id);
				oInfoWindow = oMarker.options.infoWindow;

				if (oInfoWindow) {
					oInfoWindow.setContent(oMarker);
					oInfoWindow.open(oMarker.getMap(), oMarker);
				}
			},
			featureunselected: function (event) {
				var oInternalMarker = event.feature,
					oMarker, oInfoWindow;

				oMarker = that.privGetRegisteredMarker(oInternalMarker.id);
				oInfoWindow = oMarker.options.infoWindow;
				if (oInfoWindow) {
					oInfoWindow.close();
				}
			}
		});

		oLines = new OpenLayers.Layer.Vector("Lines");

		this.map.addLayers([
			new OpenLayers.Layer.OSM("OSM", [ // use https now!
				"https://a.tile.openstreetmap.org/${z}/${x}/${y}.png",
				"https://b.tile.openstreetmap.org/${z}/${x}/${y}.png",
				"https://c.tile.openstreetmap.org/${z}/${x}/${y}.png"
			]),
			// new OpenLayers.Layer.OSM("OSM2", ["https://tile.openstreetmap.org/${z}/${x}/${y}.png"]), // also ok?
			new OpenLayers.Layer.OSM("OpenCycleMap", [ // needs also an API key
				"http://a.tile.opencyclemap.org/cycle/${z}/${x}/${y}.png",
				"http://b.tile.opencyclemap.org/cycle/${z}/${x}/${y}.png",
				"http://c.tile.opencyclemap.org/cycle/${z}/${x}/${y}.png"
			]),
			oMarkers,
			oLines
		]);

		this.map.addControls([
			new OpenLayers.Control.Navigation(),
			new OpenLayers.Control.Zoom(),
			new OpenLayers.Control.LayerSwitcher()
		]);

		if (OpenLayers.Control.DragFeature) { // add DragFeature before SelectFeature!
			this.map.addControl(new OpenLayers.Control.DragFeature(oMarkers, {
				autoActivate: true,
				onDrag: function (internalMarker) {
					var oMarker = that.privGetRegisteredMarker(internalMarker.id),
						oPosition = oMarker.getPosition(),
						oInfoWindow = oMarker.options.infoWindow;

					if (oInfoWindow && oInfoWindow.getAnchor() === oMarker) {
						oInfoWindow.setContent(oMarker);
						oInfoWindow.privSetPosition(oPosition);
					}
				}
			}));
		}

		this.map.addControl(new OpenLayers.Control.SelectFeature(
			oMarkers, {
				toggle: true,
				toggleKey: "ctrlKey",
				autoActivate: true
			}
		));

		if (OpenLayers.Control.KeyboardDefaults) {
			this.map.addControl(new OpenLayers.Control.KeyboardDefaults()); // not in OpenLayers.light version
		}
		if (OpenLayers.Control.OverviewMap) {
			this.map.addControl(new OpenLayers.Control.OverviewMap()); // not in OpenLayers.light version
		}
	},
	setCenter: function (position) {
		this.map.setCenter(MapProxy.OpenLayers.position2openlayers(position));
	},
	fitBounds: function (bounds) {
		return this.map.zoomToExtent(bounds.getBounds());
	},
	resize: function () {
		// maybe not needed
	},
	privGetMap: function () {
		return this.map;
	},
	privRegisterMarker: function (marker) {
		this.registeredMarkers[marker.privGetMarker().id] = marker;
	},
	privUnregisterMarker: function (marker) {
		delete this.registeredMarkers[marker.privGetMarker().id];
	},
	privGetRegisteredMarker: function (id) {
		return this.registeredMarkers[id];
	}
};


MapProxy.OpenLayers.LatLngBounds = function (options) {
	this.init(options);
};

MapProxy.OpenLayers.LatLngBounds.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({	}, options);
		this.bounds = new OpenLayers.Bounds(options);
	},
	getBounds: function () {
		return this.bounds;
	},
	extend: function (position) {
		this.bounds.extend(MapProxy.OpenLayers.position2openlayers(position));
	}
};


//TODO experimental
MapProxy.OpenLayers.FeatureGroup = function (options) {
	this.init(options);
};

MapProxy.OpenLayers.FeatureGroup.prototype = {
	init: function (options) {
		var oPolyLineOptions = {
			strokeColor: "red",
			strokeOpacity: 0.8,
			strokeWidth: 2
		};

		this.options = Utils.objectAssign({	}, options);
		this.aMarkers = [];
		this.polyLine = new MapProxy.OpenLayers.Polyline(oPolyLineOptions);
		this.infoWindow = new MapProxy.OpenLayers.InfoWindow({
			onGetInfoWindowContent: this.testClosure1()
		});
	},
	addMarkers: function (aList) {
		//OpenLayers.Geometry.Collection() //???
		var aMarkers = this.aMarkers,
			aPath = [],
			oMarkerOptions, i, oItem, oPosition, oMarker;

		for (i = 0; i < aList.length; i += 1) {
			oItem = aList[i];
			oPosition = oItem.position; //MapProxy.Leaflet.position2leaflet(oItem.position);
			aPath.push(oPosition);
			if (i >= aMarkers.length) {
				//oMarker = new MapProxy.OpenLayers.Marker(Utils.objectAssign({ infoWindow : this.map.oPopup }, oItem));
				oMarkerOptions = Utils.objectAssign(oItem, {
					infoWindow: this.infoWindow
				}, oItem);
				oMarker = new MapProxy.OpenLayers.Marker(oMarkerOptions);
				aMarkers.push(oMarker);
			} else { // adapt existing marker
				oMarker = aMarkers[i];
				//oMarker.label = oItem.label;
				//oMarker.title = oItem.title;
				//oMarker.position = oPosition;
				oMarker.setLabel(oItem.label);
				oMarker.setTitle(oItem.title);
				oMarker.setPosition(oPosition);
				if (this.infoWindow && this.infoWindow.getAnchor() === oMarker) {
					this.infoWindow.setContent(oMarker);
				}
			}
		}

		if (this.polyLine) {
			this.polyLine.setPath(aPath);
		}
	},
	deleteMarkers: function () {
		var aMarkers = this.aMarkers,
			i, oMarker;

		this.setMap(null);
		for (i = 0; i < aMarkers.length; i += 1) {
			oMarker = aMarkers[i];
			if (oMarker && oMarker.destroy) { // needed for OpenLayers?
				oMarker.destroy();
			}
			aMarkers[i] = null;
		}
		this.aMarkers = [];
		if (this.polyLine) {
			this.polyLine.setMap(null);
		}
	},
	fitBounds: function () {
		var oBounds, i;

		if (this.map) {
			if (this.aMarkers.length) {
				oBounds = new MapProxy.OpenLayers.LatLngBounds();

				for (i = 0; i < this.aMarkers.length; i += 1) {
					oBounds.extend(this.aMarkers[i].getPosition());
				}
				this.map.fitBounds(oBounds);
			}
		}
	},
	setMap: function (map) {
		var aMarkers = this.aMarkers,
			i, oMarker;

		this.map = map;
		if (map) {
			this.fitBounds();
			this.polyLine.setMap(map);
		}
		for (i = 0; i < aMarkers.length; i += 1) {
			oMarker = aMarkers[i];
			oMarker.setMap(map);
		}
	},
	testClosure1: function () {
		var that = this,
			privGetInfoWindowContent = function (marker) {
				var oSimpleMarker,
					aMarkers = that.aMarkers,
					oPreviousMarker, oPreviousSimpleMarker, sContent, iIndex;

				oSimpleMarker = {
					title: marker.getTitle(), // title
					position: marker.getPosition() //MapProxy.OpenLayers.openlayers2position(marker.getPosition())
				};
				//aMarkers = oFeatureGroup.getLayers();
				iIndex = aMarkers.indexOf(marker);
				if (iIndex >= 1) { // not the first one?
					oPreviousMarker = aMarkers[iIndex - 1];
					oPreviousSimpleMarker = {
						title: oPreviousMarker.getTitle(), // title
						position: oPreviousMarker.getPosition()
					};
				}
				sContent = that.privGetInfoWindowContent2(oSimpleMarker, oPreviousSimpleMarker);
				return sContent;
			};

		return privGetInfoWindowContent;
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
	deleteFeatureGroup: function () {
		this.deleteMarkers();
		if (this.polyLine && this.polyLine.destroy) { // needed for OpenLayers?
			this.polyLine.destroy();
		}
		this.polyLine = null;
		if (this.infoWindow) {
			this.infoWindow.close();
			this.infoWindow = null;
		}
	}
};


MapProxy.OpenLayers.Marker = function (options) {
	this.init(options);
};

MapProxy.OpenLayers.Marker.prototype = {
	init: function (options) {
		var oPosition, oTransformedPosition;

		this.options = Utils.objectAssign({	}, options);
		oPosition = this.options.position;
		oTransformedPosition = new OpenLayers.LonLat(oPosition.lng, oPosition.lat).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));

		this.marker = new OpenLayers.Feature.Vector(
			new OpenLayers.Geometry.Point(oTransformedPosition.lon, oTransformedPosition.lat),
			{ // attributes
				position: oPosition,
				title: this.options.title,
				label: this.options.label
			}
		);
		this.map = options.map;
		if (this.map) {
			this.map.registeredMarker(this);
		}
	},
	getTitle: function () {
		return this.marker.attributes.title;
	},
	setTitle: function (title) {
		this.marker.attributes.title = title;
	},
	getLabel: function () {
		return this.marker.attributes.label;
	},
	setLabel: function (label) {
		this.marker.attributes.label = label;
	},
	getPosition: function () {
		var oPos = this.marker.geometry;

		oPos = new OpenLayers.LonLat(oPos.x, oPos.y); // transformed position
		return MapProxy.OpenLayers.openlayers2position(oPos);
	},
	setPosition: function (position) {
		var oLonLat = MapProxy.OpenLayers.position2openlayers(position),
			oInfoWindow = this.options.infoWindow;

		this.marker.move(oLonLat);
		if (oInfoWindow && oInfoWindow.getAnchor() === this) {
			oInfoWindow.privSetPosition(position);
		}
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		var oMarkers, oInfoWindow;

		if (map) {
			oMarkers = map.privGetMap().getLayersByName("Markers")[0];
			oMarkers.addFeatures(this.marker);
			map.privRegisterMarker(this);
		} else if (this.map) { // delete map?
			oMarkers = this.map.privGetMap().getLayersByName("Markers")[0];
			oMarkers.removeFeatures(this.marker);
			this.map.privUnregisterMarker(this);
			oInfoWindow = this.options.infoWindow;
			if (oInfoWindow && oInfoWindow.getAnchor() === this) {
				oInfoWindow.close();
			}
		}
		this.map = map;
	},
	privGetMarker: function () {
		return this.marker;
	},
	destroy: function () {
		this.marker.destroy();
	}
};


MapProxy.OpenLayers.Polyline = function (options) {
	this.init(options);
};

MapProxy.OpenLayers.Polyline.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({
			clickable: true
			// strokeColor: "red",
			// strokeOpacity: 0.8,
			// strokeWidth: 2
		}, options);
		this.polyline = new OpenLayers.Geometry.LineString(this.options);
		this.map = options.map;
	},
	setPath: function (aList) {
		var oPosition, oPoint, i;

		for (i = 0; i < aList.length; i += 1) {
			oPosition = MapProxy.OpenLayers.position2openlayers(aList[i]);
			if (i >= this.polyline.components.length) {
				this.polyline.addPoint(new OpenLayers.Geometry.Point(oPosition.lon, oPosition.lat));
			} else {
				oPoint = this.polyline.components[i];
				oPoint.move(oPosition.lon - oPoint.x, oPosition.lat - oPoint.y);
			}
		}
		if (this.map) {
			this.map.privGetMap().getLayersByName("Lines")[0].redraw();
		}
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		var oLines,	oFeature;

		if (map) {
			oFeature = new OpenLayers.Feature.Vector(this.polyline, {}, this.options);
			oLines = map.privGetMap().getLayersByName("Lines")[0];
			oLines.addFeatures(oFeature);
		} else if (this.map) {
			oLines = this.map.privGetMap().getLayersByName("Lines")[0];
			oLines.removeAllFeatures();
		}
		this.map = map;
	},
	destroy: function () {
		this.polyline.destroy();
	}
};


MapProxy.OpenLayers.InfoWindow = function (options) {
	this.init(options);
};

MapProxy.OpenLayers.InfoWindow.prototype = {
	init: function (options) {
		var that = this,
			fncloseBoxCallback = function (event) {
				that.close();
				OpenLayers.Event.stop(event);
			};

		this.options = Utils.objectAssign({	}, options);
		this.infoWindow = new OpenLayers.Popup.FramedCloud(null, null, null, null, null, true, fncloseBoxCallback);
	},
	setContent: function (marker) {
		var sContent = this.options.onGetInfoWindowContent ? this.options.onGetInfoWindowContent(marker) : "";

		this.infoWindow.setContentHTML('<div style="font-size:.8em">' + sContent + "</div>");
	},
	privSetPosition: function (lonlat) {
		this.infoWindow.lonlat = MapProxy.OpenLayers.position2openlayers(lonlat);
		this.infoWindow.updatePosition();
	},
	open: function (map, marker) {
		this.anchor = marker;
		this.infoWindow.lonlat = OpenLayers.LonLat.fromString(marker.privGetMarker().geometry.toShortString());
		map.privGetMap().addPopup(this.infoWindow);
		this.infoWindow.updateSize();
		this.map = map;
	},
	getAnchor: function () {
		return this.anchor;
	},
	close: function () {
		this.anchor = null;
		if (this.map) {
			this.map.privGetMap().removePopup(this.infoWindow);
		}
	}
	// destroy not needed for infoWindow because requires blocks to remove
};
// end
