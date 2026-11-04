# TRAJECTIQ NASA imagery and 3-D model plan

Verified 2026-11-05. Every size below is a byte count from an HTTP HEAD request or the GitHub contents API unless it says "measured" (I downloaded and re-encoded the file with Pillow, JPEG quality 80-82) or "estimate". Budget: **under 6 MB of total images shipped**.

## 1. Licence statement (applies to all rows)

NASA Images and Media Usage Guidelines (https://www.nasa.gov/nasa-brand-center/images-and-media/, fetched 2026-11-05): NASA content, including "texture maps and polygon data" used in 3-D models, "generally are not subject to copyright in the United States"; use for "educational or informational purposes, including ... computer graphical simulations and Internet Web pages" is allowed without explicit permission; "NASA should be acknowledged as the source"; the NASA Insignia, Logotype (worm) and identifiers are **not** public domain and must not be used to imply endorsement; third-party copyrighted items are marked and need their own permission. USGS Astropedia products state "please cite authors" and are listed as public domain (read for Bennu pages; individual terms for each product should be re-read at download time). The NASA-3D-Resources README says its assets are "free and without copyright" but the GitHub repo has no LICENSE file; treat the NASA guidelines as the controlling terms.

Because the game is a non-commercial educational simulation hosted on Vercel, the guidelines are satisfied by the acknowledgement text in section 5. Do not display the NASA logo.

## 2. Body textures

Recommended format: equirectangular JPEG, 2:1, sRGB. "Bundle" is the file we ship (sizes measured or estimated).

| Body | Best source (direct URL) | Source facts | Recommended bundled resolution and size | Caveats |
|---|---|---|---|---|
| Earth | Blue Marble Next Generation with topography and bathymetry, December: `https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/december/world.topo.bathy.200412.3x5400x2700.jpg` (page: https://visibleearth.nasa.gov/images/73909/...) | 5400x2700, 2,566,770 B (HEAD) | **2048x1024, 312 KB (measured, q82)**; 1024x512 is 92 KB (measured) | Old `eoimages.gsfc.nasa.gov` URL no longer resolves; use the assets.science.nasa.gov path. |
| Moon | NASA SVS CGI Moon Kit (https://svs.gsfc.nasa.gov/4720/): colour `https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_1k.jpg` (1024x512, 139,068 B, HEAD) or `lroc_color_2k.jpg` (2048x1024, 447 KB per page); elevation `.../ldem_3_8bit.jpg` (1024x512, 111,552 B, HEAD) | LRO camera colour + LOLA altimetry; page updated 2026-01-09; map centred on 0 deg longitude | **1024x512 colour 139 KB + displacement 112 KB**; 2k colour 447 KB if budget allows | **Do not use** `NASA-3D-Resources/Images and Textures/Moon/Moon.jpg` (2,957,499 B): I viewed it and it is an Apollo photograph of the full lunar disk (1913x1911), not an equirectangular map. |
| Mars | `https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/Images%20and%20Textures/Mars/Mars.jpg` | 1440x720, 972,896 B (API); viewed: clean albedo map with polar caps | **1024x512, 84 KB (measured)**; original 950 KB if you want 1440 wide | Viewed as plausible Viking-era colour mosaic; exact product provenance not stated on the repo page: verify before crediting a mission. Alternative: Solar System Treks Viking MDIM2.1 colour mosaic (tile endpoint HTTP 200 verified; level 2 gives 2048x1024). |
| Venus | `.../Images%20and%20Textures/Venus/Venus.jpg` | 1440x720, 1,166,974 B; viewed: orange false-colour Magellan radar mosaic (not the visible cloud deck) | **1024x512, 108 KB (measured)** | Teach that Venus' surface is radar-mapped (Magellan) and clouds hide it. Add a separate cloud tint layer for the visible look. |
| Mercury | Solar System Treks tiles: `https://trek.nasa.gov/tiles/Mercury/EQ/Mercury_MESSENGER_MDIS_Basemap_BDR_Mosaic_Global_166m/1.0.0/default/default028mm/{z}/{row}/{col}.jpg` (z=2: rows 0-3, cols 0-7, 32 tiles) | Stitched 2048x1024 grey image; I viewed it, correct and seamless | **1024x512 greyscale, 96 KB (measured)**; 512x256 is 21 KB | **No Mercury folder exists in NASA-3D-Resources.** Full USGS source is 4,247,470,901 B (HEAD): never ship, downsample once. Tint warm grey in the shader. |
| Ceres | USGS Dawn FC global mosaic 400 m: `https://planetarymaps.usgs.gov/mosaic/Ceres_Dawn_FC_DLR_global_20ppd_Oct2015.tif` (page https://astrogeology.usgs.gov/search/map/ceres_dawn_fc_global_mosaic_400m) | 27,280,830 B (HEAD); 20 pixels per degree so ~7200x3600 (derived) | **1024x512 greyscale, ~80-110 KB (estimate; not measured because the 27 MB download timed out)** | Single-band; colour requires another Dawn product (PDS SBN, not verified). |
| Vesta | USGS Dawn FC HAMO global mosaic 60 m: `https://planetarymaps.usgs.gov/mosaic/Vesta_Dawn_FC_HAMO_Mosaic_Global_74ppd.tif` | 356,659,263 B (HEAD); 74 ppd so ~26,640x13,320 (derived) | **1024x512 greyscale, ~80-110 KB (estimate)** | Needs a one-time offline downsample with GDAL/Pillow; do not ship. |
| Bennu (101955) | NASA-3D-Resources model `1999 RQ36 asteroid.glb` (329,596 B) is the practical choice; USGS OCAMS global PAN mosaic 5 cm is 471 MB per the product listing, far too large | GLB + preview PNG 1,290,172 B | Use GLB only (330 KB); no equirectangular texture needed for a ~0.5 km body | The model is a shape model; confirm it is the OSIRIS-REx-era shape (name suggests earlier radar model, 1999 RQ36): unverified. |
| Phobos | `.../Images%20and%20Textures/Mars%20-%20Phobos/Mars%20-%20Phobos.jpg` | 1440x720, 601,584 B (downloaded; viewed: crater map) | **1024x512, 89 KB (measured)** | Shape is 27x22x18 km (NASA Science), not a sphere: prefer a deformed sphere. |
| Europa | `.../Images%20and%20Textures/Jupiter%20-%20Europa/Jupiter%20-%20Europa.jpg` | 1440x720, 610,862 B (API); viewed: greyscale, low contrast | **1024x512, 78 KB (measured)** | Greyscale/inverted look: tint ice-blue; low quality. Better Galileo/Voyager mosaics exist at USGS (not fetched). |
| Ganymede | `.../Jupiter%20-%20Ganymede/Jupiter%20-%20Ganymede.jpg` | 1440x720, 710,923 B; viewed: usable, partial colour | **1024x512, 105 KB (measured)** | Some tonal gaps. |
| Titan | `.../Saturn%20-%20Titan/Saturn%20-%20Titan.jpg` | 720x360, 49,233 B; viewed: **featureless orange gradient** | **Do not ship an image; draw a CSS/shader orange haze sphere (about 2 KB)** | Titan's surface is hidden by haze; NASA Science says atmosphere is ~95% N2, ~5% CH4. Cassini radar maps would need USGS Titan products (not fetched). |
| Extra moons (optional) | Io (A) 702,001 B, Callisto 783,405 B, Enceladus 472 KB, Deimos 480 KB (all 1440x720) in the same repo | downloaded | 1024x512: Io 69 KB, Callisto 121 KB, Enceladus 60 KB, Deimos 46 KB (measured) | Callisto and Enceladus show white no-data regions. |
| Star background | `Images and Textures/Hipparcos Star Map`, `Tycho Star Map`, `Yale Bright Star Map` exist in the repo | not downloaded | not measured | Unverified size; choose one when needed. |

### Image budget (all bodies, 1024x512 unless stated)

Earth 2048 (312) + Moon colour 1k (139) + Moon displacement (112) + Mars (84) + Venus (108) + Mercury (96) + Ceres (~100 est.) + Vesta (~100 est.) + Phobos (89) + Europa (78) + Ganymede (105) + Titan (2) = about **1.33 MB**. Raising Moon to 2k (447 KB) and Mars to the 1440 original (950 KB) still totals about **2.5 MB**, well under 6 MB. Optional Io/Callisto/Enceladus/Deimos add 296 KB.

## 3. Spacecraft 3-D models (NASA-3D-Resources, GLB)

Base URL pattern: `https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/<folder>/<file>.glb` (percent-encode spaces and parentheses). Sizes from the GitHub contents API on 2026-11-05. Licence: statement in section 1.

| Spacecraft / body | Folder and file | GLB size (bytes) | Use |
|---|---|---|---|
| LRO | `Lunar Reconnaissance Orbiter (A)/Lunar Reconnaissance Orbiter (A).glb` | 654,500 | Lunar scenarios (light) |
| LRO (detailed) | `Lunar Reconnaissance Orbiter (B)/...(B).glb` | 2,902,744 | optional |
| MRO | `Mars Reconnaissance Orbiter (MRO) (A)/...(A).glb` | 2,652,460 | Mars relay/imaging |
| Mars Odyssey | `Mars Odyssey/Mars Odyssey.glb` | 5,801,372 | too large unless compressed |
| MAVEN | `Mars Atmosphere and Volatile EvolutioN (MAVEN) (A)/...(A).glb` | 10,465,800 | **too large** (10 MB); skip or decimate |
| Juno | `Juno (B)/Juno (B).glb` | 262,360 | Jupiter radiation scenario (light) |
| Juno (detailed) | `Juno (A)/Juno (A).glb` | 8,999,028 | too large |
| Cassini-Huygens | `Cassini-Huygens (B)/Cassini-Huygens (B).glb` | 413,640 | Saturn/Titan (light); (A) is 1,660,492 B |
| Dawn | `Dawn/Dawn.glb` | 927,020 | Ceres/Vesta |
| MESSENGER | `MErcury Surface, Space ENvironment, GEochemistry, and Ranging (MESSENGER)/...MESSENGER).glb` | 2,673,396 | Mercury |
| Magellan | `Magellan/Magellan.glb` | 3,156,768 | Venus |
| OSIRIS-REx | `Origins, Spectral Interpretation, Resource Identification, and Security - Regolith Explorer (OSIRIS-REx)/OSIRIS-REx.glb` | 1,281,308 | Bennu |
| Bennu shape | `1999 RQ36 asteroid/1999 RQ36 asteroid.glb` | 329,596 | Bennu body |
| Parker Solar Probe | `Parker Solar Probe/Parker Solar Probe.glb` | 443,572 | Heat-shield scenario |
| Landsat 8 (stand-in for Landsat 9) | `Landsat 8/Landsat 8.glb` | 780,280 | Earth observer. **There is no Landsat 9, PACE, Lucy, Psyche or Europa Clipper model in the 227-folder listing** |
| Aqua | `Aqua (A)/Aqua (A).glb` | 1,994,440 | alt Earth observer |
| Galileo | `Galileo/Galileo.glb` | 248,532 | Jupiter flyby/visual |

Recommended ship set: LRO (A) 0.65, Juno (B) 0.26, Cassini (B) 0.41, Dawn 0.93, Parker 0.44, Bennu 0.33, OSIRIS-REx 1.28 = 4.3 MB raw; dropping OSIRIS-REx gives 3.0 MB. Apply meshopt/Draco (not measured) to cut further. Missing for new scenarios (Europa Clipper, Lucy, Psyche, PACE): NASA's 3-D Resources web page (https://science.nasa.gov/3d-resources/) is rendered client-side so I could not enumerate it: **unverified**; use a generic procedural bus as fallback.

## 4. Other visual data worth using

- Earth observation realism: Landsat 9 scene footprint is 190 x 180 km, 15 m panchromatic, 30 m multispectral, 100 m thermal (NASA Fast Facts, https://www.nasa.gov/wp-content/uploads/2015/04/landsat_9_fast_facts.pdf); useful for a "swath" overlay.
- Solar System Treks WMTS layers (https://trek.nasa.gov/): Mars MDIM21 colour mosaic, Mercury MESSENGER mosaics; fetch at build time only.
- NASA Image and Video Library API (https://images-api.nasa.gov/search) for picking hero photos; each item carries its own credit line.
- Real orbit-geometry sanity check from our formulas: Dawn at Vesta 210 km gives 4.30 h and 2,750 km gives 69.4 h, matching NASA's 4.3 h and 69 h; use these as a visual "real vs simulated" overlay.

## 5. Attribution text to display (Credits screen)

> "Planetary maps and spacecraft models: NASA, NASA/JPL-Caltech, NASA Goddard Space Flight Center, NASA Scientific Visualization Studio (Ernie Wright, CGI Moon Kit; LRO/LROC and LOLA teams), NASA Earth Observatory (Blue Marble Next Generation), USGS Astrogeology Science Center, and the NASA 3D Resources collection. Mission and body data: NASA/JPL Solar System Dynamics (SBDB, Horizons), NASA NSSDC, NASA CCMC DONKI. TRAJECTIQ is an independent educational game and is not endorsed by NASA."

Confirm exact per-product credit lines (MESSENGER MDIS, Dawn FC, OCAMS) on each product page when downloading; they were not all read in this pass (**unverified**). Keep the "not endorsed" sentence; omit logos.

## 6. Build steps (offline, one-time)

1. `scripts/fetch-assets.mjs`: download the URLs above (sequential, descriptive User-Agent), verify byte counts match this file, stitch Treks tiles, downsample with Pillow/sharp to the sizes listed, write JPEG q80 to `dist/assets/textures/<id>.jpg`.
2. Write `dist/assets/ASSETS.json` listing file, source URL, fetch date, licence note, credit.
3. CI check: total of `dist/assets/textures` under 6 MB; fail otherwise.
