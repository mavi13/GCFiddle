// MapProxy.Simple.js - MapProxy.Simple for GCFiddle
//
/* globals MapProxy, Utils */ // make ESlint happy

"use strict";

MapProxy.Simple = {};

MapProxy.Simple.Map = function (options) {
	this.init(options);
};

MapProxy.Simple.Map.prototype = {
	init: function (options) {
		var sMapDivId, oView, mapDiv, bHidden, iWidth, iHeight, canvas, i;

		this.options = Utils.objectAssign({
			markerStyle: "green",
			textStyle: "black",
			backgroundStyle: "#E6E6E6",
			zoom: 0 // not used
		}, options);

		sMapDivId = this.options.mapDivId;
		oView = this.options.view;
		mapDiv = document.getElementById(sMapDivId);

		bHidden = oView.getHidden(sMapDivId);
		oView.setHidden(sMapDivId, false); // make sure canvas is not hidden (allows to get width, height)
		iWidth = mapDiv.clientWidth;
		iHeight = mapDiv.clientHeight;
		oView.setHidden(sMapDivId, bHidden); // restore hidden
		Utils.console.log("SimpleMap: width=" + iWidth + " height=" + iHeight + " created");

		this.oPixelMap = {
			width: iWidth,
			height: iHeight,
			scaleWidth: 8 / 10,
			scaleHeight: 8 / 10
			// will be extended by width, height; and latBottom, latTop, lngLeft, lngRight in fitBounds()
		};

		this.mElements = {
			path: [],
			marker: []
		};

		this.aCanvas = [];
		for (i = 0; i < 2; i += 1) {
			canvas = document.createElement("CANVAS");
			canvas.width = iWidth;
			canvas.height = iHeight;
			canvas.id = "simpleCanvas" + (i + 1);
			canvas.style.position = "absolute";
			mapDiv.appendChild(canvas);
			this.aCanvas.push(canvas);
		}

		this.featureGroup = new MapProxy.Simple.FeatureGroup({});

		if (this.options.onload) {
			this.options.onload(this);
		}
		document.getElementById("simpleCanvas2").addEventListener("click", this.onSimpleCanvas2Click.bind(this), false);
		if (window.addEventListener) { // not for old IE8 (on element window!)
			window.addEventListener("resize", this.fnDebounce(this.resize.bind(this), 200, false), false);
		}
	},
	onSimpleCanvas2Click: function (event) {
		var oTarget = event.target,
			x = event.clientX - oTarget.offsetLeft + window.scrollX, // x,y are relative to the canvas
			y = event.clientY - oTarget.offsetTop + window.scrollY;

		Utils.console.log("onSimpleCanvas2Click: x=" + x + ", y=" + y);
		if (event.stopPropagation) {
			event.stopPropagation();
		} else {
			event.cancelBubble = true;
		}
	},
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
	resize: function () {
		var sMapDivId = this.options.mapDivId,
			oView = this.options.view,
			bHidden = oView.getHidden(sMapDivId),
			mapDiv, iWidth, iHeight, i, canvas;

		if (bHidden) {
			return; // canvas is hidden
		}
		mapDiv = document.getElementById(sMapDivId); // mapCanvas-simple
		iWidth = mapDiv.clientWidth;
		iHeight = mapDiv.clientHeight;
		if (iWidth !== this.oPixelMap.width || iHeight !== this.oPixelMap.height) {
			Utils.console.log("MapProxy.Simple.resize width=" + iWidth + " height=" + iHeight);
			for (i = 0; i < this.aCanvas.length; i += 1) {
				canvas = this.aCanvas[i];
				if (canvas.width !== iWidth) {
					this.oPixelMap.width = iWidth;
					canvas.width = iWidth;
				}
				if (canvas.height !== iHeight) {
					this.oPixelMap.height = iHeight;
					canvas.height = iHeight;
				}
			}
			for (i = 0; i < this.mElements.path.length; i += 1) {
				this.privDrawPath(this.mElements.path[i]);
			}
			for (i = 0; i < this.mElements.marker.length; i += 1) {
				this.privDrawMarker(this.mElements.marker[i]);
			}
		}
	},
	getFeatureGroup: function () {
		return this.featureGroup;
	},
	setZoom: function (zoom) {
		this.zoom = zoom;
	},
	setCenter: function (/* position */) {
		// currently empty
	},
	// https://stackoverflow.com/questions/18838915/convert-lat-lon-to-pixel-coordinate
	// (stretched) Mercator projection
	// map={width, height, latBottom, latTop, lngLeft, lngRight}
	myConvertGeoToPixel: function (position, map) {
		var lat = Utils.toRadians(position.lat),
			lng = Utils.toRadians(position.lng),
			south = Utils.toRadians(map.latBottom),
			north = Utils.toRadians(map.latTop),
			west = Utils.toRadians(map.lngLeft),
			east = Utils.toRadians(map.lngRight),
			mercY = function (lat1) {
				return Math.log(Math.tan(lat1 / 2 + Math.PI / 4));
			},
			ymin = mercY(south),
			ymax = mercY(north),
			xFactor = map.width * map.scaleWidth / ((east - west) || 1),
			yFactor = map.height * map.scaleHeight / ((ymax - ymin) || 1),
			x, y;

		x = lng;
		y = mercY(lat);
		x = (x - west) * xFactor;
		y = (ymax - y) * yFactor; // y points south
		return {
			x: x,
			y: y
		};
	},
	privDrawPath: function (path, bRemove) {
		var pathStyle = {
				strokeColor: "red",
				strokeWidth: 2,
				strokeOpacity: 0.7
			},
			context, i, oPos,
			canvas = this.aCanvas[0];

		if (path.length) {
			if (!canvas.getContext) {
				Utils.console.warn("Browser does not support canvas.getContext()"); // e.g. IE8
				return;
			}
			context = canvas.getContext("2d");
			if (!bRemove) {
				context.save();
				context.translate((canvas.width - this.oPixelMap.width * this.oPixelMap.scaleWidth) / 2, (canvas.height - this.oPixelMap.height * this.oPixelMap.scaleHeight) / 2);
				context.strokeStyle = pathStyle.strokeColor;
				context.lineWidth = pathStyle.strokeWidth;
				context.beginPath();
				for (i = 0; i < path.length; i += 1) {
					oPos = this.myConvertGeoToPixel(path[i], this.oPixelMap);
					if (i === 0) {
						context.moveTo(oPos.x, oPos.y);
					} else {
						context.lineTo(oPos.x, oPos.y);
					}
				}
				context.stroke();
				context.restore();
			} else {
				context.clearRect(0, 0, canvas.width, canvas.height); // we simply clear all
			}
		}
	},
	privDrawMarker: function (marker, bRemove) {
		var context, oPos,
			strokeStyle = this.options.markerStyle,
			fillStyle = this.options.textStyle,
			iRadius = 10,
			iLineWidth = 1,
			canvas = this.aCanvas[1];

		oPos = this.myConvertGeoToPixel(marker.getPosition(), this.oPixelMap);

		if (!canvas.getContext) {
			Utils.console.warn("Browser does not support canvas.getContext()");
			return;
		}
		context = canvas.getContext("2d");
		context.save();
		context.translate((canvas.width - this.oPixelMap.width * this.oPixelMap.scaleWidth) / 2, (canvas.height - this.oPixelMap.height * this.oPixelMap.scaleHeight) / 2);
		if (!bRemove) {
			context.strokeStyle = strokeStyle;
			context.lineWidth = iLineWidth;
			context.textAlign = "center";
			context.textBaseline = "middle";
			context.font = "14px sans-serif";
			context.fillStyle = fillStyle;

			context.beginPath();
			context.arc(oPos.x, oPos.y, iRadius, 0, 2 * Math.PI);
			context.fillText(marker.getLabel(), oPos.x, oPos.y);
			context.stroke();
		} else {
			iRadius += Math.ceil(iLineWidth / 2);
			context.clearRect(oPos.x - iRadius, oPos.y - iRadius, iRadius * 2, iRadius * 2);
		}
		context.restore();
	},
	addPath: function (path) {
		if (path && path.length) {
			this.mElements.path.push(path);
			this.privDrawPath(path); // new path
		}
	},
	removePath: function (path) {
		var idx;

		idx = this.mElements.path.indexOf(path);
		if (idx >= 0) {
			this.mElements.path.splice(idx, 1);
			this.privDrawPath(path, true); // old path: background (draw over old path)
		}
	},
	addMarker: function (marker) {
		this.mElements.marker.push(marker);
		this.privDrawMarker(marker); // new path
	},
	removeMarker: function (marker) {
		var idx;

		idx = this.mElements.marker.indexOf(marker);
		if (idx >= 0) {
			this.mElements.marker.splice(idx, 1);
		}
		this.privDrawMarker(marker, true); // old path: background (draw over old path)
	},
	fitBounds: function (bounds) {
		var oBounds = bounds.getBounds(),
			aMarker = this.mElements.marker,
			oPixelMap = this.oPixelMap,
			bNeedUpdate = false,
			sKey, i;

		for (sKey in oBounds) {
			if (oBounds.hasOwnProperty(sKey)) {
				if (oBounds[sKey] !== oPixelMap[sKey]) {
					bNeedUpdate = true;
					break;
				}
			}
		}

		if (bNeedUpdate) { // redraw markers if bounds change
			for (i = 0; i < aMarker.length; i += 1) {
				this.privDrawMarker(aMarker[i], true); // old path: background (draw over old path)
			}
			Utils.objectAssign(this.oPixelMap, oBounds);
			for (i = 0; i < aMarker.length; i += 1) {
				this.privDrawMarker(aMarker[i]); // new path
			}
		}
	}
};


