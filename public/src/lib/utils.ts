import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * L'échelle typographique de la charte utilise des noms personnalisés
 * (`text-title-lg`, `text-button-md`…). Sans cet enregistrement, tailwind-merge
 * les classe comme des couleurs et supprime `text-terracotta` ou
 * `text-primary-foreground` de la même liste de classes.
 */
const TAILLES_TEXTE = [
  'display-xl', 'display-lg',
  'title-lg', 'title-md', 'title-sm',
  'body-lg', 'body-lg-strong', 'body-md', 'body-sm',
  'label-md', 'label-sm',
  'button-lg', 'button-md', 'nav-label', 'micro',
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: TAILLES_TEXTE }],
    },
  },
});

/** Fusionne des classes conditionnelles en resolvant les conflits Tailwind. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
