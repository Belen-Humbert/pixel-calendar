// Íconos pixel 8×8: cada '#' es un píxel pintado.
const GRIDS = {
  coin:     ['..####..', '.######.', '###.####', '###.####', '###.####', '###.####', '.######.', '..####..'],
  check:    ['........', '......##', '.....##.', '#...##..', '##.##...', '.###....', '..#.....', '........'],
  plus:     ['...##...', '...##...', '...##...', '########', '########', '...##...', '...##...', '...##...'],
  x:        ['##....##', '###..###', '.######.', '..####..', '..####..', '.######.', '###..###', '##....##'],
  clock:    ['..####..', '.#....#.', '#..#...#', '#..#...#', '#..###.#', '#......#', '.#....#.', '..####..'],
  repeat:   ['.#####..', '#.....#.', '#......#', '........', '........', '#......#', '.#.....#', '..#####.'],
  trash:    ['..####..', '########', '........', '.######.', '.#.##.#.', '.#.##.#.', '.#.##.#.', '..####..'],
  pencil:   ['......##', '.....###', '....###.', '...###..', '..###...', '.###....', '##......', '#.......'],
  left:     ['....#...', '...##...', '..###...', '.####...', '..###...', '...##...', '....#...', '........'],
  right:    ['...#....', '...##...', '...###..', '...####.', '...###..', '...##...', '...#....', '........'],
  sound:    ['...#....', '..##..#.', '####...#', '####.#.#', '####.#.#', '####...#', '..##..#.', '...#....'],
  mute:     ['...#....', '..##....', '####.#.#', '####..#.', '####..#.', '####.#.#', '..##....', '...#....'],
  user:     ['..####..', '..####..', '..####..', '...##...', '.######.', '########', '########', '........'],
  cloud:    ['........', '...###..', '..#####.', '.#######', '########', '########', '........', '........'],
  google:   ['..####..', '.#....#.', '#.......', '#...####', '#......#', '#......#', '.#....#.', '..####..'],
  trophy:   ['#.####.#', '#.####.#', '.######.', '..####..', '...##...', '...##...', '..####..', '........'],
  // categorías
  lectura:   ['........', '###..###', '#..##..#', '#..##..#', '#..##..#', '###..###', '...##...', '........'],
  ejercicio: ['........', '##....##', '##....##', '########', '##....##', '##....##', '........', '........'],
  programar: ['........', '..#..#..', '.#..#.#.', '#..#...#', '.#.#..#.', '..#..#..', '........', '........'],
  estudiar:  ['...##...', '.######.', '########', '.######.', '.#....#.', '.######.', '......#.', '......#.'],
  trabajo:   ['........', '..####..', '..#..#..', '########', '########', '#..##..#', '########', '........'],
  play:      ['...##...', '..####..', '..####..', '...##...', '...##...', '########', '########', '.#....#.'],
  novia:     ['.##..##.', '########', '########', '########', '.######.', '..####..', '...##...', '........'],
  tv:        ['..#..#..', '...##...', '########', '#......#', '#......#', '#......#', '########', '.#....#.'],
  otra:      ['...##...', '...##...', '########', '.######.', '..####..', '.##..##.', '##....##', '........'],
  // pestañas
  cal:   ['.#....#.', '########', '#......#', '#.#.#..#', '#......#', '#.#.#..#', '########', '........'],
  chart: ['......#.', '......#.', '...#..#.', '...#..#.', '#..#..#.', '#..#..#.', '########', '........'],
};

const PATHS = Object.fromEntries(Object.entries(GRIDS).map(([k, rows]) => [
  k,
  rows.map((row, y) => [...row].map((ch, x) => ch === '#' ? `M${x} ${y}h1v1h-1z` : '').join('')).join(''),
]));

/** Devuelve un <svg> pixel listo para insertar. */
export function icon(name, size = 20, color = 'currentColor') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true"><path d="${PATHS[name] || ''}" fill="${color}"/></svg>`;
}

/** Dibujo pixel de varios colores: cada letra de la grilla es un color de la paleta. */
export function pixelArt(rows, palette, width, extra = '') {
  const w = rows[0].length, h = rows.length, byColor = {};
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (palette[ch]) (byColor[ch] = byColor[ch] || []).push(`M${x} ${y}h1v1h-1z`);
  }));
  const paths = Object.entries(byColor).map(([ch, d]) => `<path d="${d.join('')}" fill="${palette[ch]}"/>`).join('');
  return `<svg width="${width}" height="${Math.round((width * h) / w)}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" ${extra}>${paths}</svg>`;
}