MapProxy.Simple.LatLngBounds = function (options) {
	this.init(options);
};

MapProxy.Simple.LatLngBounds.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({
			latBottom: Number.MAX_VALUE,
			latTop: Number.MIN_VALUE,
			lngLeft: Number.MAX_VALUE,
			lngRight: Number.MIN_VALUE
		}, options); // latBottom, latTop, lngLeft, lngRight
	},
	getBounds: function () {
		return this.options;
	},
	extend: function (position) {
		var oBounds = this.options;

		oBounds.latBottom = Math.min(oBounds.latBottom, position.lat);
		oBounds.latTop = Math.max(oBounds.latTop, position.lat);
		oBounds.lngLeft = Math.min(oBounds.lngLeft, position.lng);
		oBounds.lngRight = Math.max(oBounds.lngRight, position.lng);
	}
};


MapProxy.Simple.FeatureGroup = function (options) {
	this.init(options);
};

MapProxy.Simple.FeatureGroup.prototype = {
	init: function (options) {
		var oPolyLineOptions = {
			strokeColor: "red",
			strokeOpacity: 0.8,
			strokeWidth: 2
		};

		this.options = Utils.objectAssign({}, options);
		this.aMarkers = [];
		this.polyLine = new MapProxy.Simple.Polyline(oPolyLineOptions);
	},
	changeMarker: function (iMarker, oItem) {
		var aMarkers = this.aMarkers,
			oMarker, oPosition;

		oPosition = oItem.position.clone();
		oMarker = aMarkers[iMarker];
		oMarker.setLabel(oItem.label).setTitle(oItem.title).setPosition(oPosition);
	},
	addMarkers: function (aList) {
		var aMarkers = this.aMarkers,
			aPath = [],
			i, oItem, oPosition, oMarkerOptions, oMarker;

		for (i = 0; i < aList.length; i += 1) {
			oItem = aList[i];
			oPosition = oItem.position.clone();
			aPath.push(oPosition);
			if (i >= aMarkers.length) {
				oMarkerOptions = Utils.objectAssign({}, oItem, { // create a deep copy so we can modify the position
					position: oPosition
				});
				oMarker = new MapProxy.Simple.Marker(oMarkerOptions);
				aMarkers.push(oMarker);
			} else { // change marker
				oMarker = aMarkers[i];
				oMarker.setLabel(oItem.label).setTitle(oItem.title).setPosition(oPosition);
			}
		}
		this.polyLine.setPath(aPath);
	},
	deleteMarkers: function () {
		this.setMap(null);
		this.aMarkers = [];
		if (this.polyLine) {
			this.polyLine.setMap(null);
		}
	},
	fitBounds: function () {
		var aMarkers = this.aMarkers,
			oBounds, i;

		if (this.map) {
			if (this.aMarkers.length) {
				oBounds = new MapProxy.Simple.LatLngBounds();
				for (i = 0; i < aMarkers.length; i += 1) {
					oBounds.extend(aMarkers[i].getPosition());
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
	}
};


MapProxy.Simple.Marker = function (options) {
	this.init(options);
};

MapProxy.Simple.Marker.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({}, options); // position, title, label, map
	},
	getPosition: function () {
		return this.options.position;
	},
	setPosition: function (position) {
		if (String(this.options.position) !== String(position)) {
			if (this.map) {
				this.map.removeMarker(this); // remove old marker
			}
			this.options.position = position.clone();
			if (this.map) {
				this.map.addMarker(this); // draw new marker
			}
		}
	},
	getTitle: function () {
		return this.options.title;
	},
	setTitle: function (title) {
		if (this.options.title !== title) {
			this.options.title = title;
		}
		return this;
	},
	getLabel: function () {
		return this.options.label;
	},
	setLabel: function (label) {
		if (this.options.label !== label) {
			this.options.label = label;
		}
		return this;
	},
	setMap: function (map) {
		if (this.map) {
			this.map.removeMarker(this); // remove old marker
		}
		this.map = map;
		if (this.map) {
			this.map.addMarker(this); // draw new marker
		}
		return this;
	}
};


MapProxy.Simple.Polyline = function (options) {
	this.init(options);
};

MapProxy.Simple.Polyline.prototype = {
	init: function (options) {
		this.map = options.map;
		this.options = Utils.objectAssign({
			strokeColor: "red",
			strokeWidth: 2,
			strokeOpacity: 0.7
		}, options);
		// MyPolyline: options={map, strokeColor, strokeOpacity, strokeWeight}
	},
	setPath: function (path) {
		if (this.map) {
			if (this.path) {
				this.map.removePath(this.path); // remove old path
			}
			this.map.addPath(path); // add new path
		}
		this.path = path;
	},
	setMap: function (map) {
		if (this.map && this.path) {
			this.map.removePath(this.path); // remove old path
		}
		this.map = map;
		if (this.map && this.path) {
			this.map.addPath(this.path); // add new path
		}
	}
};

// end
