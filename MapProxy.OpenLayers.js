// MapProxy.OpenLayers.js - MapProxy for OpenLayers
//
/* globals window, document, OpenLayers MapProxy */ // make ESlint happy

"use strict";

MapProxy.OpenLayers = { };

// Special OpenLayers Map
MapProxy.OpenLayers.Map = function (mapCanvasId, settings, callbacks) {
	OpenLayers.Map.call(this, mapCanvasId, settings);
	this.gcInit(callbacks);
};

MapProxy.OpenLayers.Map.prototype = Object.create(OpenLayers.Map.prototype);

MapProxy.OpenLayers.Map.prototype.gcInit = function (callbacks) {
	var oMarkers, oLines;

	oMarkers = new OpenLayers.Layer.Vector("Markers", {
		// http://docs.openlayers.org/library/feature_styling.html
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
		featureselected: callbacks.onFeatureselected,
		featureunselected: callbacks.onFeatureunselected
	});

	oLines = new OpenLayers.Layer.Vector("Lines");

	this.addLayers([
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

	this.addControls([
		new OpenLayers.Control.Navigation(),
		new OpenLayers.Control.Zoom(),
		new OpenLayers.Control.LayerSwitcher()
	]);

	if (OpenLayers.Control.DragFeature) { // add DragFeature before SelectFeature!
		this.addControl(new OpenLayers.Control.DragFeature(oMarkers, {
			autoActivate: true,
			onDrag: callbacks.onDrag
		}));
	}

	this.addControl(new OpenLayers.Control.SelectFeature(
		oMarkers, {
			toggle: true,
			toggleKey: "ctrlKey",
			autoActivate: true
		}
	));

	if (OpenLayers.Control.KeyboardDefaults) {
		this.addControl(new OpenLayers.Control.KeyboardDefaults()); // not in OpenLayers.light version
	}
	if (OpenLayers.Control.OverviewMap) {
		this.addControl(new OpenLayers.Control.OverviewMap()); // not in OpenLayers.light version
	}
};

MapProxy.OpenLayers.Map.prototype.getDiv = function () {
	return this.div;
};

MapProxy.OpenLayers.Map.prototype.fitBounds = function (bounds) {
	return this.zoomToExtent(bounds);
};


// Special OpenLayers Marker
MapProxy.OpenLayers.Marker = function (settings) {
	var oPosition = new OpenLayers.LonLat(settings.position.lng, settings.position.lat).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));

	OpenLayers.Feature.Vector.call(this,
		new OpenLayers.Geometry.Point(oPosition.lon, oPosition.lat),
		{ // attributes
			position: settings.position,
			title: settings.title,
			label: settings.label
		}
	);
	this.map = settings.map;
};

MapProxy.OpenLayers.Marker.prototype = Object.create(OpenLayers.Feature.Vector.prototype);

MapProxy.OpenLayers.Marker.prototype.getTitle = function () {
	return this.attributes.title;
};

MapProxy.OpenLayers.Marker.prototype.setTitle = function (title) {
	this.attributes.title = title;
};

MapProxy.OpenLayers.Marker.prototype.getLabel = function () {
	return this.attributes.label;
};

MapProxy.OpenLayers.Marker.prototype.setLabel = function (label) {
	this.attributes.label = label;
};

MapProxy.OpenLayers.Marker.prototype.getSimplePosition = function () {
	return this.attributes.position;
};

MapProxy.OpenLayers.Marker.prototype.setSimplePosition = function (position) {
	this.attributes.position = position;
};

MapProxy.OpenLayers.Marker.prototype.getPosition = function () {
	return new OpenLayers.LonLat(this.geometry.x, this.geometry.y); // tansformed position
};

