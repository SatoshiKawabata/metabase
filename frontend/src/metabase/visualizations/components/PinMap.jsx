/* eslint-disable react/prop-types */
import React, { Component } from "react";
import { t } from "ttag";
import { hasLatitudeAndLongitudeColumns } from "metabase/lib/schema_metadata";
import { LatitudeLongitudeError } from "metabase/visualizations/lib/errors";

import LeafletMarkerPinMap from "./LeafletMarkerPinMap";
import LeafletTilePinMap from "./LeafletTilePinMap";
import LeafletHeatMap from "./LeafletHeatMap";
import LeafletGridHeatMap from "./LeafletGridHeatMap";

import _ from "underscore";
import cx from "classnames";
import d3 from "d3";

import L from "leaflet";

const WORLD_BOUNDS = [
  [-90, -180],
  [90, 180],
];

const MAP_COMPONENTS_BY_TYPE = {
  markers: LeafletMarkerPinMap,
  tiles: LeafletTilePinMap,
  heat: LeafletHeatMap,
  grid: LeafletGridHeatMap,
};

export default class PinMap extends Component {
  static uiName = t`Pin Map`;
  static identifier = "pin_map";
  static iconName = "pinmap";

  static isSensible({ cols, rows }) {
    return hasLatitudeAndLongitudeColumns(cols);
  }

  static checkRenderable([
    {
      data: { cols, rows },
    },
  ]) {
    if (!hasLatitudeAndLongitudeColumns(cols)) {
      throw new LatitudeLongitudeError();
    }
  }

  state;
  _map = null;

  constructor(props) {
    super(props);
    this.state = {
      lat: null,
      lng: null,
      zoom: null,
      filtering: false,
      ...this._getPoints(props),
    };
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    const SETTINGS_KEYS = [
      "map.latitude_column",
      "map.longitude_column",
      "map.metric_column",
    ];
    if (
      newProps.series[0].data !== this.props.series[0].data ||
      !_.isEqual(
        _.pick(newProps.settings, ...SETTINGS_KEYS),
        _.pick(this.props.settings, ...SETTINGS_KEYS),
      )
    ) {
      this.setState(this._getPoints(newProps));
    }
  }

  updateSettings = () => {
    const newSettings = {};
    if (this.state.lat != null) {
      newSettings["map.center_latitude"] = this.state.lat;
    }
    if (this.state.lng != null) {
      newSettings["map.center_longitude"] = this.state.lng;
    }
    if (this.state.zoom != null) {
      newSettings["map.zoom"] = this.state.zoom;
    }
    this.props.onUpdateVisualizationSettings(newSettings);
    this.setState({ lat: null, lng: null, zoom: null });
  };

  onMapCenterChange = (lat, lng) => {
    this.setState({ lat, lng });
  };

  onMapZoomChange = zoom => {
    this.setState({ zoom });
  };

