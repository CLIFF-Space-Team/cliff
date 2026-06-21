# Asteroid 3D Assets

This directory holds GLB models and PBR texture sets for famous near-Earth
objects. Files are sourced from NASA / JAXA mission archives under public
domain license.

## Manual setup (one-time)

1. Download OBJ shapes from:
   - Bennu (OSIRIS-REx): https://nasa3d.arc.nasa.gov/detail/bennu-v20
   - Eros (NEAR): https://nasa3d.arc.nasa.gov/detail/eros-shape
   - Itokawa (Hayabusa): https://nasa3d.arc.nasa.gov/detail/itokawa
   - Ryugu (Hayabusa-2): https://www.hayabusa2.jaxa.jp/en/galleries/3d/
   - Vesta (Dawn): https://nasa3d.arc.nasa.gov/detail/vesta-shape

2. Convert OBJ → GLB and optimize:

   ```bash
   npm install -g @gltf-transform/cli obj2gltf
   obj2gltf -i bennu.obj -o bennu.glb
   gltf-transform optimize bennu.glb bennu.glb \
     --texture-compress webp \
     --texture-resize 2048
   ```

3. Place the optimized files at:

   ```
   public/asteroids/bennu/model.glb
   public/asteroids/eros/model.glb
   public/asteroids/itokawa/model.glb
   public/asteroids/ryugu/model.glb
   public/asteroids/vesta/model.glb
   ```

> Procedural fallback textures for unknown NEOs are generated **at runtime**
> by `textureFactory.ts` — there is no bake step and no `_fallback/` directory
> to populate.

## Runtime behavior

- The `AsteroidModelRegistry` resolves `neoId` → manifest entry. If the GLB
  file is missing, the runtime falls back to a procedural icosahedron with
  type-specific PBR coloring (so the scene still renders).
- `manifest.json` is the source of truth for which NEOs have curated models.
