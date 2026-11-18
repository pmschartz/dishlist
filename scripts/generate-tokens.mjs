// Generates src/design/tokens.css from src/design/tokens.json (the Dishlist design system's
// tokens). Run after updating tokens.json:  npm run generate-tokens
import { readFileSync, writeFileSync } from 'node:fs';

const tokens = JSON.parse(readFileSync('src/design/tokens.json', 'utf8'));
const [primary, ...otherThemes] = tokens.color.themes.map((t) => t.id);

/** Resolve "{other-token}" aliases within the same family and theme. */
function themeValue(family, token, theme) {
  const raw = typeof token.value === 'string' ? token.value : token.value[theme] ?? token.value[primary];
  const alias = /^\{(.+)\}$/.exec(raw);
  if (!alias) return raw;
  const target = family.find((t) => t.name === alias[1]);
  if (!target) throw new Error(`${token.name}: unknown alias ${raw}`);
  return themeValue(family, target, theme);
}

const themed = [...tokens.color.tokens.map((t) => ['color', t]), ...tokens.shadow.tokens.map((t) => ['shadow', t])];
const familyOf = (kind) => (kind === 'color' ? tokens.color.tokens : tokens.shadow.tokens);
const varsFor = (theme) => themed.map(([kind, t]) => `  --${t.name}: ${themeValue(familyOf(kind), t, theme)};`).join('\n');

const plain = ['spacing', 'radius', 'size', 'zIndex']
  .flatMap((family) => tokens[family].tokens)
  .map((t) => `  --${t.name}: ${t.value};`)
  .join('\n');

const families = Object.entries(tokens.type.families)
  .map(([name, stack]) => `  --font-${name}: ${stack};`)
  .join('\n');

const fontFaces = tokens.type.fonts
  .map(
    (f) => `@font-face {
  font-family: "${f.family}";
  src: url("./${f.file}") format("woff2");
  font-weight: ${f.weight};
  font-style: ${f.style ?? 'normal'};
  font-display: swap;
}`,
  )
  .join('\n');

const typeClasses = tokens.type.groups
  .flatMap((group) =>
    group.styles.map((s) => {
      const decls = [
        `font-family: var(--font-${group.family})`,
        `font-size: ${s.fontSize}`,
        `line-height: ${s.lineHeight}`,
        `font-weight: ${s.fontWeight}`,
        s.letterSpacing ? `letter-spacing: ${s.letterSpacing}` : null,
      ].filter(Boolean);
      return `.${s.name} { ${decls.join('; ')}; }`;
    }),
  )
  .join('\n');

const dark = otherThemes
  .map(
    (theme) => `@media (prefers-color-scheme: ${theme}) {
  :root:not([data-theme="${primary}"]) {
  color-scheme: ${theme};
${varsFor(theme)
  .split('\n')
  .map((l) => '  ' + l)
  .join('\n')}
  }
}
:root[data-theme="${theme}"] {
  color-scheme: ${theme};
${varsFor(theme)}
}`,
  )
  .join('\n');

const css = `/* ${tokens.name} — generated from tokens.json by scripts/generate-tokens.mjs. Do not edit by hand. */
${fontFaces}

:root {
  color-scheme: ${primary};
${varsFor(primary)}
${plain}
${families}
}
${dark}

${typeClasses}
`;

writeFileSync('src/design/tokens.css', css);
console.log(`Wrote src/design/tokens.css (${themed.length} themed tokens, ${tokens.color.themes.length} themes)`);
