import { describe, it, expect } from 'vitest';
import { resolveMaxGuests } from './guest-limits';

describe('resolveMaxGuests', () => {
  it('ни номер, ни категория — берётся сайтовый лимит', () => {
    expect(
      resolveMaxGuests({ roomGuests: null, categoryMaxGuests: null, siteMaxGuestsAbsolute: 10 })
    ).toBe(10);
  });

  it('только лимит категории — берётся он', () => {
    expect(
      resolveMaxGuests({ roomGuests: null, categoryMaxGuests: 6, siteMaxGuestsAbsolute: 10 })
    ).toBe(6);
  });

  it('только вместимость номера — берётся она (guests + extra)', () => {
    expect(
      resolveMaxGuests({
        roomGuests: 2,
        roomExtraCapacity: 1,
        categoryMaxGuests: null,
        siteMaxGuestsAbsolute: 10,
      })
    ).toBe(3);
  });

  it('заданы и номер, и категория — номер главнее', () => {
    expect(
      resolveMaxGuests({
        roomGuests: 2,
        roomExtraCapacity: 0,
        categoryMaxGuests: 6,
        siteMaxGuestsAbsolute: 10,
      })
    ).toBe(2);
  });

  it('вместимость номера без доп. мест (extraCapacity не передан) — не падает', () => {
    expect(resolveMaxGuests({ roomGuests: 4, siteMaxGuestsAbsolute: 10 })).toBe(4);
  });

  it('guests = 0 у номера — валидное явное значение, не путается с "не задано"', () => {
    // 0 !== null/undefined, поэтому вместимость номера всё равно должна
    // использоваться (даже если она "0" — например, ошибочно заполненный
    // номер), а не тихо провалиться на лимит категории/сайта.
    expect(
      resolveMaxGuests({ roomGuests: 0, roomExtraCapacity: 2, categoryMaxGuests: 6, siteMaxGuestsAbsolute: 10 })
    ).toBe(2);
  });
});
