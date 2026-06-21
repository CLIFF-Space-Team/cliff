'use client';

import { Component, Suspense, useEffect, useState, type ReactNode } from 'react';

import { lookup } from './AsteroidModelRegistry';
import { GlbAsteroid } from './GlbAsteroid';
import { ProceduralAsteroid } from './ProceduralAsteroid';
import type { AsteroidLookup, AsteroidProps } from './types';

interface BoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface BoundaryState {
  hasError: boolean;
}

class GlbBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { hasError: false };
  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }
  override componentDidCatch() {}
  override render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function Asteroid({
  neoId,
  hazardous = false,
  position,
  scale,
  selected = false,
  dimmed = false,
  onSelect,
}: AsteroidProps) {
  const [resolved, setResolved] = useState<AsteroidLookup | null>(null);
  const handleClick = onSelect ? () => onSelect(neoId) : undefined;

  useEffect(() => {
    let active = true;
    lookup(neoId).then((entry) => {
      if (active) setResolved(entry);
    });
    return () => {
      active = false;
    };
  }, [neoId]);

  if (!resolved) {
    return (
      <ProceduralAsteroid
        position={position}
        scale={scale}
        type="S"
        seed={neoId.length}
        hazardous={hazardous}
        selected={selected}
        dimmed={dimmed}
        onClick={handleClick}
      />
    );
  }

  if (resolved.kind === 'procedural') {
    return (
      <ProceduralAsteroid
        position={position}
        scale={scale}
        type={resolved.type}
        seed={resolved.seed}
        hazardous={hazardous}
        selected={selected}
        dimmed={dimmed}
        onClick={handleClick}
      />
    );
  }

  const fallback = (
    <ProceduralAsteroid
      position={position}
      scale={scale}
      type={resolved.entry.type}
      seed={Number(neoId) || neoId.length}
      hazardous={hazardous}
      selected={selected}
      dimmed={dimmed}
      onClick={handleClick}
    />
  );

  return (
    <GlbBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GlbAsteroid
          entry={resolved.entry}
          position={position}
          scale={scale}
          hazardous={hazardous}
          selected={selected}
          dimmed={dimmed}
          onClick={handleClick}
        />
      </Suspense>
    </GlbBoundary>
  );
}
