#!/usr/bin/env node
// CLIFF 3D Solar System - NASA Texture Downloader
// Downloads authentic NASA planetary textures for production use

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// NASA Texture Sources - Public Domain
const TEXTURE_SOURCES = {
  sun: {
    primary: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0171.jpg',
    fallback: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0171.jpg',
    name: 'sun_sdo_2k.jpg'
  },
  mercury: {
    primary: 'https://planetarynames.wr.usgs.gov/images/mercury_messenger_2k.jpg',
    fallback: 'https://space-facts.com/wp-content/uploads/mercury-v2.jpg',
    name: 'mercury_messenger_2k.jpg'
  },
  venus: {
    primary: 'https://planetarynames.wr.usgs.gov/images/venus_magellan_2k.jpg', 
    fallback: 'https://space-facts.com/wp-content/uploads/venus-v2.jpg',
    name: 'venus_magellan_2k.jpg'
  },
  earth: {
    primary: 'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg',
    fallback: 'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.200412.3x2048x1024.jpg',
    name: 'earth_blue_marble_2k.jpg'
  },
  mars: {
    primary: 'https://mars.nasa.gov/system/resources/detail_files/25042_mola_mars_2k.jpg',
    fallback: 'https://space-facts.com/wp-content/uploads/mars.jpg',
    name: 'mars_mro_2k.jpg'
  },
  jupiter: {
    primary: 'https://solarsystem.nasa.gov/system/resources/detail_files/2486_jupiter_juno_2k.jpg',
    fallback: 'https://space-facts.com/wp-content/uploads/jupiter-v2.jpg',
    name: 'jupiter_juno_2k.jpg'
  },
  saturn: {
    primary: 'https://solarsystem.nasa.gov/system/resources/detail_files/2502_saturn_cassini_2k.jpg',
    fallback: 'https://space-facts.com/wp-content/uploads/saturn-v2.jpg',
    name: 'saturn_cassini_2k.jpg'
  }
};

// Download function with retry logic
async function downloadTexture(url, filepath, planet) {
  return new Promise((resolve, reject) => {
    console.log(`🌍 Downloading ${planet} texture from: ${url}`);
    
    const protocol = url.startsWith('https://') ? https : http;
    const file = fs.createWriteStream(filepath);
    
    const request = protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`✅ ${planet} texture downloaded successfully`);
          resolve(true);
        });
        
        file.on('error', (error) => {
          fs.unlink(filepath, () => {}); // Clean up failed download
          console.error(`❌ File write error for ${planet}:`, error.message);
          reject(error);
        });
        
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        const redirectUrl = response.headers.location;
        console.log(`🔄 Redirecting ${planet} download to: ${redirectUrl}`);
        file.close();
        fs.unlink(filepath, () => {}); // Clean up
        downloadTexture(redirectUrl, filepath, planet).then(resolve).catch(reject);
        
      } else {
        file.close();
        fs.unlink(filepath, () => {}); // Clean up
        console.warn(`⚠️ HTTP ${response.statusCode} for ${planet} from ${url}`);
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
      }
    });
    
    request.on('error', (error) => {
      file.close();
      fs.unlink(filepath, () => {}); // Clean up
      console.error(`❌ Request error for ${planet}:`, error.message);
      reject(error);
    });
    
    // Timeout after 30 seconds
    request.setTimeout(30000, () => {
      request.abort();
      file.close();
      fs.unlink(filepath, () => {});
      console.error(`⏰ Download timeout for ${planet}`);
      reject(new Error(`Download timeout: ${url}`));
    });
  });
}

