// MapProxy.Simple.js - MapProxy.Simple for GCFiddle
//
/* globals MapProxy, Utils */ // make ESlint happy

"use strict";

MapProxy.Simple = { };

MapProxy.Simple.Map = function (options) {
	this.init(options);
};

MapProxy.Simple.Map.prototype = {
	init: function (options) {
		var mapDiv, bHidden, iWidth, iHeight, canvas, i;

		this.options = Utils.objectAssign({
			markerStyle: "green",
			textStyle: "black",
			backgroundStyle: "#E6E6E6",
			zoom: 0 // not used
		}, options);

		mapDiv = document.getElementById(this.options.mapDivId);

		bHidden = Utils.setHidden(this.options.mapDivId, false); // make sure canvas is not hidden (allows to get width, height)
		iWidth = mapDiv.clientWidth;
		iHeight = mapDiv.clientHeight;
		Utils.setHidden(this.options.mapDivId, bHidden); // restore
		window.console.log("SimpleMap: width=" + iWidth + " height=" + iHeight + " created");

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

		/*
		this.oPixelMap = {
			width: iWidth * 8 / 10,
			height: iHeight * 8 / 10
			// will be extended by latBottom, latTop, lngLeft, lngRight in fitBounds()
		};
		*/
		if (this.options.onload) {
			this.options.onload(this);
		}
		document.getElementById("simpleCanvas2").addEventListener("click", this.onSimpleCanvas2Click.bind(this), false);
		window.addEventListener("resize", this.fnDebounce(this.resize.bind(this), 200, false), false);
	},
	onSimpleCanvas2Click: function (event) {
		var oTarget = event.target,
			x = event.clientX - oTarget.offsetLeft + window.scrollX, // x,y are relative to the canvas
			y = event.clientY - oTarget.offsetTop + window.scrollY;

		window.console.log("onSimpleCanvas2Click: x=" + x + ", y=" + y);
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
	/*
	onSimpleCanvas2Resize: function (event) {
		//window.console.log("onSimpleCanvas2Resize");
		this.resize();
	},
	*/
	resize: function () {
		var mapDiv = document.getElementById(this.options.mapDivId), // mapCanvas-simple
			iWidth = mapDiv.clientWidth,
			iHeight = mapDiv.clientHeight,
			i, canvas;

		if (iWidth !== this.oPixelMap.width || iHeight !== this.oPixelMap.height) {
			window.console.log("MapProxy.Simple.resize width=" + iWidth + " height=" + iHeight);
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
			x,
			y;

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
				window.console.warn("Browser does not support canvas.getContext()");
				return;
			}
			//pathStyle = path.pathStyle;
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
			strokeStyle = marker.markerStyle || this.options.markerStyle,
			fillStyle = marker.textStyle || this.options.textStyle,
			iRadius = 10,
			iLineWidth = 1,
			canvas = this.aCanvas[1];

		oPos = this.myConvertGeoToPixel(marker.position, this.oPixelMap);

		if (!canvas.getContext) {
			window.console.warn("Browser does not support canvas.getContext()");
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
			context.fillText(marker.label, oPos.x, oPos.y);
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
		var oBounds = bounds.getBounds();

		// We do no redraw here. Please clear, redraw if needed
		Utils.objectAssign(this.oPixelMap, oBounds);
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


//TODO experimental
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

		this.options = Utils.objectAssign({	}, options);
		this.aMarkers = [];
		this.polyLine = new MapProxy.Simple.Polyline(oPolyLineOptions);
		//this.polyLine.setMap(mapProxy.getMap());
	},
	addMarkers: function (aList) {
		var aMarkers = this.aMarkers,
			aPath = [],
			i, oItem, oPosition, oMarker;

		for (i = 0; i < aList.length; i += 1) {
			oItem = aList[i];
			oPosition = oItem.position; //MapProxy.Leaflet.position2leaflet(oItem.position);
			aPath.push(oPosition);
			if (i >= aMarkers.length) {
				oMarker = new MapProxy.Simple.Marker(oItem);
				aMarkers.push(oMarker);
			} else {
				oMarker = aMarkers[i];
				oMarker.label = oItem.label;
				oMarker.title = oItem.title;
				oMarker.position = oPosition;
			}
		}

		this.polyLine.setPath(aPath);
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
	getMapXX: function () {
		return this.map;
	},
	setMap: function (map) {
		var aMarkers = this.aMarkers,
			i, oMarker;

		this.map = map;
		if (map) {
			this.fitBounds(); //TTT
			this.polyLine.setMap(map);
		}
		for (i = 0; i < aMarkers.length; i += 1) {
			oMarker = aMarkers[i];
			//if (oMarker && oMarker.getMap() !== map) {
				oMarker.setMap(map);
			//}
			if (map) {
				/*
				oBounds = this.featureGroup.getBounds();
				if (oBounds.isValid()) {
					map.privGetMap().fitBounds(oBounds, {
						padding: [10, 10] // eslint-disable-line array-element-newline
					});
				} else {
					window.console.warn("bounds are not vaild."); //TTT
				}
				//this.featureGroup.addTo(map.privGetMap());
				*/
			} else if (this.map) {
				//this.featureGroup.removeFrom(this.map.privGetMap());
			}
		}
		//this.map = map;
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


MapProxy.Simple.Marker = function (options) {
	this.init(options);
};

MapProxy.Simple.Marker.prototype = {
	init: function (options) {
		/* TTT
		this.markerStyle = {
		};
		this.textStyle = {
		};
		*/
		Utils.objectAssign(this, options); // position, title, label, map
	},
	getPosition: function () {
		return this.position;
	},
	setPosition: function (position) {
		if (this.position.lat !== position.lat || this.position.lng !== position.lng) {
			if (this.map) {
				this.map.removeMarker(this); // remove old marker
			}
			this.position = position;
			if (this.map) {
				this.map.addMarker(this); // draw new marker
			}
		}
	},
	getTitle: function () {
		return this.title;
	},
	setTitle: function (title) {
		this.title = title;
	},
	getLabel: function () {
		return this.label;
	},
	setLabel: function (label) {
		this.label = label;
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		if (this.map) {
			this.map.removeMarker(this); // remove old marker
		}
		this.map = map;
		if (this.map) {
			this.map.addMarker(this); // draw new marker
		}
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
		// MyPolyline: options={map, [strokeColor, strokeOpacity, strokeWeight]}
	},
	setPath: function (path) {
		if (this.map) {
			if (this.path) {
				this.map.removePath(this.path); // remove old path
			}
			/* TTT
			if (!path.style) {
				path.pathStyle = this.options; // modify path, memorize path style!
			}
			*/
			this.map.addPath(path); // add new path
		}
		this.path = path;
	},
	getMap: function () {
		return this.map;
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


MapProxy.Simple.InfoWindow = function (options) { // not yet implemented
	this.init(options);
};

MapProxy.Simple.InfoWindow.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({}, options);
	},
	setContent: function (path) {
		this.path = path;
	},
	getAnchor: function () {
		return this.anchor;
	},
	open: function (map, marker) {
		this.anchor = marker;
	},
	close: function () {
		this.anchor = null;
	}
};
// end
