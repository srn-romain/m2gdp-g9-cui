import { describe, expect, it } from 'vitest';
import { computeTags, normalizeTexte } from '../seed/dietary-rules.mjs';

describe('moteur de régimes alimentaires', () => {
  it('normalise casse et accents', () => {
    expect(normalizeTexte('Bœuf Bourguignon')).toBe('boeuf bourguignon');
    expect(normalizeTexte('Crème brûlée')).toBe('creme brulee');
  });

  it('taggue les mentions explicites', () => {
    expect(computeTags('Buddha bowl vegan', [])).toEqual(['VEGAN', 'VEGETARIAN', 'NO_PORK']);
    expect(computeTags('Chili sin carne', [])).toEqual(['VEGETARIAN', 'NO_PORK']);
    expect(computeTags('Poulet halal', [])).toBeNull();
  });

  it('ne taggue jamais un plat carné', () => {
    expect(computeTags('Bœuf bourguignon', ['Carottes'])).toBeNull();
    expect(computeTags('Quiche lorraine', ['Lardons'])).toBeNull();
    expect(computeTags('Tempura de brocoli et sauce nuoc-mâm', [])).toBeNull();
    expect(computeTags('Gratin dauphinois', ['Porc'])).toBeNull();
  });

  it('infère le végétarien sur indices concordants', () => {
    expect(computeTags('Gratin dauphinois', [])).toEqual(['VEGETARIAN', 'NO_PORK']);
    expect(computeTags('Chakchouka yéménite', [])).toEqual(['VEGETARIAN', 'NO_PORK']);
    expect(computeTags('Empanadas au chocolat', [])).toEqual(['VEGETARIAN']);
    expect(computeTags('Empanadas', ['Oignons', 'Fromage'])).toEqual([
      'VEGETARIAN',
    ]);
  });

  it('reste muet sur les plats ambigus ou sans indice', () => {
    expect(computeTags('Tajine', ['Semoule', 'Légumes'])).toBeNull();
    expect(computeTags('Ramen', ['Nouilles', 'Bouillon'])).toBeNull();
    expect(computeTags('Boulettes norvégiennes aux pommes de terre', ['Pommes de terre'])).toBeNull();
    expect(computeTags('Soupe', ['Eau'])).toBeNull();
    expect(computeTags('Bortsch', [])).toBeNull();
  });

  it('honore le drapeau végétarien legacy sans viande', () => {
    expect(computeTags('Plat mystère', [], { isVegetarian: true })).toEqual(['VEGETARIAN', 'NO_PORK']);
    expect(computeTags('Poulet mystère', [], { isVegetarian: true })).toBeNull();
  });
});
