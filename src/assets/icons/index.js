import React from 'react';
import { SvgXml } from 'react-native-svg';

import LocationMarkerSvg from './svg/location-marker.svg';
import DestinationMarkerSvg from './svg/destination-marker.svg';
import OriginMarkerSvg from './svg/origin-marker.svg';

const createIconComponent = (SvgComponent) => {
  return ({ width = 24, height = 24, color = '#000', ...props }) => {
    return <SvgComponent width={width} height={height} color={color} {...props} />;
  };
};

export const LocationMarker = createIconComponent(LocationMarkerSvg);
export const DestinationMarker = createIconComponent(DestinationMarkerSvg);
export const OriginMarker = createIconComponent(OriginMarkerSvg);
