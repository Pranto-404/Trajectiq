# Asset attribution

All images below were downloaded once at development time (2026-11-05) from the URLs listed in `docs/plan/ASSETS.md`,
checked by viewing them, resized with Pillow (Lanczos, JPEG, progressive) and bundled. Nothing is loaded over the network
at runtime (CSP `connect-src 'self'`). The same text is exported as `ASSET_CREDITS` from `src/features/stage/credits.js`.

Licence basis: NASA Images and Media Usage Guidelines (https://www.nasa.gov/nasa-brand-center/images-and-media/):
NASA content, including texture maps, is generally not subject to copyright in the United States; educational use in
computer graphical simulations and web pages is allowed; NASA must be acknowledged as the source; the NASA insignia
and logotype are not used and no endorsement is implied. The NASA-3D-Resources repository has no LICENSE file; the NASA
guidelines are treated as the controlling terms.

| File | Source URL (original) | Original | Shipped | Credit |
|---|---|---|---|---|
| `textures/earth.jpg` | https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/december/world.topo.bathy.200412.3x5400x2700.jpg | 5400x2700, 2,566,770 B | 2048x1024, 288,946 B | NASA Earth Observatory, Blue Marble Next Generation |
| `textures/moon.jpg` | https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_1k.jpg | 1024x512, 139,068 B | 1024x512, 113,080 B (recompressed) | NASA SVS CGI Moon Kit (Ernie Wright); LRO/LROC |
| `textures/mars.jpg` | https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/Images%20and%20Textures/Mars/Mars.jpg | 1440x720, 972,896 B | 1024x512, 84,810 B | NASA 3D Resources |
| `textures/venus.jpg` | https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/Images%20and%20Textures/Venus/Venus.jpg | 1440x720, 1,166,974 B | 1024x512, 102,285 B | NASA 3D Resources; false-colour Magellan radar |

Total shipped images: about 589 KB (limit 6 MB). Byte counts of the downloads matched `docs/plan/ASSETS.md`.

Verified by eye: Earth, Moon, Mars and Venus are genuine equirectangular maps. The Apollo-photograph `Moon.jpg` of
NASA-3D-Resources and the featureless Titan texture were NOT used. Mars: the exact product (Viking-era mosaic?) is not
stated by the repository, so it is credited to the NASA 3D Resources collection only. Venus is a radar map, not the
visible cloud deck; the stage draws a bright haze shell over it.

Not shipped, drawn procedurally (no NASA imagery): Mercury (no NASA-3D-Resources folder exists; the MESSENGER mosaic
needs build-time stitching), Ceres, Vesta (source mosaics are 27 MB and 357 MB), Europa (low-quality greyscale map).
No 3D models are shipped: spacecraft are procedural and fictional.
