import React from 'react';
import {
  BasePlanetComponent,
  PlanetComponentProps
} from './BasePlanetComponent';
import {
  SIMPLE_PLANETS,
  ASTRONOMICAL_CONSTANTS
} from '../../../types/astronomical-data';
import SaturnRings from './SaturnRings';
interface SaturnComponentProps extends PlanetComponentProps {
  showRings?: boolean;
}
export const SaturnComponent: React.FC<SaturnComponentProps> = ({
  showRings = true,
  qualityLevel = 'high',
  ...props
}) => {
  const saturnData = SIMPLE_PLANETS.saturn;
  const saturnRadius = saturnData.info.radius_km / ASTRONOMICAL_CONSTANTS.AU_IN_KM;
  const saturnTilt = 26.73 * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS; // Saturn's axial tilt
  return (
    <BasePlanetComponent
      celestialBody={saturnData}
      qualityLevel={qualityLevel}
      {...props}
    >
      {showRings && (
        <SaturnRings
          radius={saturnRadius}
          tilt={saturnTilt}
        />
      )}
    </BasePlanetComponent>
  );
};
export default SaturnComponent;