import {
  EducationalContent,
  EducationalDatabase,
  MissionData,
  HistoricalEvent,
  CelestialComparison,
  SearchableContent,
  SearchFilter,
  EducationalLevel,
  ContentType,
  LocalizedContent,
  LiveDataSource
} from '../types/educational-content';
import { CelestialBody, SimpleCelestialBody, SOLAR_SYSTEM_DATA } from '../types/astronomical-data';
interface ContentCache {
  [key: string]: {
    data: any;
    timestamp: number;
    expiry: number;
  };
}
interface NASAApiEndpoints {
  asteroids: string;
  exoplanets: string;
  mars_weather: string;
  earth_imagery: string;
  solar_flares: string;
  spacecraft_positions: string;
}
export class EducationalContentManager {
  private static instance: EducationalContentManager;
  private database: EducationalDatabase;
  private contentCache: ContentCache = {};
  private searchIndex: Map<string, SearchableContent[]> = new Map();
  private currentLanguage: string = 'tr';
  private readonly NASA_API_KEY = process.env.NEXT_PUBLIC_NASA_API_KEY || '';
  private readonly NASA_ENDPOINTS: NASAApiEndpoints = {
    asteroids: 'https://api.nasa.gov/neo/rest/v1/feed',
    exoplanets: 'https://exoplanetarchive.ipac.caltech.edu/cgi-bin/nsted/nph-nstedAPI',
    mars_weather: 'https://api.nasa.gov/insight_weather/',
    earth_imagery: 'https://api.nasa.gov/planetary/earth/assets',
    solar_flares: 'https://api.nasa.gov/DONKI/FLR',
    spacecraft_positions: 'https://ssd-api.jpl.nasa.gov/horizons_batch.api'
  };
  private constructor() {
    this.database = this.initializeDatabase();
    this.buildSearchIndex();
  }
  public static getInstance(): EducationalContentManager {
    if (!EducationalContentManager.instance) {
      EducationalContentManager.instance = new EducationalContentManager();
    }
    return EducationalContentManager.instance;
  }
  private initializeDatabase(): EducationalDatabase {
    return {
      celestialBodies: this.generateDefaultContent(),
      tours: [],
      searchableContent: [],
      liveDataSources: this.configureLiveDataSources(),
      version: '1.0.0',
      lastUpdated: new Date(),
      languages: ['tr', 'en'],
      defaultLanguage: 'tr'
    };
  }
  private generateDefaultContent(): EducationalDatabase['celestialBodies'] {
    const content: EducationalDatabase['celestialBodies'] = {};
    Object.entries(SOLAR_SYSTEM_DATA).forEach(([bodyId, bodyData]) => {
      content[bodyId] = {
        content: this.generateBodyEducationalContent(bodyData),
        missions: this.generateBodyMissions(bodyData),
        events: this.generateBodyEvents(bodyData),
        comparisons: []
      };
    });
    return content;
  }
  private generateBodyEducationalContent(body: SimpleCelestialBody): EducationalContent[] {
    const baseContent: EducationalContent[] = [
      {
        id: `${body.id}_overview`,
        title: {
          tr: `${body.name} Hakkında`,
          en: `About ${body.name}`
        },
        description: {
          tr: `${body.name} hakkında temel bilgiler ve özellikler`,
          en: `Basic information and characteristics of ${body.name}`
        },
        content: {
          tr: this.generateTurkishContent(body),
          en: this.generateEnglishContent(body)
        },
        type: 'overview',
        level: 'basic',
        tags: [body.type, 'solar_system', 'astronomy'],
        readingTime: 3,
        complexity: 2,
        interactivity: 3,
        lastUpdated: new Date(),
        sources: [
          {
            name: 'NASA Planetary Fact Sheets',
            url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/',
            type: 'nasa'
          }
        ]
      },
      {
        id: `${body.id}_physics`,
        title: {
          tr: `${body.name} Fizik ve Dinamik`,
          en: `${body.name} Physics and Dynamics`
        },
        description: {
          tr: `${body.name}'in fiziksel özellikleri ve dinamik yapısı`,
          en: `Physical properties and dynamic structure of ${body.name}`
        },
        content: {
          tr: this.generatePhysicsContentTurkish(body),
          en: this.generatePhysicsContentEnglish(body)
        },
        type: 'physics',
        level: 'intermediate',
        tags: [body.type, 'physics', 'orbital_mechanics'],
        readingTime: 5,
        complexity: 4,
        interactivity: 4,
        lastUpdated: new Date(),
        sources: [
          {
            name: 'IAU Guidelines',
            url: 'https://www.iau.org/',
            type: 'academic'
          }
        ]
      }
    ];
    const discoveryDate = (body as any).discoveryDate;
    if (discoveryDate) {
      baseContent.push({
        id: `${body.id}_discovery`,
        title: {
          tr: `${body.name}'in Keşfi`,
          en: `Discovery of ${body.name}`
        },
        description: {
          tr: `${body.name}'in keşif hikayesi ve tarihçesi`,
          en: `Discovery story and history of ${body.name}`
        },
        content: {
          tr: `${body.name}, ${discoveryDate} tarihinde keşfedilmiştir...`,
          en: `${body.name} was discovered on ${discoveryDate}...`
        },
        type: 'discovery',
        level: 'basic',
        tags: ['discovery', 'history', body.type],
        readingTime: 4,
        complexity: 2,
        interactivity: 2,
        lastUpdated: new Date(),
        sources: []
      });
    }
    return baseContent;
  }
  private generateBodyMissions(body: SimpleCelestialBody): MissionData[] {
    const missions: MissionData[] = [];
    switch (body.id) {
      case 'mars':
        missions.push({
          id: 'perseverance',
          name: { tr: 'Perseverance Rover', en: 'Perseverance Rover' },
          agency: 'NASA',
          launchDate: new Date('2020-07-30'),
          status: 'active',
          target: body.id,
          description: {
            tr: 'Mars yüzeyinde yaşam izleri arayan gelişmiş rover',
            en: 'Advanced rover searching for signs of life on Mars surface'
          },
          objectives: [
            {
              tr: 'Mars\'ta antik yaşam izlerini aramak',
              en: 'Search for signs of ancient life on Mars'
            }
          ],
          achievements: [],
          images: ['/images/missions/perseverance.jpg'],
          educationalContent: []
        });
        break;
      case 'jupiter':
        missions.push({
          id: 'juno',
          name: { tr: 'Juno Görevi', en: 'Juno Mission' },
          agency: 'NASA',
          launchDate: new Date('2011-08-05'),
          status: 'active',
          target: body.id,
          description: {
            tr: 'Jüpiter\'in iç yapısını ve manyetik alanını inceliyor',
            en: 'Studying Jupiter\'s interior structure and magnetic field'
          },
          objectives: [
            {
              tr: 'Jüpiter\'in iç yapısını anlamak',
              en: 'Understand Jupiter\'s interior structure'
            }
          ],
          achievements: [],
          images: ['/images/missions/juno.jpg'],
          educationalContent: []
        });
        break;
    }
    return missions;
  }
  private generateBodyEvents(body: SimpleCelestialBody): HistoricalEvent[] {
    const events: HistoricalEvent[] = [];
    const discoveryDate = (body as any).discoveryDate;
    if (discoveryDate) {
      events.push({
        id: `${body.id}_discovery`,
        title: {
          tr: `${body.name}'in Keşfi`,
          en: `Discovery of ${body.name}`
        },
        date: new Date(discoveryDate),
        type: 'discovery',
        relatedBody: body.id,
        description: {
          tr: `${body.name} ilk kez gözlemlendi ve keşfedildi`,
          en: `${body.name} was first observed and discovered`
        },
        significance: {
          tr: 'Güneş sistemi anlayışımızda önemli bir dönüm noktası',
          en: 'A significant milestone in our understanding of the solar system'
        },
        method: {
          tr: 'Teleskopik gözlem',
          en: 'Telescopic observation'
        },
        educationalLevel: 'basic',
        culturalImpact: {
          tr: 'Astronomi biliminin gelişimine katkı sağladı',
          en: 'Contributed to the development of astronomical science'
        }
      });
    }
    return events;
  }
  private configureLiveDataSources(): LiveDataSource[] {
    return [
      {
        id: 'nasa_asteroids',
        name: 'NASA Near Earth Objects',
        type: 'nasa_api',
        endpoint: this.NASA_ENDPOINTS.asteroids,
        updateInterval: 3600, // 1 hour
        dataMapping: {
          'near_earth_objects': 'asteroids',
          'estimated_diameter': 'size',
          'close_approach_data': 'trajectory'
        },
        fallback: {
          staticData: [],
          message: {
            tr: 'Canlı asteroid verisi şu anda kullanılamıyor',
            en: 'Live asteroid data is currently unavailable'
          }
        },
        cacheDuration: 3600,
        cacheKey: 'nasa_asteroids'
      },
      {
        id: 'solar_activity',
        name: 'Solar Activity Data',
        type: 'nasa_api',
        endpoint: this.NASA_ENDPOINTS.solar_flares,
        updateInterval: 1800, // 30 minutes
        dataMapping: {
          'flrID': 'id',
          'beginTime': 'start_time',
          'classType': 'intensity'
        },
        cacheDuration: 1800,
        cacheKey: 'solar_activity'
      }
    ];
  }
  private buildSearchIndex(): void {
    const searchableContent: SearchableContent[] = [];
    Object.entries(this.database.celestialBodies).forEach(([bodyId, bodyData]) => {
      const body = SOLAR_SYSTEM_DATA[bodyId];
      if (body) {
        searchableContent.push({
          id: bodyId,
          type: 'celestial_body',
          title: { tr: body.name, en: body.name },
          description: {
            tr: `${body.type} - ${body.name}`,
            en: `${body.type} - ${body.name}`
          },
          tags: [body.type, 'planet', 'solar_system'],
          categories: ['astronomy', 'solar_system'],
          keywords: {
            tr: `${body.name} gezegen uydu asteroid`,
            en: `${body.name} planet moon satellite asteroid`
          },
          searchWeight: body.type === 'planet' ? 10 : 5,
          lastUpdated: new Date()
        });
        bodyData.content.forEach(content => {
          searchableContent.push({
            id: content.id,
            type: 'educational_content',
            title: content.title,
            description: content.description,
            tags: content.tags,
            categories: [content.type],
            keywords: content.title,
            searchWeight: content.level === 'basic' ? 8 : 6,
            lastUpdated: content.lastUpdated
          });
        });
      }
    });
    this.searchIndex.clear();
    searchableContent.forEach(item => {
      const keywords = this.getLocalizedText(item.keywords).toLowerCase().split(' ');
      keywords.forEach(keyword => {
        if (!this.searchIndex.has(keyword)) {
          this.searchIndex.set(keyword, []);
        }
        this.searchIndex.get(keyword)!.push(item);
      });
      item.tags.forEach(tag => {
        if (!this.searchIndex.has(tag)) {
          this.searchIndex.set(tag, []);
        }
        this.searchIndex.get(tag)!.push(item);
      });
    });
    this.database.searchableContent = searchableContent;
  }
  public searchContent(query: string, filters?: SearchFilter): SearchableContent[] {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return this.database.searchableContent;
    let results: SearchableContent[] = [];
    const queryWords = normalizedQuery.split(' ');
    queryWords.forEach(word => {
      const indexResults = this.searchIndex.get(word) || [];
      results = results.concat(indexResults);
    });
    const uniqueResults = Array.from(new Map(results.map(item => [item.id, item])).values());
    let filteredResults = uniqueResults;
    if (filters) {
      filteredResults = this.applyFilters(filteredResults, filters);
    }
    return filteredResults.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, normalizedQuery);
      const scoreB = this.calculateRelevanceScore(b, normalizedQuery);
      return scoreB - scoreA;
    });
  }
  private applyFilters(results: SearchableContent[], filters: SearchFilter): SearchableContent[] {
    return results.filter(item => {
      if (filters.categories.length > 0) {
        if (!filters.categories.some(cat => item.categories.includes(cat))) {
          return false;
        }
      }
      if (filters.tags.length > 0) {
        if (!filters.tags.some(tag => item.tags.includes(tag))) {
          return false;
        }
      }
      if (filters.contentTypes.length > 0 && item.type === 'educational_content') {
      }
      if (filters.dateRange) {
        if (item.lastUpdated < filters.dateRange.from || item.lastUpdated > filters.dateRange.to) {
          return false;
        }
      }
      return true;
    });
  }
  private calculateRelevanceScore(item: SearchableContent, query: string): number {
    let score = item.searchWeight;
    const title = this.getLocalizedText(item.title).toLowerCase();
    const description = this.getLocalizedText(item.description).toLowerCase();
    if (title.includes(query)) {
      score += 50;
    }
    const queryWords = query.split(' ');
    queryWords.forEach(word => {
      if (title.includes(word)) {
        score += 20;
      }
      if (description.includes(word)) {
        score += 10;
      }
    });
    queryWords.forEach(word => {
      if (item.tags.some(tag => tag.toLowerCase().includes(word))) {
        score += 15;
      }
    });
    return score;
  }
  public getContentForCelestialBody(bodyId: string, contentType?: ContentType): EducationalContent[] {
    const bodyData = this.database.celestialBodies[bodyId];
    if (!bodyData) return [];
    let content = bodyData.content;
    if (contentType) {
      content = content.filter(c => c.type === contentType);
    }
    return content;
  }
  public getMissionsForCelestialBody(bodyId: string): MissionData[] {
    const bodyData = this.database.celestialBodies[bodyId];
    return bodyData ? bodyData.missions : [];
  }
  public getHistoricalEventsForCelestialBody(bodyId: string): HistoricalEvent[] {
    const bodyData = this.database.celestialBodies[bodyId];
    return bodyData ? bodyData.events : [];
  }
  public async fetchLiveData(sourceId: string): Promise<any> {
    const source = this.database.liveDataSources.find(s => s.id === sourceId);
    if (!source) {
      throw new Error(`Live data source ${sourceId} not found`);
    }
    const cached = this.contentCache[source.cacheKey];
    if (cached && Date.now() - cached.timestamp < cached.expiry) {
      return cached.data;
    }
    try {
      const url = `${source.endpoint}?api_key=${this.NASA_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      const data = await response.json();
      if (source.validator && !source.validator(data)) {
        throw new Error('Data validation failed');
      }
      this.contentCache[source.cacheKey] = {
        data,
        timestamp: Date.now(),
        expiry: source.cacheDuration * 1000
      };
      return data;
    } catch (error) {
      console.warn(`Failed to fetch live data from ${sourceId}:`, error);
      if (source.fallback) {
        return source.fallback.staticData;
      }
      throw error;
    }
  }
  public setLanguage(language: string): void {
    this.currentLanguage = language;
  }
  private getLocalizedText(text: LocalizedContent): string {
    return text[this.currentLanguage] || text['en'] || Object.values(text)[0] || '';
  }
  private generateTurkishContent(body: SimpleCelestialBody): string {
    const radius = body.info.radius_km || 0;
    const mass = body.info.mass_relative_to_earth || 0;
    return `${body.name}, ${body.type} türünde bir gök cismidir. ${radius} km yarıçapına ve ${mass.toFixed(2)} DÜnya kütlesine sahiptir.`;
  }
  private generateEnglishContent(body: SimpleCelestialBody): string {
    const radius = body.info.radius_km || 0;
    const mass = body.info.mass_relative_to_earth || 0;
    return `${body.name} is a ${body.type} with a radius of ${radius} km and a mass of ${mass.toFixed(2)} Earth masses.`;
  }
  private generatePhysicsContentTurkish(body: SimpleCelestialBody): string {
    const distance = body.orbit.distance_from_sun || 0;
    const orbitalPeriod = body.orbit.orbital_period_days || 0;
    const rotationPeriod = body.orbit.rotation_period_hours || 0;
    return `${body.name}'in orbital parametreleri incelendiğinde, Güneş'ten ${distance} AU uzaklıkta bulunduğu görülür. Orbital periyodu ${orbitalPeriod.toFixed(1)} gün, dönüş periyodu ${Math.abs(rotationPeriod).toFixed(1)} saattir.`;
  }
  private generatePhysicsContentEnglish(body: SimpleCelestialBody): string {
    const distance = body.orbit.distance_from_sun || 0;
    const orbitalPeriod = body.orbit.orbital_period_days || 0;
    const rotationPeriod = body.orbit.rotation_period_hours || 0;
    return `${body.name} has orbital parameters including a distance of ${distance} AU from the Sun, an orbital period of ${orbitalPeriod.toFixed(1)} days, and a rotation period of ${Math.abs(rotationPeriod).toFixed(1)} hours.`;
  }
  public clearCache(): void {
    this.contentCache = {};
  }
  public getCacheStats(): { entries: number; totalSize: number } {
    const entries = Object.keys(this.contentCache).length;
    const totalSize = JSON.stringify(this.contentCache).length;
    return { entries, totalSize };
  }
}
export const educationalContentManager = EducationalContentManager.getInstance();