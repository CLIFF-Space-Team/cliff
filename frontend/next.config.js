/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  experimental: {},
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack: (config, { isServer }) => {
    // Three.js multiple instance sorununu çöz
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'three': require.resolve('three'),
        'three/examples/jsm/postprocessing/EffectComposer': require.resolve('three/examples/jsm/postprocessing/EffectComposer.js'),
        'three/examples/jsm/postprocessing/RenderPass': require.resolve('three/examples/jsm/postprocessing/RenderPass.js'),
        'three/examples/jsm/postprocessing/UnrealBloomPass': require.resolve('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
        'three/examples/jsm/postprocessing/ShaderPass': require.resolve('three/examples/jsm/postprocessing/ShaderPass.js'),
        'three/examples/jsm/postprocessing/SMAAPass': require.resolve('three/examples/jsm/postprocessing/SMAAPass.js'),
        'three/examples/jsm/postprocessing/OutputPass': require.resolve('three/examples/jsm/postprocessing/OutputPass.js')
      }
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        canvas: false,
        encoding: false
      }
      
      // Three.js postprocessing modülleri için ek ayarlar
      config.resolve.extensionAlias = {
        '.js': ['.js', '.ts', '.tsx'],
        '.jsx': ['.jsx', '.tsx']
      }
    }
    return config
  },
}

module.exports = nextConfig