export const ART = {
  // él: rulos, lentes, buzo azul
  alejo: [
    '.....HH.HHH.HH......',
    '...HHhHHHhHHHhHH....',
    '..HhHHhHHHhHHHhHH...',
    '.HHHhHHHhHHHhHHHhH..',
    '.HhHHHhHHHhHHHhHHHH.',
    '.HHHSHHSSHHSSHhSHHH.',
    '.HHSSSSSSSSSSSSSSHH.',
    '..SGGGGGGSSGGGGGGS..',
    '.sSGwEWWGGGGwEWWGSs.',
    '..SGWWWWGSSGWWWWGS..',
    '..SGGGGGGSSGGGGGGS..',
    '..SSSSSSSssSSSSSSS..',
    '..SSSSSSSSSSSSSSSS..',
    '..SSSMTTTTTTTTMSSS..',
    '..sSSSMTTTTTTMSSSs..',
    '...sSSSMMMMMMSSSs...',
    '....sSSSSSSSSSSs....',
    '......sSSSSSSs......',
    '...CCCCsSSSSsCCCC...',
    '..BBCCCCsSSsCCCCBB..',
    '.BBBBBBCCCCCCBBBBBB.',
    'BBBBBBBBDBBDBBBBBBBB',
    'BbBBBBBBDBBDBBBBBBbB',
  ],
  alejoBlink: [
    '.....HH.HHH.HH......',
    '...HHhHHHhHHHhHH....',
    '..HhHHhHHHhHHHhHH...',
    '.HHHhHHHhHHHhHHHhH..',
    '.HhHHHhHHHhHHHhHHHH.',
    '.HHHSHHSSHHSSHhSHHH.',
    '.HHSSSSSSSSSSSSSSHH.',
    '..SGGGGGGSSGGGGGGS..',
    '.sSGWWWWGGGGWWWWGSs.',
    '..SGWEEWGSSGWEEWGS..',
    '..SGGGGGGSSGGGGGGS..',
    '..SSSSSSSssSSSSSSS..',
    '..SSSSSSSSSSSSSSSS..',
    '..SSSMTTTTTTTTMSSS..',
    '..sSSSMTTTTTTMSSSs..',
    '...sSSSMMMMMMSSSs...',
    '....sSSSSSSSSSSs....',
    '......sSSSSSSs......',
    '...CCCCsSSSSsCCCC...',
    '..BBCCCCsSSsCCCCBB..',
    '.BBBBBBCCCCCCBBBBBB.',
    'BBBBBBBBDBBDBBBBBBBB',
    'BbBBBBBBDBBDBBBBBBbB',
  ],
  spider: ['.P...P.', '..PPP..', 'PPPPPPP', '..PPP..', '.P...P.', 'P.....P'],
  // nube con flecha para "guardar en la nube"
  cloud: [
    '......................',
    '.........LLLL.........',
    '.......LLLLLLLL.......',
    '......LLLLLDDLLL......',
    '...LLLLLLLDDDDLLLL....',
    '..LLLLLLLDDDDDDLLLLL..',
    '.LLLLLLLDDDDDDDDLLLLL.',
    'LLLLLLLLLLLDDLLLLLLLLL',
    'LLLLLLLLLLLDDLLLLLLLLL',
    'LLLLLLLLLLLDDLLLLLLLLL',
    'SSSSSSSSSSSDDSSSSSSSSS',
    '.SSSSSSSSSSSSSSSSSSSS.',
  ],
  coin: ['.YYYY.', 'YYOYYY', 'YYOYYY', 'YYOYYY', 'YYOYYY', '.YYYY.'],
  // G de Google en pixel
  g: [
    '..RRRR..',
    '.RR..RR.',
    'RR......',
    'YY..BBBB',
    'YY....BB',
    'YY....BB',
    '.GG..BB.',
    '..GGGG..',
  ],
};
export const PAL = {
  alejo: { H: '#1d1620', h: '#463642', S: '#b07a55', s: '#8c5e40', G: '#605c5c', W: '#d6aa86', w: '#e8f4f7',
    E: '#1a1414', M: '#5a262a', T: '#faf8f4', B: '#3b6fd8', b: '#2c56ad', C: '#244896', D: '#e6e9f5' },
  spider: { P: '#c9c6ee' },
  cloud: { L: '#d9d6f0', S: '#a9a4d6', D: '#17162a' },
  coin: { Y: '#ffd35a', O: '#c9971c' },
  g: { R: '#ea4335', Y: '#fbbc05', G: '#34a853', B: '#4285f4' },
};