// Create procedural texture as fallback
async function createProceduralTexture(planet, filepath, size = 1024) {
  const { createCanvas } = require('canvas');
  
  console.log(`🎨 Creating procedural texture for ${planet}...`);
  
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Planet-specific colors and patterns
  const planetConfigs = {
    sun: { 
      baseColor: '#FDB813', 
      accentColor: '#FF6B35',
      pattern: 'radial'
    },
    mercury: { 
      baseColor: '#8C7853', 
      accentColor: '#A68B5B',
      pattern: 'craters'
    },
    venus: { 
      baseColor: '#FFC649', 
      accentColor: '#FF8C32',
      pattern: 'clouds'
    },
    earth: { 
      baseColor: '#6B93D6', 
      accentColor: '#4F7942',
      pattern: 'continents'
    },
    mars: { 
      baseColor: '#CD5C5C', 
      accentColor: '#A0522D',
      pattern: 'polar'
    },
    jupiter: { 
      baseColor: '#D8CA9D', 
      accentColor: '#FAD5A5',
      pattern: 'bands'
    },
    saturn: { 
      baseColor: '#FAD5A5', 
      accentColor: '#E6C2A6',
      pattern: 'bands'
    }
  };
  
  const config = planetConfigs[planet] || planetConfigs.mars;
  
  // Create gradient background
  const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0, config.baseColor);
  gradient.addColorStop(1, config.accentColor);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Add planet-specific patterns
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = config.accentColor;
    ctx.beginPath();
    ctx.arc(
      Math.random() * size,
      Math.random() * size,
      Math.random() * 20 + 5,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  
  // Save canvas as image
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.8 });
  await writeFile(filepath, buffer);
  
  console.log(`✅ Procedural texture created for ${planet}`);
  return true;
}

// Main download function
async function downloadPlanetTextures() {
  console.log('🚀 Starting NASA texture collection download...\n');
  
  const texturesDir = path.join(__dirname, '../public/textures/nasa');
  const results = {
    downloaded: [],
    fallbacks: [],
    procedural: [],
    failed: []
  };
  
  for (const [planet, config] of Object.entries(TEXTURE_SOURCES)) {
    const planetDir = path.join(texturesDir, planet);
    const filepath = path.join(planetDir, config.name);
    
    try {
      // Ensure directory exists
      await mkdir(planetDir, { recursive: true });
      
      // Try primary source first
      try {
        await downloadTexture(config.primary, filepath, planet);
        results.downloaded.push(planet);
        continue;
      } catch (primaryError) {
        console.log(`⚠️ Primary source failed for ${planet}, trying fallback...`);
      }
      
      // Try fallback source
      if (config.fallback) {
        try {
          await downloadTexture(config.fallback, filepath, planet);
          results.fallbacks.push(planet);
          continue;
        } catch (fallbackError) {
          console.log(`⚠️ Fallback also failed for ${planet}, creating procedural...`);
        }
      }
      
      // Create procedural texture as last resort
      try {
        await createProceduralTexture(planet, filepath);
        results.procedural.push(planet);
      } catch (proceduralError) {
        console.error(`💥 All methods failed for ${planet}:`, proceduralError.message);
        results.failed.push(planet);
      }
      
    } catch (error) {
      console.error(`💥 Critical error for ${planet}:`, error.message);
      results.failed.push(planet);
    }
    
    // Small delay between downloads to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary report
  console.log('\n📊 NASA Texture Download Summary:');
  console.log(`✅ Successfully downloaded: ${results.downloaded.length} (${results.downloaded.join(', ')})`);
  console.log(`🔄 Fallback sources used: ${results.fallbacks.length} (${results.fallbacks.join(', ')})`);
  console.log(`🎨 Procedural textures: ${results.procedural.length} (${results.procedural.join(', ')})`);
  console.log(`❌ Failed: ${results.failed.length} (${results.failed.join(', ')})`);
  
  const successRate = ((results.downloaded.length + results.fallbacks.length + results.procedural.length) / Object.keys(TEXTURE_SOURCES).length) * 100;
  console.log(`\n🎯 Overall Success Rate: ${successRate.toFixed(1)}%`);
  
  if (results.failed.length === 0) {
    console.log('\n🎉 All planetary textures are ready for CLIFF 3D Solar System!');
  } else {
    console.log('\n⚠️ Some textures failed - system will use fallback rendering');
  }
  
  return results;
}

// Check if we need canvas for procedural textures
function checkDependencies() {
  try {
    require('canvas');
    return true;
  } catch (error) {
    console.warn('⚠️ Canvas dependency not found - procedural textures unavailable');
    console.log('💡 Install with: npm install canvas');
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const hasCanvas = checkDependencies();
  
  downloadPlanetTextures()
    .then((results) => {
      process.exit(results.failed.length > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('💥 Critical failure:', error);
      process.exit(1);
    });
}

module.exports = { downloadPlanetTextures, createProceduralTexture };