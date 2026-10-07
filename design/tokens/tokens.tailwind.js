/**
 * La Bonne Tablée — thème Tailwind v3.
 *
 * Usage :
 *   const lbt = require('./design-system/tokens/tokens.tailwind.js');
 *   module.exports = { theme: { extend: { ...lbt.theme.extend } } };
 *
 * Pour Tailwind v4, préférer tokens.tailwind-v4.css.
 */

module.exports = {
  theme: {
    extend: {
      colors: {
        terracotta: '#DB5A3B',
        creme: '#FAF7F2',
        sauge: '#5B8266',
        ardoise: '#2B2B2B',
        // Extension à valider : contraste AA pour les titres de moins de 24 px.
        'sauge-fonce': '#3F5A48',
      },
      fontFamily: {
        titres: ['Chewy', 'Comic Sans MS', 'cursive'],
        texte: ['DM Sans', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['2rem', { lineHeight: '2.375rem', letterSpacing: '-0.5px' }],
        'display-lg': ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.4px' }],
        'title-lg': ['1.5rem', { lineHeight: '1.875rem', letterSpacing: '-0.3px' }],
        'title-md': ['1.25rem', { lineHeight: '1.625rem', letterSpacing: '-0.2px' }],
        'title-sm': ['1.125rem', { lineHeight: '1.5rem', letterSpacing: '-0.2px' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.5625rem', letterSpacing: '-0.2px' }],
        'body-lg-strong': ['1.0625rem', { lineHeight: '1.5625rem', letterSpacing: '-0.2px', fontWeight: '700' }],
        'body-md': ['0.9375rem', { lineHeight: '1.375rem', letterSpacing: '0px' }],
        'body-sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0px' }],
        'label-md': ['0.9375rem', { lineHeight: '1.25rem', letterSpacing: '0px', fontWeight: '500' }],
        'label-sm': ['0.8125rem', { lineHeight: '1.125rem', letterSpacing: '0.1px', fontWeight: '500' }],
        'button-lg': ['1.125rem', { lineHeight: '1.5rem', letterSpacing: '0px', fontWeight: '700' }],
        'button-md': ['1rem', { lineHeight: '1.375rem', letterSpacing: '0px', fontWeight: '500' }],
        'nav-label': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.1px', fontWeight: '500' }],
        micro: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.1px' }],
      },
    },
  },
};
