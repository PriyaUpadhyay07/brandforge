export type BrandPalette = {
  ramp: string[];
  neutrals: string[];
  complementary: string;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function hexToHsl(hex: string) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }

  return { h: (h + 360) % 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number) {
  const saturation = clamp(s) / 100;
  const lightness = clamp(l) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = ((h % 360) + 360) % 360 / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const [r1, g1, b1] =
    segment < 1 ? [chroma, x, 0] :
    segment < 2 ? [x, chroma, 0] :
    segment < 3 ? [0, chroma, x] :
    segment < 4 ? [0, x, chroma] :
    segment < 5 ? [x, 0, chroma] :
    [chroma, 0, x];
  const match = lightness - chroma / 2;
  const toHex = (value: number) => Math.round((value + match) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`.toUpperCase();
}

export function generatePalette(primary: string): BrandPalette {
  const safe = /^#[0-9a-f]{6}$/i.test(primary) ? primary : "#D8F05A";
  const { h, s, l } = hexToHsl(safe);
  const ramp = Array.from({ length: 10 }, (_, index) => {
    const lightness = 96 - index * 8.4;
    const saturation = Math.min(100, s + (index < 2 ? 2 : index > 7 ? 4 : 0));
    return hslToHex(h, saturation, lightness);
  });
  const neutrals = [
    hslToHex(h, Math.min(16, s * 0.18), 98),
    hslToHex(h, Math.min(14, s * 0.16), 91),
    hslToHex(h, Math.min(12, s * 0.14), 72),
    hslToHex(h, Math.min(10, s * 0.12), 34),
    hslToHex(h, Math.min(12, s * 0.14), 17),
  ];
  return {
    ramp,
    neutrals,
    complementary: hslToHex(h + 180, Math.max(25, s * 0.8), Math.max(38, Math.min(62, l))),
  };
}