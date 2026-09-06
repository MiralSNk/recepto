'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tariff } from '@/types';
import { api } from '@/lib/utils/api';
import { DEFAULT_FORMULA, describeFormula, parseFormula } from '@/lib/shared/formula';
import { calculatePrice, DEFAULT_SECOND_GUEST_PRICE, DEFAULT_EXTRA_GUEST_PRICE } from '@/lib/shared/pricing';
import type { FormulaToken } from '@/lib/shared/formula';
import {
  operatorToToken,
  sourceToTokens,
  tokensToSource,
  type OperatorSymbol,
} from './formula-builder';
import './FormulaConstructor.scss';

interface Item {
  id: string;
  token: FormulaToken;
}

let idCounter = 0;
function newId(): string {
  idCounter += 1;
  return `tok${idCounter}`;
}

function itemsFromSource(source: string): Item[] {
  return sourceToTokens(source).map((token) => ({ id: newId(), token }));
}

function tokenLabel(tok: FormulaToken, cardLabels: Record<string, string>): string {
  if (tok.type === 'ident') return cardLabels[tok.value] ?? tok.value;
  if (tok.type === 'op') return tok.value === '*' ? '×' : tok.value;
  if (tok.type === 'lparen') return '(';
  return ')';
}

const OPERATORS: OperatorSymbol[] = ['+', '-', '*', '(', ')'];

function SortableChip({
  item,
  label,
  onRemove,
}: {
  item: Item;
  label: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const isCard = item.token.type === 'ident';

  return (
    <span
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isCard ? 'formula-constructor__chip formula-constructor__chip--card' : 'formula-constructor__chip formula-constructor__chip--op'}
    >
      {label}
      <button
        type="button"
        className="formula-constructor__chip-remove"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        aria-label="Убрать"
      >
        ×
      </button>
    </span>
  );
}

