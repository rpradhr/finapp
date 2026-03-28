import { describe, it, expect } from 'vitest';
import { parseIntent } from '../../src/services/nlp';

describe('NLP Parser', () => {
  describe('Query intents', () => {
    it('parses "how much did I spend on groceries in 2023"', () => {
      const result = parseIntent('how much did I spend on groceries in 2023');
      expect(result.type).toBe('query');
      expect(result.category).toBe('Food');
      expect(result.period).toBe('2023');
    });

    it('parses "what did I spend on travel in 2024"', () => {
      const result = parseIntent('what did I spend on travel in 2024');
      expect(result.type).toBe('query');
      expect(result.category).toBe('Travel');
      expect(result.period).toBe('2024');
    });

    it('parses "total food spending"', () => {
      const result = parseIntent('total food spending');
      expect(result.type).toBe('query');
      expect(result.category).toBe('Food');
    });

    it('parses "show me grocery expenses in 2023"', () => {
      const result = parseIntent('show me grocery expenses in 2023');
      expect(result.type).toBe('query');
      expect(result.category).toBe('Food');
      expect(result.period).toBe('2023');
    });

    it('parses "how much did I spend in 2023"', () => {
      const result = parseIntent('how much did I spend in 2023');
      expect(result.type).toBe('query');
      expect(result.period).toBe('2023');
    });
  });

  describe('Add intents', () => {
    it('parses "add $50 for groceries at Wegmans"', () => {
      const result = parseIntent('add $50 for groceries at Wegmans');
      expect(result.type).toBe('add');
      expect(result.amount).toBe(50);
      expect(result.category).toBe('Food');
      expect(result.merchant).toBe('Wegmans');
    });

    it('parses "spent $120 on gas"', () => {
      const result = parseIntent('spent $120 on gas');
      expect(result.type).toBe('add');
      expect(result.amount).toBe(120);
      expect(result.category).toBe('Transportation');
    });

    it('parses "add 45.50 dining at Olive Garden"', () => {
      const result = parseIntent('add 45.50 dining at Olive Garden');
      expect(result.type).toBe('add');
      expect(result.amount).toBe(45.50);
      expect(result.category).toBe('Food');
      expect(result.merchant).toBe('Olive Garden');
    });

    it('parses "log $200 for education"', () => {
      const result = parseIntent('log $200 for education');
      expect(result.type).toBe('add');
      expect(result.amount).toBe(200);
      expect(result.category).toBe('Education');
    });
  });

  describe('Compare intents', () => {
    it('parses "compare 2023 vs 2024"', () => {
      const result = parseIntent('compare 2023 vs 2024');
      expect(result.type).toBe('compare');
      expect(result.period).toBe('2023');
      expect(result.period2).toBe('2024');
    });

    it('parses "compare 2022 to 2023"', () => {
      const result = parseIntent('compare 2022 to 2023');
      expect(result.type).toBe('compare');
      expect(result.period).toBe('2022');
      expect(result.period2).toBe('2023');
    });
  });

  describe('Top intents', () => {
    it('parses "top spending categories"', () => {
      const result = parseIntent('top spending categories');
      expect(result.type).toBe('top');
    });

    it('parses "biggest expenses last year"', () => {
      const result = parseIntent('biggest expenses last year');
      expect(result.type).toBe('top');
    });

    it('parses "where did I spend the most money"', () => {
      const result = parseIntent('where did I spend the most money');
      expect(result.type).toBe('top');
    });
  });

  describe('Summarize intents', () => {
    it('parses "summarize 2024"', () => {
      const result = parseIntent('summarize 2024');
      expect(result.type).toBe('summarize');
      expect(result.period).toBe('2024');
    });

    it('parses "summary for 2023"', () => {
      const result = parseIntent('summary for 2023');
      expect(result.type).toBe('summarize');
      expect(result.period).toBe('2023');
    });
  });

  describe('Unknown intents', () => {
    it('returns unknown for empty input', () => {
      const result = parseIntent('');
      expect(result.type).toBe('unknown');
    });

    it('returns unknown for gibberish', () => {
      const result = parseIntent('asdfghjkl');
      expect(result.type).toBe('unknown');
    });
  });
});
