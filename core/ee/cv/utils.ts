export function calculateContrast(rgb1: number[], rgb2: number[]): number {
  const luminance1 = calculateRelativeLuminance(rgb1);
  const luminance2 = calculateRelativeLuminance(rgb2);

  const contrast =
    (Math.max(luminance1, luminance2) + 0.05) /
    (Math.min(luminance1, luminance2) + 0.05);
  return contrast;
}

function calculateRelativeLuminance(rgb: number[]): number {
  const [r, g, b] = rgb.map((value) => {
    let sRGBValue = value / 255;
    if (sRGBValue <= 0.03928) {
      return sRGBValue / 12.92;
    } else {
      return Math.pow((sRGBValue + 0.055) / 1.055, 2.4);
    }
  });

  const relativeLuminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return relativeLuminance;
}