  _getPoints(props) {
    const {
      settings,
      series: [
        {
          data: { cols, rows },
        },
      ],
      onUpdateWarnings,
    } = props;
    const latitudeIndex = _.findIndex(
      cols,
      col => col.name === settings["map.latitude_column"],
    );
    const longitudeIndex = _.findIndex(
      cols,
      col => col.name === settings["map.longitude_column"],
    );
    const metricIndex = _.findIndex(
      cols,
      col => col.name === settings["map.metric_column"],
    );
    const createdAtIndex = _.findIndex(
      cols,
      col => col.name === settings["map.created_at_column"],
    );

    const allPoints = rows.map(row => [
      row[latitudeIndex],
      row[longitudeIndex],
      metricIndex >= 0 ? row[metricIndex] : 1,
    ]);

    // Set current time defaultly
    const targetDateStr = new Date().toISOString();
    const createdAtDates = rows.map(row => row[createdAtIndex]);
    const targetDateIndex = getSpecificDateTimeIndex(
      targetDateStr,
      createdAtDates,
    );
    const currentRow = rows[targetDateIndex];
    const currentPoint = [
      currentRow[latitudeIndex],
      currentRow[longitudeIndex],
    ];

    // only use points with numeric coordinates & metric
    const points = allPoints.filter(
      ([lat, lng, metric]) => lat != null && lng != null && metric != null,
    );

    const warnings = [];
    const filteredRows = allPoints.length - points.length;
    if (filteredRows > 0) {
      warnings.push(
        t`We filtered out ${filteredRows} row(s) containing null values.`,
      );
    }
    if (onUpdateWarnings && warnings) {
      onUpdateWarnings(warnings);
    }

    const bounds = L.latLngBounds(points.length > 0 ? points : WORLD_BOUNDS);

    const min = d3.min(points, point => point[2]);
    const max = d3.max(points, point => point[2]);

    const binWidth =
      cols[longitudeIndex] &&
      cols[longitudeIndex].binning_info &&
      cols[longitudeIndex].binning_info.bin_width;
    const binHeight =
      cols[latitudeIndex] &&
      cols[latitudeIndex].binning_info &&
      cols[latitudeIndex].binning_info.bin_width;

    if (binWidth != null) {
      bounds._northEast.lng += binWidth;
    }
    if (binHeight != null) {
      bounds._northEast.lat += binHeight;
    }

    return { points, bounds, min, max, binWidth, binHeight, currentPoint };
  }

  render() {
    const { className, settings, isEditing, isDashboard } = this.props;
    const { lat, lng, zoom } = this.state;
    const disableUpdateButton = lat == null && lng == null && zoom == null;

    const Map = MAP_COMPONENTS_BY_TYPE[settings["map.pin_type"]];

    const {
      points,
      bounds,
      min,
      max,
      binHeight,
      binWidth,
      currentPoint,
    } = this.state;

    return (
      <div
        className={cx(
          className,
          "PinMap relative hover-parent hover--visibility",
        )}
        onMouseDownCapture={e => e.stopPropagation() /* prevent dragging */}
      >
        {Map ? (
          <Map
            {...this.props}
            ref={map => (this._map = map)}
            className="absolute top left bottom right z1"
            onMapCenterChange={this.onMapCenterChange}
            onMapZoomChange={this.onMapZoomChange}
            lat={lat}
            lng={lng}
            zoom={zoom}
            points={points}
            bounds={bounds}
            min={min}
            max={max}
            binWidth={binWidth}
            binHeight={binHeight}
            onFiltering={filtering => this.setState({ filtering })}
            currentPoint={currentPoint}
          />
        ) : null}
        <div className="absolute top right m1 z2 flex flex-column hover-child">
          {isEditing || !isDashboard ? (
            <div
              className={cx("PinMapUpdateButton Button Button--small mb1", {
                "PinMapUpdateButton--disabled": disableUpdateButton,
              })}
              onClick={this.updateSettings}
            >
              {t`Save as default view`}
            </div>
          ) : null}
          {!isDashboard && (
            <div
              className={cx("PinMapUpdateButton Button Button--small mb1")}
              onClick={() => {
                if (
                  !this.state.filtering &&
                  this._map &&
                  this._map.startFilter
                ) {
                  this._map.startFilter();
                } else if (
                  this.state.filtering &&
                  this._map &&
                  this._map.stopFilter
                ) {
                  this._map.stopFilter();
                }
              }}
            >
              {!this.state.filtering ? t`Draw box to filter` : t`Cancel filter`}
            </div>
          )}
        </div>
      </div>
    );
  }
}

function getSpecificDateTimeIndex(targetDateStr, dates) {
  const targetDate = new Date(targetDateStr);
  const targetDateTime = targetDate.getTime();
  const targetDateIndex = dates.reduce((currentIndex, dateStr, index) => {
    const dateTime = new Date(dateStr).getTime();
    if (dateTime <= targetDateTime) {
      const currentDateTime = new Date(dates[currentIndex]).getTime();
      const diff = Math.abs(targetDateTime - dateTime);
      const currentDiff = Math.abs(targetDateTime - currentDateTime);
      if (diff < currentDiff) {
        return index;
      }
    }
    return currentIndex;
  }, 0);
  return targetDateIndex;
}
