// Star sign icon candidates for the style guide (dev only), fetched from the Iconify API on 2026-10-10.
// Tabler (MIT, (c) Paweł Kuna), Lucide (ISC, (c) Lucide Contributors), Huge Icons (MIT, (c) Hugeicons),
// Material Design Icons (Apache-2.0, (c) Pictogrammers). Outline sets are redrawn at Phosphor Bold's
// stroke (2.25 on a 24 grid) so they can be compared with the site's icons. Not used outside /styleguide.
// Regenerate: scratchpad gen_zodiac.py (not part of the app).

export const ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;

export type ZodiacIconSet = {
  name: string;
  license: string;
  url: string;
  style: string;
  /** SVG inner markup per sign, same order as ZODIAC_SIGNS, on a 24×24 viewBox. */
  bodies: string[];
};

export const ZODIAC_ICON_SETS: ZodiacIconSet[] = [
  {
    name: "Tabler",
    license: "MIT",
    url: "https://tabler.io/icons",
    style: "Outline, redrawn at Phosphor Bold weight",
    bodies: [
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"M12 5a5 5 0 1 0-4 8m8 0a5 5 0 1 0-4-8m0 16V5\"/>",
      "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\"><path d=\"M6 3a6 6 0 0 0 12 0\"/><path d=\"M6 15a6 6 0 1 0 12 0a6 6 0 1 0-12 0\"/></g>",
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"M3 3a21 21 0 0 0 18 0M3 21a21 21 0 0 1 18 0M7 4.5v15m10-15v15\"/>",
      "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\"><path d=\"M3 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0m12 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0\"/><path d=\"M3 12a10 6.5 0 0 1 14-6.5m4 6.5a10 6.5 0 0 1-14 6.5\"/></g>",
      "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\"><path d=\"M13 17a4 4 0 1 0 8 0M3 16a3 3 0 1 0 6 0a3 3 0 1 0-6 0m4-9a4 4 0 1 0 8 0a4 4 0 1 0-8 0\"/><path d=\"M7 7c0 3 2 5 2 9m6-9c0 4-2 6-2 10\"/></g>",
      "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\"><path d=\"M3 4a2 2 0 0 1 2 2v9m0-9a2 2 0 0 1 4 0v9m0-9a2 2 0 0 1 4 0v10a7 5 0 0 0 7 5\"/><path d=\"M12 21a7 5 0 0 0 7-5v-2a3 3 0 0 0-6 0\"/></g>",
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"M5 20h14M5 17h5v-.3a7 7 0 1 1 4 0v.3h5\"/>",
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"M3 4a2 2 0 0 1 2 2v9m0-9a2 2 0 0 1 4 0v9m0-9a2 2 0 0 1 4 0v10a3 3 0 0 0 3 3h5l-3-3m0 6l3-3\"/>",
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"M4 20L20 4m-7 0h7v7M6.5 12.5l5 5\"/>",
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"M4 4a3 3 0 0 1 3 3v9m0-9a3 3 0 0 1 6 0v11a3 3 0 0 1-3 3m3-4a3 3 0 1 0 6 0a3 3 0 1 0-6 0\"/>",
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"m3 10l3-3l3 3l3-3l3 3l3-3l3 3M3 17l3-3l3 3l3-3l3 3l3-3l3 3\"/>",
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"M5 3a21 21 0 0 1 0 18M19 3a21 21 0 0 0 0 18M5 12h14\"/>",
    ],
  },
  {
    name: "Lucide",
    license: "ISC",
    url: "https://lucide.dev",
    style: "Outline, redrawn at Phosphor Bold weight",
    bodies: [
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"M12 7.5a4.5 4.5 0 1 1 5 4.5M7 12a4.5 4.5 0 1 1 5-4.5V21\"/>",
      "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\"><circle cx=\"12\" cy=\"15\" r=\"6\"/><path d=\"M18 3A6 6 0 0 1 6 3\"/></g>",
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"M16 4.525v14.948M20 3A17 17 0 0 1 4 3m0 18a17 17 0 0 1 16 0M8 4.525v14.948\"/>",
      "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\"><path d=\"M21 14.5A9 6.5 0 0 1 5.5 19M3 9.5A9 6.5 0 0 1 18.5 5\"/><circle cx=\"17.5\" cy=\"14.5\" r=\"3.5\"/><circle cx=\"6.5\" cy=\"9.5\" r=\"3.5\"/></g>",
      "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\"><path d=\"M10 16c0-4-3-4.5-3-8a5 5 0 0 1 10 0c0 3.466-3 6.196-3 10a3 3 0 0 0 6 0\"/><circle cx=\"7\" cy=\"16\" r=\"3\"/></g>",
      "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\"><path d=\"M11 5.5a1 1 0 0 1 5 0V16a5 5 0 0 0 5 5\"/><path d=\"M16 11.5a1 1 0 0 1 5 0V16a5 5 0 0 1-5 5M6 19V6a3 3 0 0 0-3-3m3 2.5a1 1 0 0 1 5 0V19\"/></g>",
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"M3 16h6.857c.162-.012.19-.323.038-.38a6 6 0 1 1 4.212 0c-.153.057-.125.368.038.38H21M3 20h18\"/>",
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"M10 19V5.5a1 1 0 0 1 5 0V17a2 2 0 0 0 2 2h5l-3-3m3 3l-3 3M5 19V5.5a1 1 0 0 1 5 0m-5 0A2.5 2.5 0 0 0 2.5 3\"/>",
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"M15 3h6v6m0-6L3 21M9 9l6 6\"/>",
      "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\"><path d=\"M11 21a3 3 0 0 0 3-3V6.5a1 1 0 0 0-7 0M7 19V6a3 3 0 0 0-3-3\"/><circle cx=\"17\" cy=\"17\" r=\"3\"/></g>",
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"m2 10l2.456-3.684a.7.7 0 0 1 1.106-.013l2.39 3.413a.7.7 0 0 0 1.096-.001l2.402-3.432a.7.7 0 0 1 1.098 0l2.402 3.432a.7.7 0 0 0 1.098 0l2.389-3.413a.7.7 0 0 1 1.106.013L22 10M2 18.002l2.456-3.684a.7.7 0 0 1 1.106-.013l2.39 3.413a.7.7 0 0 0 1.097 0l2.402-3.432a.7.7 0 0 1 1.098 0l2.402 3.432a.7.7 0 0 0 1.098 0l2.389-3.413a.7.7 0 0 1 1.106.013L22 18.002\"/>",
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"M19 21a15 15 0 0 1 0-18m1 9H4m1-9a15 15 0 0 1 0 18\"/>",
    ],
  },
  {
    name: "Huge Icons",
    license: "MIT",
    url: "https://hugeicons.com",
    style: "Outline, redrawn at Phosphor Bold weight",
    bodies: [
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"M12 20v-1.67m0 0A26.47 26.47 0 0 0 8.61 5.387c-.885-1.578-3.074-1.865-4.347-.568a2.64 2.64 0 0 0-.493 3.02l.47.958M12 18.331a26.47 26.47 0 0 1 3.39-12.945c.885-1.578 3.074-1.865 4.347-.568c.791.807.988 2.012.493 3.02l-.47.958\"/>",
      "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.25\"><circle cx=\"12\" cy=\"15\" r=\"6\"/><path stroke-linecap=\"round\" d=\"M18 3A6 6 0 0 1 6 3\"/></g>",
      "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-width=\"2.25\"><path d=\"M4 3a12.15 12.15 0 0 0 8 3a12.15 12.15 0 0 0 8-3m0 18a12.15 12.15 0 0 0-8-3a12.15 12.15 0 0 0-8 3\"/><path stroke-linejoin=\"round\" d=\"M15 6v12M9 6v12\"/></g>",
      "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.25\"><circle cx=\"6.5\" cy=\"9.5\" r=\"3.5\"/><circle cx=\"17.5\" cy=\"14.5\" r=\"3.5\" transform=\"rotate(180 17.5 14.5)\"/><path stroke-linecap=\"round\" d=\"M3 9.5C3 5.91 7.03 3 12 3c3.483 0 6.504 1.429 8 3.52m1 7.98c0 3.59-4.03 6.5-9 6.5c-3.483 0-6.504-1.429-8-3.52\"/></g>",
      "<g fill=\"none\"><path stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"M7 18a3 3 0 1 0 0-6a3 3 0 0 0 0 6\"/><path fill=\"currentColor\" d=\"M20.75 18a.75.75 0 0 0-1.5 0zm-11.5-3a.75.75 0 0 0 1.5 0zM20 18h-.75A2.25 2.25 0 0 1 17 20.25v1.5A3.75 3.75 0 0 0 20.75 18zm-3 3v-.75A2.25 2.25 0 0 1 14.75 18h-1.5A3.75 3.75 0 0 0 17 21.75zm-7-6h.75c0-2.068-.26-3.621-.515-4.897c-.26-1.305-.485-2.2-.485-3.103h-1.5c0 1.096.276 2.202.515 3.397c.244 1.224.485 2.671.485 4.603zM9 7h.75A3.25 3.25 0 0 1 13 3.75v-1.5A4.75 4.75 0 0 0 8.25 7zm4-4v.75A3.25 3.25 0 0 1 16.25 7h1.5A4.75 4.75 0 0 0 13 2.25zm4 4h-.75c0 2.33-.691 3.958-1.431 5.56c-.736 1.595-1.569 3.247-1.569 5.44h1.5c0-1.807.667-3.155 1.431-4.81c.76-1.648 1.569-3.52 1.569-6.19z\"/></g>",
      "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\"><path d=\"M6 17V7a3 3 0 0 0-3-3m3 13V6.5a2.5 2.5 0 0 1 5 0v9.983M11 17V6.5a2.5 2.5 0 0 1 5 0V15a5 5 0 0 0 5 5\"/><path d=\"M16 14v-2.5a2.5 2.5 0 1 1 5 .001V15a5 5 0 0 1-5 5\"/></g>",
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"M3 15h2.954c.996 0 1.494 0 1.644-.21s-.053-.794-.458-1.96a5.143 5.143 0 1 1 9.72 0c-.405 1.166-.607 1.75-.458 1.96c.15.21.648.21 1.644.21H21M3 18h18\"/>",
      "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\"><path d=\"M2 4a3 3 0 0 1 3 3v10m0 0V6.5a2.5 2.5 0 0 1 5 0v9.983M10 17V6.5a2.5 2.5 0 0 1 5 0V15a2 2 0 0 0 2 2h5\"/><path d=\"M19 14s3.006 2.214 3.006 3.006S19 20.012 19 20.012\"/></g>",
      "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-width=\"2.25\"><path d=\"M3 21L20 4\"/><path stroke-linejoin=\"round\" d=\"m7 9l8 8M13 3.443s6.562-.996 7.557 0c.996.995 0 7.557 0 7.557\"/></g>",
      "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.25\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M3 4a2.935 2.935 0 0 1 2.935 2.935v10.543\"/><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M5.934 17.478V8.033a4.033 4.033 0 0 1 8.065 0V17a3 3 0 0 1-3 3\"/><path d=\"M21 15.5a3.5 3.5 0 1 1-7 0a3.5 3.5 0 0 1 7 0Z\"/></g>",
      "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.25\" d=\"m3 17.933l1.025-1.977c.636-1.228.955-1.843 1.415-1.937a.9.9 0 0 1 .395.004c.458.102.77.728 1.392 1.979c.619 1.243.928 1.865 1.378 1.972a.94.94 0 0 0 .437 0c.45-.107.756-.723 1.37-1.956c.613-1.233.92-1.85 1.37-1.956a.94.94 0 0 1 .436 0c.45.107.757.723 1.37 1.956s.92 1.85 1.37 1.956a.94.94 0 0 0 .437 0c.45-.107.759-.729 1.378-1.972c.622-1.251.933-1.877 1.393-1.98a.9.9 0 0 1 .394-.003c.46.094.779.709 1.415 1.937L21 17.933m-18-8l1.025-1.977C4.66 6.728 4.98 6.113 5.44 6.02a.9.9 0 0 1 .395.004c.458.102.77.728 1.392 1.979c.619 1.243.928 1.865 1.378 1.972a.94.94 0 0 0 .437 0c.45-.107.756-.723 1.37-1.956c.613-1.233.92-1.85 1.37-1.956a.94.94 0 0 1 .436 0c.45.107.757.723 1.37 1.956s.92 1.85 1.37 1.956a.94.94 0 0 0 .437 0c.45-.107.759-.729 1.378-1.972c.622-1.251.933-1.877 1.393-1.98a.9.9 0 0 1 .394-.003c.46.094.779.709 1.415 1.937L21 9.933\"/>",
      "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-width=\"2.25\"><path d=\"M18 3c-1.87 2.42-3 5.564-3 9s1.13 6.58 3 9M6 21c1.87-2.42 3-5.564 3-9S7.87 5.42 6 3\"/><path stroke-linejoin=\"round\" d=\"M19 12H5\"/></g>",
    ],
  },
  {
    name: "Material Design Icons",
    license: "Apache-2.0",
    url: "https://pictogrammers.com/library/mdi/",
    style: "Filled",
    bodies: [
      "<path fill=\"currentColor\" d=\"M16 2c-1.05 0-2.09.27-3 .81c-.36.19-.7.45-1 .73c-.3-.28-.64-.54-1-.73C10.09 2.27 9.05 2 8 2a6 6 0 0 0-6 6a6 6 0 0 0 6 6v-2a4 4 0 0 1-4-4a4 4 0 0 1 4-4a4.03 4.03 0 0 1 3 1.36V22h2V5.36c.08-.09.16-.18.25-.26a4 4 0 0 1 5.66.15a3.997 3.997 0 0 1-.15 5.65C18 11.61 17.03 12 16 12v2a6 6 0 0 0 6-6a6 6 0 0 0-6-6\"/>",
      "<path fill=\"currentColor\" d=\"M15.59 9A7 7 0 0 0 19 3h-2a5 5 0 0 1-5 5a5 5 0 0 1-5-5H5c0 2.46 1.3 4.74 3.41 6C5.09 11 4 15.28 6 18.6c1.97 3.32 6.27 4.4 9.59 2.4c3.32-1.96 4.41-6.26 2.41-9.58A6.9 6.9 0 0 0 15.59 9M12 20a5 5 0 0 1-5-5a5 5 0 0 1 5-5a5 5 0 0 1 5 5a5 5 0 0 1-5 5\"/>",
      "<path fill=\"currentColor\" d=\"M18 5.3c1.35-.33 2.66-.76 3.94-1.3l-.76-1.86a23.75 23.75 0 0 1-18.36.03L2.06 4c1.28.54 2.59.97 3.94 1.3v13.4c-1.35.33-2.66.76-3.94 1.3l.76 1.86a23.94 23.94 0 0 1 18.36 0l.76-1.86c-1.28-.54-2.59-.97-3.94-1.3zm-10 13V5.69c1.32.2 2.66.31 4 .31s2.68-.11 4-.31v12.62a26.2 26.2 0 0 0-8 0z\"/>",
      "<path fill=\"currentColor\" d=\"M12 4C6.5 4 2 7.58 2 12c0 2.12 1.65 3.87 3.76 4H6a4 4 0 0 0 4-4a4 4 0 0 0-4-4h-.24A8.8 8.8 0 0 1 12 5.6c1.77-.02 3.5.47 5 1.4l1.25-1.25A11.5 11.5 0 0 0 12 4m-6 6a2 2 0 0 1 2 2c0 1.11-.92 2-2 2a2 2 0 0 1-2-1.8v-.4A2 2 0 0 1 6 10m12.24-2H18a4 4 0 0 0-4 4a4 4 0 0 0 4 4h.24A8.8 8.8 0 0 1 12 18.4c-1.77.02-3.5-.47-5-1.4l-1.24 1.24C7.63 19.41 9.79 20 12 20c5.5 0 10-3.58 10-8c0-2.12-1.65-3.87-3.76-4M18 14a2 2 0 0 1-2-2c0-1.11.92-2 2-2a2 2 0 0 1 2 1.8v.4a2 2 0 0 1-2 1.8\"/>",
      "<path fill=\"currentColor\" d=\"M20 17a3 3 0 0 1-3 3a3.163 3.163 0 0 1-3-3c.16-1.61.5-3.2 1-4.74c.54-1.71.87-3.47 1-5.26a5.136 5.136 0 0 0-5-5a5.136 5.136 0 0 0-5 5c.15 1.53.5 3.03 1 4.5l.21.7c-2.11-.67-4.35.5-5.02 2.6c-.69 2.11.49 4.36 2.6 5.03s4.35-.5 5.02-2.61c.13-.39.19-.81.19-1.22c-.16-1.73-.5-3.44-1.09-5.08A18.8 18.8 0 0 1 8 7a3.163 3.163 0 0 1 3-3c1.62.08 2.92 1.38 3 3a22.6 22.6 0 0 1-1 4.74c-.54 1.71-.87 3.47-1 5.26a5.136 5.136 0 0 0 5 5a5 5 0 0 0 5-5zM6 18a2 2 0 0 1-2-2a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2\"/>",
      "<path fill=\"currentColor\" d=\"M18.5 19.13C20 17.77 20 15.18 20 14a4 4 0 0 0-4-4c-.7 0-1.4.2-2 .56V6a3 3 0 0 0-3-3c-.75 0-1.45.29-2 .78a2.997 2.997 0 0 0-4 0C4.45 3.28 3.74 3 3 3v2a1 1 0 0 1 1 1v10h2V6a1 1 0 0 1 1-1a1 1 0 0 1 1 1v10h2V6a1 1 0 0 1 1-1a1 1 0 0 1 1 1v8c0 1.18 0 3.77 1.5 5.13c-.78.41-1.62.71-2.5.87v2c1.29 0 3.84-1.26 5-1.87c1.16.61 3.71 1.87 5 1.87v-2c-.88-.16-1.72-.46-2.5-.87M16 12a2 2 0 0 1 2 2c0 2.92-.54 4-2 4s-2-1.08-2-4a2 2 0 0 1 2-2\"/>",
      "<path fill=\"currentColor\" d=\"M20 16v2h-7v-2.09c3-.55 4.96-3.41 4.41-6.41S14 4.54 11 5.09C8 5.65 6.04 8.5 6.59 11.5c.41 2.24 2.17 4 4.41 4.41V18H4v-2h2.92a7.43 7.43 0 0 1-2.42-5.5A7.5 7.5 0 0 1 12 3a7.5 7.5 0 0 1 7.5 7.5c0 2.09-.87 4.09-2.42 5.5zm0 3H4v2h16z\"/>",
      "<path fill=\"currentColor\" d=\"m17.71 15.29l-1.42 1.42l1.3 1.29H16a2 2 0 0 1-2-2V6a3 3 0 0 0-3-3c-.75 0-1.45.29-2 .78a2.997 2.997 0 0 0-4 0C4.45 3.28 3.74 3 3 3v2a1 1 0 0 1 1 1v10h2V6a1 1 0 0 1 1-1a1 1 0 0 1 1 1v10h2V6a1 1 0 0 1 1-1a1 1 0 0 1 1 1v10a4 4 0 0 0 4 4h1.59l-1.3 1.29l1.42 1.42l3.7-3.71z\"/>",
      "<path fill=\"currentColor\" d=\"M22 2v10h-2V5.41L10.41 15l2.3 2.29l-1.42 1.42L9 16.41l-5.29 5.3l-1.42-1.42L7.59 15l-2.3-2.29l1.42-1.42L9 13.59L18.59 4H12V2z\"/>",
      "<path fill=\"currentColor\" d=\"M15 13c-.7 0-1.39.19-2 .55V6a3 3 0 0 0-3-3c-.75 0-1.45.29-2 .78C7.45 3.28 6.74 3 6 3v2a1 1 0 0 1 1 1v10h2V6a1 1 0 0 1 1-1a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2v2c1.15 0 2.25-.5 3-1.38a3.974 3.974 0 0 0 5.64.38c1.67-1.42 1.86-3.95.4-5.62A4.01 4.01 0 0 0 15 13m0 6a2 2 0 0 1-2-2a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2\"/>",
      "<path fill=\"currentColor\" d=\"m15 12.41l-3-3l-3 3l-3-3l-2.29 2.3l-1.42-1.42L6 6.59l3 3l3-3l3 3l3-3l3.71 3.7l-1.42 1.42L18 9.41zm3 3l2.29 2.3l1.42-1.42l-3.71-3.7l-3 3l-3-3l-3 3l-3-3l-3.71 3.7l1.42 1.42L6 15.41l3 3l3-3l3 3z\"/>",
      "<path fill=\"currentColor\" d=\"M20 11h-2c.11-2.81.73-5.58 1.81-8.18L18 2.06A26 26 0 0 0 16 11H8c-.13-3.08-.81-6.1-2-8.94l-1.86.76C5.24 5.41 5.87 8.18 6 11H4v2h2a23.8 23.8 0 0 1-1.81 8.18l1.81.76C7.19 19.1 7.87 16.08 8 13h8c.13 3.08.81 6.1 2 8.94l1.86-.76c-1.1-2.59-1.73-5.36-1.86-8.18h2z\"/>",
    ],
  },
];
