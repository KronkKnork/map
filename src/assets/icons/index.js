import React from 'react';
import { SvgXml } from 'react-native-svg';

import LocationMarkerSvg from './svg/location-marker.svg';
import DestinationMarkerSvg from './svg/destination-marker.svg';
import OriginMarkerSvg from './svg/origin-marker.svg';
import ArrowRightSvg from './svg/arrow-right.svg';
import ArrowLeftSvg from './svg/arrow-left.svg';
import SwapSvg from './svg/swap.svg';
import OptionsSvg from './svg/options.svg';
import CloseNavSvg from './svg/close-nav.svg';
import ArrowLeftWhiteSvg from './svg/arrow-left-white.svg';

const createIconComponent = (SvgComponent) => {
  return ({ width = 24, height = 24, color = '#000', ...props }) => {
    return <SvgComponent width={width} height={height} color={color} {...props} />;
  };
};

export const LocationMarker = createIconComponent(LocationMarkerSvg);
export const DestinationMarker = createIconComponent(DestinationMarkerSvg);
export const OriginMarker = createIconComponent(OriginMarkerSvg);
export const ArrowRight = createIconComponent(ArrowRightSvg);
export const ArrowLeft = createIconComponent(ArrowLeftSvg);
export const Swap = createIconComponent(SwapSvg);
export const Options = createIconComponent(OptionsSvg);
export const CloseNav = createIconComponent(CloseNavSvg);
export const ArrowLeftWhite = createIconComponent(ArrowLeftWhiteSvg);
