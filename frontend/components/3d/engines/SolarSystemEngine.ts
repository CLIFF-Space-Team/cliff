import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PerformanceManager } from '../performance/PerformanceManager';
import { CelestialBodyManager } from '../managers/CelestialBodyManager';
import { OrbitalMechanicsEngine } from './OrbitalMechanicsEngine';
import { OrbitalPathsVisualizer } from '../visualization/OrbitalPathsVisualizer';
import { TimeSimulationController } from '../controls/TimeSimulationController';
import { SOLAR_SYSTEM_DATA, QUALITY_PRESETS } from '../../../types/astronomical-data';
interface EngineConfig {
  enablePerformanceOptimization?: boolean;
  enableOrbitalPaths?: boolean;
  enableTimeSimulation?: boolean;
  initialTimeScale?: number;
  startDate?: Date;
}
export class SolarSystemEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private controls?: OrbitControls;
  private performanceManager?: PerformanceManager;
  private celestialBodyManager?: CelestialBodyManager;
  private orbitalMechanics: OrbitalMechanicsEngine;
  private orbitalPathsVisualizer?: OrbitalPathsVisualizer;
  private timeController: TimeSimulationController;
  private sun?: THREE.Mesh;
  private ambientLight?: THREE.AmbientLight;
  private pointLight?: THREE.PointLight;
  private isInitialized: boolean = false;
  private animationFrameId?: number;
  private config: Required<EngineConfig>;
  private timeChangeListener?: (data: { time: number; timeScale: number }) => void;
  private performanceUpdateListener?: () => void;
  constructor(config: EngineConfig = {}) {
    this.config = {
      enablePerformanceOptimization: config.enablePerformanceOptimization ?? true,
      enableOrbitalPaths: config.enableOrbitalPaths ?? true,
      enableTimeSimulation: config.enableTimeSimulation ?? true,
      initialTimeScale: config.initialTimeScale ?? 86400, // 1 day per second
      startDate: config.startDate ?? new Date()
    };
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000000);
    this.orbitalMechanics = new OrbitalMechanicsEngine();
    this.timeController = new TimeSimulationController();
    this.initializeTimeController();
    this.bindEventListeners();
  }
  private initializeTimeController(): void {
    if (this.config.enableTimeSimulation) {
      this.timeController.setTimeScale(this.config.initialTimeScale);
      if (this.config.startDate) {
        this.timeController.jumpToDate(this.config.startDate, false);
      }
      this.timeController.setPlaying(false);
    }
  }
  private bindEventListeners(): void {
    this.timeChangeListener = ({ time, timeScale }) => {
      this.updateOrbitalPositions(time);
      if (this.config.enableOrbitalPaths && this.orbitalPathsVisualizer) {
        this.orbitalPathsVisualizer.update(time, 0.016); // Assume 60fps for deltaTime
      }
    };
    this.timeController.on('time-changed', this.timeChangeListener);
    this.performanceUpdateListener = () => {
      const metrics = this.performanceManager?.getMetrics();
      if (metrics) {
        if (metrics.fps < 30 && this.timeController.getState().timeScale > 86400) {
          this.celestialBodyManager?.setQualityLevel(QUALITY_PRESETS.medium);
        } else if (metrics.fps > 55) {
          this.celestialBodyManager?.setQualityLevel(QUALITY_PRESETS.high);
        }
      }
    };
    setInterval(this.performanceUpdateListener, 1000);
  }
  private updateOrbitalPositions(julianDay: number): void {
    if (!Array.isArray(SOLAR_SYSTEM_DATA)) {
      return;
    }
    SOLAR_SYSTEM_DATA.forEach((planetData) => {
      if (planetData.type === 'star') return; // Skip sun
      const body = this.celestialBodyManager?.getBody(planetData.id);
      if (body && planetData.orbit) {
        const distance = planetData.orbit.distance_from_sun * 149597870.7; // Convert AU to km
        const orbitalPeriod = planetData.orbit.orbital_period_days;
        const angle = ((julianDay % orbitalPeriod) / orbitalPeriod) * 2 * Math.PI;
        const scaleFactor = 0.001; // Adjust scale as needed
        body.group.position.set(
          Math.cos(angle) * distance * scaleFactor,
          0,
          Math.sin(angle) * distance * scaleFactor
        );
        const rotationAngle = (julianDay * 2 * Math.PI) / (planetData.orbit.rotation_period_hours / 24);
        if (body.mesh) {
          body.mesh.rotation.y = rotationAngle;
        }
      }
    });
  }
  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    if (this.isInitialized) {
      console.warn('SolarSystemEngine is already initialized');
      return;
    }
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;
    this.performanceManager = new PerformanceManager(
      this.renderer,
      this.scene, 
      this.camera,
      { enableAdaptiveQuality: true }
    );
    this.celestialBodyManager = new CelestialBodyManager(
      this.scene, 
      this.camera, 
      this.renderer
    );
    this.orbitalPathsVisualizer = new OrbitalPathsVisualizer(
      this.scene,
      this.camera
    );
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 500000;
    this.controls.minDistance = 10;
    await this.setupScene();
    await this.setupLighting();
    await this.loadCelestialBodies();
    this.camera.position.set(1000, 500, 1000);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    if (this.config.enableOrbitalPaths) {
      this.setupOrbitalPaths();
    }
    this.isInitialized = true;
    console.log('SolarSystemEngine initialized successfully');
    if (this.config.enableTimeSimulation) {
      this.updateOrbitalPositions(this.timeController.getState().currentTime);
      setTimeout(() => {
        this.timeController.setPlaying(true);
      }, 1000); // Small delay to ensure everything is loaded
    }
  }
  private async setupScene(): Promise<void> {
    this.scene.background = new THREE.Color(0x000011);
    await this.createStarfield();
  }
  private async createStarfield(): Promise<void> {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 10000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const radius = 50000 + Math.random() * 50000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2,
      sizeAttenuation: false
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);
  }
  private async setupLighting(): Promise<void> {
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.1);
    this.scene.add(this.ambientLight);
    this.pointLight = new THREE.PointLight(0xffffff, 2, 0);
    this.pointLight.position.set(0, 0, 0);
    this.pointLight.castShadow = true;
    this.pointLight.shadow.mapSize.width = 2048;
    this.pointLight.shadow.mapSize.height = 2048;
    this.pointLight.shadow.camera.near = 1;
    this.pointLight.shadow.camera.far = 100000;
    this.scene.add(this.pointLight);
  }
  private async loadCelestialBodies(): Promise<void> {
    await this.createSun();
    if (Array.isArray(SOLAR_SYSTEM_DATA)) {
      SOLAR_SYSTEM_DATA.forEach((planetData) => {
        if (planetData.type !== 'star' && this.celestialBodyManager) {
          const celestialBody: any = {
            ...planetData,
            orbital: {
              semiMajorAxis: planetData.orbit.distance_from_sun,
              eccentricity: 0.01, // Default value
              inclination: planetData.orbit.tilt_degrees,
              longitudeOfAscendingNode: 0, // Default value
              argumentOfPeriapsis: 0, // Default value
              meanAnomalyAtEpoch: 0, // Default value
              epoch: 2451545.0, // J2000.0
              orbitalPeriod: planetData.orbit.orbital_period_days,
              meanMotion: 360 / planetData.orbit.orbital_period_days,
              distance_from_sun: planetData.orbit.distance_from_sun,
              orbital_period_days: planetData.orbit.orbital_period_days,
              rotation_period_hours: planetData.orbit.rotation_period_hours,
              tilt_degrees: planetData.orbit.tilt_degrees
            },
            physical: {
              radius: planetData.info.radius_km,
              mass: planetData.info.mass_relative_to_earth,
              density: 5.5, // Default value
              gravity: planetData.info.gravity_relative_to_earth,
              escapeVelocity: 11.2, // Default value
              rotationPeriod: planetData.orbit.rotation_period_hours,
              axialTilt: planetData.orbit.tilt_degrees,
              albedo: 0.3 // Default value
            },
            atmosphere: {
              hasAtmosphere: planetData.info.has_atmosphere
            },
            textures: {
              diffuse: planetData.texture_url || ''
            }
          };
          this.celestialBodyManager.addCelestialBody(celestialBody);
        }
      });
    }
  }
  private async createSun(): Promise<void> {
    let sunData;
    if (Array.isArray(SOLAR_SYSTEM_DATA)) {
      sunData = SOLAR_SYSTEM_DATA.find(body => body.type === 'star');
    }
    if (!sunData) return;
    const geometry = new THREE.SphereGeometry(sunData.info.radius_km * 0.00001, 64, 32); // Scale down significantly
    const material = new THREE.MeshStandardMaterial({
      emissive: new THREE.Color(0xffaa00),
      emissiveIntensity: 0.5,
      color: new THREE.Color(0xffaa00)
    });
    this.sun = new THREE.Mesh(geometry, material);
    this.sun.position.set(0, 0, 0);
    this.scene.add(this.sun);
    if (this.celestialBodyManager && sunData) {
      const celestialSun: any = {
        ...sunData,
        orbital: {
          semiMajorAxis: 0,
          eccentricity: 0,
          inclination: 0,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          meanAnomalyAtEpoch: 0,
          epoch: 2451545.0,
          orbitalPeriod: 0,
          meanMotion: 0,
          distance_from_sun: 0,
          orbital_period_days: 0,
          rotation_period_hours: sunData.orbit.rotation_period_hours,
          tilt_degrees: sunData.orbit.tilt_degrees
        },
        physical: {
          radius: sunData.info.radius_km,
          mass: sunData.info.mass_relative_to_earth,
          density: 1.4,
          gravity: sunData.info.gravity_relative_to_earth,
          escapeVelocity: 617.5,
          rotationPeriod: sunData.orbit.rotation_period_hours,
          axialTilt: sunData.orbit.tilt_degrees,
          albedo: 0.1
        },
        atmosphere: {
          hasAtmosphere: sunData.info.has_atmosphere
        },
        textures: {
          diffuse: sunData.texture_url || ''
        }
      };
      this.celestialBodyManager.addCelestialBody(celestialSun);
    }
  }
  private setupOrbitalPaths(): void {
    if (!this.orbitalPathsVisualizer || !Array.isArray(SOLAR_SYSTEM_DATA)) return;
    SOLAR_SYSTEM_DATA.forEach((planetData) => {
      if (planetData.type !== 'star' && planetData.orbit) {
        this.orbitalPathsVisualizer!.addOrbitPath(planetData as any);
      }
    });
  }
  private render = (): void => {
    if (!this.renderer || !this.isInitialized) return;
    if (this.performanceManager) {
      this.performanceManager.update(performance.now());
    }
    if (this.controls) {
      this.controls.update();
    }
    if (this.celestialBodyManager) {
      this.celestialBodyManager.update(0.016, performance.now()); // Assume 60fps
    }
    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.render);
  };
  start(): void {
    if (this.isInitialized && !this.animationFrameId) {
      this.render();
    }
  }
  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }
  resize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  getTimeController(): TimeSimulationController {
    return this.timeController;
  }
  getPerformanceManager(): PerformanceManager | undefined {
    return this.performanceManager;
  }
  getCelestialBodyManager(): CelestialBodyManager | undefined {
    return this.celestialBodyManager;
  }
  focusOnBody(bodyName: string, distance: number = 1000): void {
    const body = this.celestialBodyManager?.getBody(bodyName);
    if (body && this.controls) {
      const targetPosition = body.group.position.clone();
      const cameraPosition = targetPosition.clone().add(new THREE.Vector3(distance, distance * 0.5, distance));
      this.camera.position.copy(cameraPosition);
      this.controls.target.copy(targetPosition);
      this.controls.update();
    }
  }
  dispose(): void {
    this.stop();
    this.performanceManager?.dispose();
    if (this.timeChangeListener) {
      this.timeController.off('time-changed', this.timeChangeListener);
    }
    this.celestialBodyManager?.dispose();
    this.orbitalPathsVisualizer?.dispose();
    this.timeController.dispose();
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.controls) {
      this.controls.dispose();
    }
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.scene.remove(child);
    }
    this.isInitialized = false;
    console.log('SolarSystemEngine disposed');
  }
}
export default SolarSystemEngine;