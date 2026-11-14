import { describe, expect, it } from 'vitest';
import { extraireBrouillon, modelesGemini, normaliserWantedGemini, tronquerTexte } from './routes/ai';

describe('extraction du brouillon IA', () => {
  it('découpe JSON + description + AMBIANCE', () => {
    const reponse = [
      '{"dishName":"Gratin dauphinois","wantedContributions":[{"label":"Pommes de terre","quantity":1,"unit":"KG"}],"seatsTotal":4,"durationMinutes":120}',
      '',
      'Un gratin crémeux et fondant, aux pommes de terre fines.',
      'Il mijote doucement au four et réconforte.',
      '',
      'AMBIANCE :',
      '',
      "Une tablée chaleureuse autour d'un plat qui réconforte.",
      'On partage, on rit, on prolonge la soirée.',
    ].join('\n');
    const brouillon = extraireBrouillon(reponse);
    expect((brouillon.data as Record<string, unknown>)['dishName']).toBe('Gratin dauphinois');
    expect(brouillon.description).toBe(
      'Un gratin crémeux et fondant, aux pommes de terre fines. Il mijote doucement au four et réconforte.',
    );
    expect(brouillon.ambiance).toBe(
      "Une tablée chaleureuse autour d'un plat qui réconforte. On partage, on rit, on prolonge la soirée.",
    );
  });

  it('supporte JSON indenté et marqueur en gras avec contenu sur la même ligne', () => {
    const reponse = [
      '```json',
      '{',
      '  "dishName": "Soupe",',
      '  "wantedContributions": [],',
      '  "seatsTotal": 6,',
      '  "durationMinutes": 90',
      '}',
      '```',
      'Soupe douce aux légumes de saison.',
      '**AMBIANCE :** Moment calme et doux partagé.',
    ].join('\n');
    const brouillon = extraireBrouillon(reponse);
    expect((brouillon.data as Record<string, unknown>)['dishName']).toBe('Soupe');
    expect(brouillon.description).toBe('Soupe douce aux légumes de saison.');
    expect(brouillon.ambiance).toBe('Moment calme et doux partagé.');
  });

  it('garde la compatibilité avec l’ancien JSON complet', () => {
    const brouillon = extraireBrouillon(
      '{"dishName":"X","description":"D","ambiance":"A","wantedContributions":[],"seatsTotal":2,"durationMinutes":60}',
    );
    expect(brouillon.description).toBe('D');
    expect(brouillon.ambiance).toBe('A');
  });

  it('renvoie vide sur texte inexploitable', () => {
    expect(extraireBrouillon('bonjour')).toEqual({ data: null, description: null, ambiance: null });
    expect(extraireBrouillon(null)).toEqual({ data: null, description: null, ambiance: null });
  });

  it('extrait les paragraphes même sans JSON quand le marqueur est là', () => {
    const brouillon = extraireBrouillon(
      ['Un plat généreux et parfumé.', '', 'AMBIANCE :', 'Une soirée douce aux chandelles.'].join('\n'),
    );
    expect(brouillon.data).toBeNull();
    expect(brouillon.description).toBe('Un plat généreux et parfumé.');
    expect(brouillon.ambiance).toBe('Une soirée douce aux chandelles.');
  });
});

describe('normalisation des ingrédients IA', () => {
  it('filtre unités et quantités invalides', () => {
    expect(
      normaliserWantedGemini([
        { label: 'Pommes de terre', quantity: 1, unit: 'kg' },
        { label: 'Sel', quantity: -2, unit: 'G' },
        { label: 'Poivre', quantity: 1, unit: 'POIGNEE' },
        { label: '  ', quantity: 1, unit: 'G' },
      ]),
    ).toEqual([
      { label: 'Pommes de terre', quantity: 1, unit: 'KG' },
      { label: 'Sel', quantity: null, unit: 'G' },
      { label: 'Poivre', quantity: 1, unit: null },
    ]);
  });

  it('rejette les non-tableaux', () => {
    expect(normaliserWantedGemini(null)).toBeNull();
    expect(normaliserWantedGemini({})).toBeNull();
  });
});

describe('limite de 300 caractères de l’ambiance', () => {
  it('laisse tel quel sous la limite', () => {
    expect(tronquerTexte('Soirée douce aux chandelles.', 300)).toBe('Soirée douce aux chandelles.');
  });

  it('coupe à la dernière phrase complète', () => {
    const texte =
      'Une grande tablée en bois vous attend sous des guirlandes chaudes. Les rires fusent déjà autour du plat qui fume. La soirée ne fait que commencer et tout le monde se sent bien.';
    const coupe = tronquerTexte(texte, 120);
    expect(coupe.length).toBeLessThanOrEqual(120);
    expect(coupe.endsWith('.')).toBe(true);
    expect(coupe).toBe('Une grande tablée en bois vous attend sous des guirlandes chaudes. Les rires fusent déjà autour du plat qui fume.');
  });

  it('coupe net sans phrase complète', () => {
    const coupe = tronquerTexte('x'.repeat(400), 300);
    expect(coupe).toBe('x'.repeat(300));
  });
});

describe('chaîne de modèles Gemini', () => {
  it('essaie 3.8-flash puis les replis, sans doublon', () => {
    const modeles = modelesGemini({} as never);
    expect(modeles[0]).toBe('gemini-3.8-flash');
    expect(new Set(modeles).size).toBe(modeles.length);
    expect(modeles).toContain('gemini-2.5-flash');
  });

  it('place le modèle forcé en tête', () => {
    const modeles = modelesGemini({ GEMINI_MODEL: 'gemini-2.5-flash' } as never);
    expect(modeles[0]).toBe('gemini-2.5-flash');
    expect(new Set(modeles).size).toBe(modeles.length);
  });
});