function Gap({ onInsert }: { onInsert: (op: OperatorSymbol) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="formula-constructor__gap">
      <button
        type="button"
        className="formula-constructor__gap-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Вставить оператор"
      >
        +
      </button>
      {open && (
        <span className="formula-constructor__gap-popover">
          {OPERATORS.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => {
                onInsert(op);
                setOpen(false);
              }}
            >
              {op === '*' ? '×' : op}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

const EXAMPLE_SCENARIO = { basePricePerNight: 3000, adults: 2, childAges: [] as number[], nights: 2 };

export default function FormulaConstructor() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [childFreeAgeLimit, setChildFreeAgeLimit] = useState(7);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    Promise.all([
      api.get<Tariff[]>('/api/admin/tariffs'),
      api.get<Record<string, { value: string }>>('/api/admin/pricing'),
    ])
      .then(([tariffsData, pricingData]) => {
        setTariffs(tariffsData);
        const formula = pricingData.calculator_formula?.value || DEFAULT_FORMULA;
        setItems(itemsFromSource(formula));
        const limit = Number(pricingData.child_free_age_limit?.value);
        if (Number.isFinite(limit)) setChildFreeAgeLimit(limit);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить формулу'))
      .finally(() => setLoading(false));
  }, []);

  const availableCards = useMemo(() => {
    const builtin = tariffs.filter((t) => t.is_builtin);
    const additional = tariffs.filter((t) => !t.is_builtin && t.in_calculator);
    return [
      { key: 'base', label: 'Цена номера' },
      { key: 'days', label: 'Число ночей' },
      ...builtin.map((t) => ({ key: t.tariff_key, label: t.label })),
      ...additional.map((t) => ({ key: t.tariff_key, label: t.label })),
    ];
  }, [tariffs]);

  const cardLabels = useMemo(
    () => Object.fromEntries(availableCards.map((c) => [c.key, c.label])),
    [availableCards]
  );
  const knownCardKeys = useMemo(() => availableCards.map((c) => c.key), [availableCards]);

  const tokens = useMemo(() => items.map((i) => i.token), [items]);
  const source = useMemo(() => tokensToSource(tokens), [tokens]);
  const parseResult = useMemo(() => parseFormula(source, knownCardKeys), [source, knownCardKeys]);

  const preview = 'ast' in parseResult ? describeFormula(parseResult.ast, cardLabels) : null;

  const exampleTotal = useMemo(() => {
    if (!('ast' in parseResult)) return null;
    const second = tariffs.find((t) => t.tariff_key === 'second_guest');
    const extra = tariffs.find((t) => t.tariff_key === 'extra_guest');
    const additionalTariffs = tariffs
      .filter((t) => !t.is_builtin && t.in_calculator)
      .map((t) => ({ key: t.tariff_key, price: t.price }));
    return calculatePrice({
      ...EXAMPLE_SCENARIO,
      rules: {
        childFreeAgeLimit,
        secondGuestPrice: second?.price ?? DEFAULT_SECOND_GUEST_PRICE,
        extraGuestPrice: extra?.price ?? DEFAULT_EXTRA_GUEST_PRICE,
      },
      additionalTariffs,
      formula: source,
    }).total;
  }, [parseResult, tariffs, childFreeAgeLimit, source]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const from = prev.findIndex((i) => i.id === active.id);
      const to = prev.findIndex((i) => i.id === over.id);
      if (from === -1 || to === -1) return prev;
      return arrayMove(prev, from, to);
    });
  };

  const handleAppendCard = (key: string) => {
    setItems((prev) => [...prev, { id: newId(), token: { type: 'ident', value: key } }]);
  };

  const handleInsertOperator = (gapIndex: number, op: OperatorSymbol) => {
    setItems((prev) => {
      const next = [...prev];
      next.splice(gapIndex, 0, { id: newId(), token: operatorToToken(op) });
      return next;
    });
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleReset = () => {
    setItems(itemsFromSource(DEFAULT_FORMULA));
  };

  const handleSave = async () => {
    if (!('ast' in parseResult)) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const data = await api.put<{ message?: string }>('/api/admin/pricing', {
        calculator_formula: source,
      });
      setMessage(data.message || 'Формула сохранена');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="formula-constructor__loading">Загрузка конструктора...</div>;

  return (
    <div className="formula-constructor">
      <h2 className="formula-constructor__title">Конструктор формулы калькулятора</h2>
      <p className="formula-constructor__hint">
        Карточки — доступные тарифы (основные + дополнительные, отмеченные «участвует в
        калькуляторе»), плюс «Цена номера» и «Число ночей». Соберите выражение из карточек и
        операторов <code>+ − × ( )</code> — именно оно считает итоговую цену брони. Деления нет
        специально, числа руками вписать нельзя — только через тариф.
      </p>

      {error && <p className="admin-error">{error}</p>}

      <div className="formula-constructor__palette">
        {availableCards.map((card) => (
          <button
            key={card.key}
            type="button"
            className="formula-constructor__palette-btn"
            onClick={() => handleAppendCard(card.key)}
          >
            + {card.label}
          </button>
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
          <div className="formula-constructor__expression">
            <Gap onInsert={(op) => handleInsertOperator(0, op)} />
            {items.map((item, idx) => (
              <span key={item.id} className="formula-constructor__expr-item">
                <SortableChip
                  item={item}
                  label={tokenLabel(item.token, cardLabels)}
                  onRemove={() => handleRemove(item.id)}
                />
                <Gap onInsert={(op) => handleInsertOperator(idx + 1, op)} />
              </span>
            ))}
            {items.length === 0 && (
              <span className="formula-constructor__empty">
                Пусто — добавьте карточки из палитры выше
              </span>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {preview ? (
        <p className="formula-constructor__preview">Формула: {preview}</p>
      ) : (
        <p className="formula-constructor__preview formula-constructor__preview--error">
          {'error' in parseResult ? parseResult.error : ''}
        </p>
      )}

      {exampleTotal != null && (
        <p className="formula-constructor__example">
          Пример: номер 3000 ₽, 2 взрослых, 2 ночи → {exampleTotal.toLocaleString('ru-RU')} ₽
        </p>
      )}

      <div className="formula-constructor__actions">
        <button type="button" className="formula-constructor__reset-btn" onClick={handleReset}>
          Сбросить к формуле по умолчанию
        </button>
        <button
          type="button"
          className="formula-constructor__save-btn"
          onClick={handleSave}
          disabled={saving || !('ast' in parseResult)}
        >
          {saving ? 'Сохранение…' : 'Сохранить формулу'}
        </button>
      </div>

      {message && <p className="formula-constructor__message">{message}</p>}
    </div>
  );
}