MapProxy.OpenLayers.Marker.prototype.setPosition = function (position) {
	var oLonLat = new OpenLayers.LonLat(position.lng, position.lat).transform(new OpenLayers.Projection("EPSG:4326"), this.map.getProjectionObject()),
		oInfoWindow;

	this.move(oLonLat);
	this.setSimplePosition(position);

	oInfoWindow = this.map && this.map.popups[0];
	if (oInfoWindow && oInfoWindow.getAnchor() === this) {
		oInfoWindow.setPosition(oLonLat);
	}
};

MapProxy.OpenLayers.Marker.prototype.getMap = function () {
	return this.map;
};

MapProxy.OpenLayers.Marker.prototype.setMap = function (map) {
	var oMarkers, oInfoWindow;

	if (map) {
		oMarkers = map.getLayersByName("Markers")[0];
		oMarkers.addFeatures(this);
	} else if (this.map) { // delete map?
		oMarkers = this.map.getLayersByName("Markers")[0];
		oMarkers.removeFeatures(this);
		oInfoWindow = this.map.popups[0];
		if (oInfoWindow && oInfoWindow.getAnchor() === this) {
			oInfoWindow.close();
		}
	}
	this.map = map;
};


// Special OpenLayers Polyline
MapProxy.OpenLayers.Polyline = function (settings) {
	OpenLayers.Geometry.LineString.call(this);
	this.settings1 = settings;
	this.map = settings.map;
};

MapProxy.OpenLayers.Polyline.prototype = Object.create(OpenLayers.Geometry.LineString.prototype);

MapProxy.OpenLayers.Polyline.prototype.setPath = function (aList) {
	var oPosition,
		oPoint,
		i;

	for (i = 0; i < aList.length; i += 1) {
		oPosition = aList[i];
		if (i >= this.components.length) {
			this.addPoint(new OpenLayers.Geometry.Point(oPosition.lon, oPosition.lat));
		} else {
			oPoint = this.components[i];
			oPoint.move(oPosition.lon - oPoint.x, oPosition.lat - oPoint.y);
		}
	}
	if (this.map) {
		this.map.getLayersByName("Lines")[0].redraw();
	}
};

MapProxy.OpenLayers.Polyline.prototype.getMap = function () {
	return this.map;
};

MapProxy.OpenLayers.Polyline.prototype.setMap = function (map) {
	var oLines,	oFeature;

	if (map) {
		oFeature = new OpenLayers.Feature.Vector(this, {}, this.settings1);
		oLines = map.getLayersByName("Lines")[0];
		oLines.addFeatures(oFeature);
	} else if (this.map) {
		oLines = this.map.getLayersByName("Lines")[0];
		oLines.removeAllFeatures();
	}
	this.map = map;
};


// Special OpenLayers InfoWindow
MapProxy.OpenLayers.InfoWindow = function () {
	var that = this,
		fncloseBoxCallback = function(event) {
			that.close();
			OpenLayers.Event.stop(event);
		};

	OpenLayers.Popup.FramedCloud.call(this, null, null, null, null, null, true, fncloseBoxCallback);
};

MapProxy.OpenLayers.InfoWindow.prototype = Object.create(OpenLayers.Popup.FramedCloud.prototype);

MapProxy.OpenLayers.InfoWindow.prototype.setContent = function(content) {
	this.setContentHTML('<div style="font-size:.8em">' + content + "</div>");
};

MapProxy.OpenLayers.InfoWindow.prototype.setPosition = function (lonlat) {
	this.lonlat = lonlat;
	this.updatePosition();
};

MapProxy.OpenLayers.InfoWindow.prototype.open = function (map, marker) {
	this.anchor1 = marker;
	this.lonlat = OpenLayers.LonLat.fromString(marker.geometry.toShortString());
	map.addPopup(this);
	this.updateSize();
};

MapProxy.OpenLayers.InfoWindow.prototype.getMap = function() {
	return this.map;
};

MapProxy.OpenLayers.InfoWindow.prototype.getAnchor = function() {
	return this.anchor1;
};

MapProxy.OpenLayers.InfoWindow.prototype.close = function () {
	this.anchor1 = null;
	if (this.map) {
		this.map.removePopup(this);
	}
};
// end
