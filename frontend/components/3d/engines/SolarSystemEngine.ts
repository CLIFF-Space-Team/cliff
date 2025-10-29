import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
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
  
  // Core systems
  private performanceManager?: PerformanceManager;
  private celestialBodyManager?: CelestialBodyManager;
  private orbitalMechanics: OrbitalMechanicsEngine;
  private orbitalPathsVisualizer?: OrbitalPathsVisualizer;
  private timeController: TimeSimulationController;
  
  // Scene objects
  private sun?: THREE.Mesh;
  private ambientLight?: THREE.AmbientLight;
  private pointLight?: THREE.PointLight;
  
  // State
  private isInitialized: boolean = false;
  private animationFrameId?: number;
  private config: Required<EngineConfig>;
  
  // Event listeners
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

    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000000);
    
    // Initialize systems that don't need renderer
    this.orbitalMechanics = new OrbitalMechanicsEngine();
    this.timeController = new TimeSimulationController();
    
    this.initializeTimeController();
    this.bindEventListeners();
  }

  /**
   * Initialize time controller with configuration
   */
  private initializeTimeController(): void {
    if (this.config.enableTimeSimulation) {
      // Set initial time scale
      this.timeController.setTimeScale(this.config.initialTimeScale);
      
      // Jump to start date if specified
      if (this.config.startDate) {
        this.timeController.jumpToDate(this.config.startDate, false);
      }
      
      // Start in paused state for initial setup
      this.timeController.setPlaying(false);
    }
  }

  /**
   * Bind event listeners for system integration
   */
  private bindEventListeners(): void {
    // Time change listener
    this.timeChangeListener = ({ time, timeScale }) => {
      this.updateOrbitalPositions(time);
      
      // Update orbital paths if enabled
      if (this.config.enableOrbitalPaths && this.orbitalPathsVisualizer) {
        this.orbitalPathsVisualizer.update(time, 0.016); // Assume 60fps for deltaTime
      }
    };
    
    this.timeController.on('time-changed', this.timeChangeListener);
    
    // Performance update listener
    this.performanceUpdateListener = () => {
      const metrics = this.performanceManager?.getMetrics();
      
      if (metrics) {
        // Adjust time simulation quality based on performance
        if (metrics.fps < 30 && this.timeController.getState().timeScale > 86400) {
          // Reduce quality for better performance
          this.celestialBodyManager?.setQualityLevel(QUALITY_PRESETS.medium);
        } else if (metrics.fps > 55) {
          // Increase quality when performance is good
          this.celestialBodyManager?.setQualityLevel(QUALITY_PRESETS.high);
        }
      }
    };
    
    // Listen to performance updates every second
    setInterval(this.performanceUpdateListener, 1000);
  }

  /**
   * Update orbital positions based on current time
   */
  private updateOrbitalPositions(julianDay: number): void {
    // Update all planets - simplified version for now
    if (!Array.isArray(SOLAR_SYSTEM_DATA)) {
      return;
    }

    SOLAR_SYSTEM_DATA.forEach((planetData) => {
      if (planetData.type === 'star') return; // Skip sun

      const body = this.celestialBodyManager?.getBody(planetData.id);
      if (body && planetData.orbit) {
        // Simple circular orbit calculation for now
        const distance = planetData.orbit.distance_from_sun * 149597870.7; // Convert AU to km
        const orbitalPeriod = planetData.orbit.orbital_period_days;
        const angle = ((julianDay % orbitalPeriod) / orbitalPeriod) * 2 * Math.PI;
        
        const scaleFactor = 0.001; // Adjust scale as needed
        body.group.position.set(
          Math.cos(angle) * distance * scaleFactor,
          0,
          Math.sin(angle) * distance * scaleFactor
        );
        
        // Apply rotation
        const rotationAngle = (julianDay * 2 * Math.PI) / (planetData.orbit.rotation_period_hours / 24);
        if (body.mesh) {
          body.mesh.rotation.y = rotationAngle;
        }
      }
    });

    // Satellites will be added later when SATELLITE_SYSTEMS is properly defined
  }

  /**
   * Initialize the 3D engine
   */
  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    if (this.isInitialized) {
      console.warn('SolarSystemEngine is already initialized');
      return;
    }

    // Setup renderer
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

    // Now initialize systems that need renderer
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

    // Setup controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 500000;
    this.controls.minDistance = 10;

    // Initialize scene
    await this.setupScene();
    await this.setupLighting();
    await this.loadCelestialBodies();
    
    // Setup camera position
    this.camera.position.set(1000, 500, 1000);
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    // Setup orbital paths if enabled
    if (this.config.enableOrbitalPaths) {
      this.setupOrbitalPaths();
    }

    this.isInitialized = true;
    console.log('SolarSystemEngine initialized successfully');
    
    // Start time simulation if enabled
    if (this.config.enableTimeSimulation) {
      // Initial position update
      this.updateOrbitalPositions(this.timeController.getState().currentTime);
      
      // Start simulation
      setTimeout(() => {
        this.timeController.setPlaying(true);
      }, 1000); // Small delay to ensure everything is loaded
    }
  }

  /**
   * Setup the 3D scene
   */
  private async setupScene(): Promise<void> {
    this.scene.background = new THREE.Color(0x000011);
    
    // Add starfield
    await this.createStarfield();
  }

  /**
   * Create starfield background
   */
  private async createStarfield(): Promise<void> {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 10000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      // Create stars in a sphere around the solar system
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

  /**
   * Setup scene lighting
   */
  private async setupLighting(): Promise<void> {
    // Ambient light for overall scene illumination
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.1);
    this.scene.add(this.ambientLight);

    // Point light from the Sun
    this.pointLight = new THREE.PointLight(0xffffff, 2, 0);
    this.pointLight.position.set(0, 0, 0);
    this.pointLight.castShadow = true;
    this.pointLight.shadow.mapSize.width = 2048;
    this.pointLight.shadow.mapSize.height = 2048;
    this.pointLight.shadow.camera.near = 1;
    this.pointLight.shadow.camera.far = 100000;
    this.scene.add(this.pointLight);
  }

  /**
   * Load all celestial bodies
   */
  private async loadCelestialBodies(): Promise<void> {
    // Create and add the Sun
    await this.createSun();
    
    // Load planets
    if (Array.isArray(SOLAR_SYSTEM_DATA)) {
      SOLAR_SYSTEM_DATA.forEach((planetData) => {
        if (planetData.type !== 'star' && this.celestialBodyManager) {
          // Convert SimpleCelestialBody to CelestialBody
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
    
    // Satellites will be loaded later when SATELLITE_SYSTEMS is properly defined
  }

  /**
   * Create the Sun
   */
  private async createSun(): Promise<void> {
    // Find sun data
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
    
    // Register sun with celestial body manager
    if (this.celestialBodyManager && sunData) {
      // Convert SimpleCelestialBody to CelestialBody
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

  /**
   * Setup orbital paths
   */
  private setupOrbitalPaths(): void {
    if (!this.orbitalPathsVisualizer || !Array.isArray(SOLAR_SYSTEM_DATA)) return;

    // Add orbital paths for all planets
    SOLAR_SYSTEM_DATA.forEach((planetData) => {
      if (planetData.type !== 'star' && planetData.orbit) {
        // Convert SimpleCelestialBody to format expected by orbitalPathsVisualizer
        // This is a temporary solution until we properly align the interfaces
        this.orbitalPathsVisualizer!.addOrbitPath(planetData as any);
      }
    });

    // Satellite paths will be added later when SATELLITE_SYSTEMS is properly defined
  }

  /**
   * Render loop
   */
  private render = (): void => {
    if (!this.renderer || !this.isInitialized) return;

    // Update performance metrics
    if (this.performanceManager) {
      this.performanceManager.update(performance.now());
    }

    // Update controls
    if (this.controls) {
      this.controls.update();
    }

    // Update celestial body manager
    if (this.celestialBodyManager) {
      this.celestialBodyManager.update(0.016, performance.now()); // Assume 60fps
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);

    // Continue animation loop
    this.animationFrameId = requestAnimationFrame(this.render);
  };

  /**
   * Start the render loop
   */
  start(): void {
    if (this.isInitialized && !this.animationFrameId) {
      this.render();
    }
  }

  /**
   * Stop the render loop
   */
  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  /**
   * Handle window resize
   */
  resize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Get time controller for external access
   */
  getTimeController(): TimeSimulationController {
    return this.timeController;
  }

  /**
   * Get performance manager for monitoring
   */
  getPerformanceManager(): PerformanceManager | undefined {
    return this.performanceManager;
  }

  /**
   * Get celestial body manager
   */
  getCelestialBodyManager(): CelestialBodyManager | undefined {
    return this.celestialBodyManager;
  }

  /**
   * Focus camera on celestial body
   */
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

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop();
    this.performanceManager?.dispose();
    
    // Remove event listeners
    if (this.timeChangeListener) {
      this.timeController.off('time-changed', this.timeChangeListener);
    }
    
    // Dispose celestial body manager
    this.celestialBodyManager?.dispose();
    
    // Dispose orbital paths visualizer
    this.orbitalPathsVisualizer?.dispose();
    
    // Dispose time controller
    this.timeController.dispose();
    
    // Dispose Three.js objects
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    if (this.controls) {
      this.controls.dispose();
    }

    // Clear scene
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.scene.remove(child);
    }

    this.isInitialized = false;
    console.log('SolarSystemEngine disposed');
  }
}

export default SolarSystemEngine;