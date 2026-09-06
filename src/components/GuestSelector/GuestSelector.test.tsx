import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GuestSelector from './GuestSelector';

const baseProps = {
  onChange: vi.fn(),
  childAges: [] as number[],
  onChildAgesChange: vi.fn(),
};

describe('GuestSelector', () => {
  it('открывает дропдаун по клику на кнопку', () => {
    render(<GuestSelector {...baseProps} guests={{ adults: 1, children: 0 }} />);
    expect(screen.queryByLabelText('Увеличить количество взрослых')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Гости/i }));
    expect(screen.getByLabelText('Увеличить количество взрослых')).toBeInTheDocument();
  });

  it('не даёт уменьшить взрослых меньше 1', () => {
    render(<GuestSelector {...baseProps} guests={{ adults: 1, children: 0 }} />);
    fireEvent.click(screen.getByRole('button', { name: /Гости/i }));
    expect(screen.getByLabelText('Уменьшить количество взрослых')).toBeDisabled();
  });

  it('увеличивает количество взрослых по клику на плюс', () => {
    const onChange = vi.fn();
    render(<GuestSelector {...baseProps} guests={{ adults: 1, children: 0 }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Гости/i }));
    fireEvent.click(screen.getByLabelText('Увеличить количество взрослых'));
    expect(onChange).toHaveBeenCalledWith({ adults: 2, children: 0 });
  });

  it('запрещает превысить maxTotal суммарно взрослых и детей', () => {
    const onChange = vi.fn();
    render(
      <GuestSelector
        {...baseProps}
        guests={{ adults: 2, children: 1 }}
        childAges={[5]}
        onChange={onChange}
        maxTotal={3}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Гости/i }));
    // Уже 3 гостя из 3 максимум — плюс у взрослых и у детей заблокированы
    expect(screen.getByLabelText('Увеличить количество взрослых')).toBeDisabled();
    expect(screen.getByLabelText('Увеличить количество детей')).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Увеличить количество взрослых'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('детей по умолчанию 0, плюс не даёт указать возраст без явного нажатия', () => {
    render(<GuestSelector {...baseProps} guests={{ adults: 1, children: 0 }} />);
    fireEvent.click(screen.getByRole('button', { name: /Гости/i }));
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryAllByLabelText(/Возраст ребёнка/)).toHaveLength(0);
    expect(screen.getByLabelText('Уменьшить количество детей')).toBeDisabled();
  });

  it('добавляет ребёнка с возрастом по умолчанию по клику на «+»', () => {
    const onChildAgesChange = vi.fn();
    render(
      <GuestSelector
        {...baseProps}
        guests={{ adults: 1, children: 0 }}
        onChildAgesChange={onChildAgesChange}
        maxTotal={3}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Гости/i }));
    fireEvent.click(screen.getByLabelText('Увеличить количество детей'));
    expect(onChildAgesChange).toHaveBeenCalledWith([5]);
  });

  it('повторные клики на «+» у детей дают по одному селектору возраста на каждого ребёнка', () => {
    const { rerender } = render(
      <GuestSelector {...baseProps} guests={{ adults: 1, children: 0 }} childAges={[]} maxTotal={5} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Гости/i }));
    expect(screen.queryAllByLabelText(/Возраст ребёнка/)).toHaveLength(0);

    rerender(
      <GuestSelector {...baseProps} guests={{ adults: 1, children: 2 }} childAges={[5, 7]} maxTotal={5} />
    );
    expect(screen.getAllByLabelText(/Возраст ребёнка/)).toHaveLength(2);
  });

  it('убирает ребёнка по клику на крестик', () => {
    const onChildAgesChange = vi.fn();
    render(
      <GuestSelector
        {...baseProps}
        guests={{ adults: 1, children: 2 }}
        childAges={[5, 10]}
        onChildAgesChange={onChildAgesChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Гости/i }));
    fireEvent.click(screen.getAllByLabelText('Убрать ребёнка')[0]);
    expect(onChildAgesChange).toHaveBeenCalledWith([10]);
  });

  it('убирает последнего ребёнка по клику на «-» сразу, без задержки', () => {
    const onChildAgesChange = vi.fn();
    render(
      <GuestSelector
        {...baseProps}
        guests={{ adults: 1, children: 2 }}
        childAges={[5, 10]}
        onChildAgesChange={onChildAgesChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Гости/i }));
    fireEvent.click(screen.getByLabelText('Уменьшить количество детей'));
    expect(onChildAgesChange).toHaveBeenCalledWith([5]);
  });

  it('меняет возраст конкретного ребёнка через select', () => {
    const onChildAgesChange = vi.fn();
    render(
      <GuestSelector
        {...baseProps}
        guests={{ adults: 1, children: 2 }}
        childAges={[5, 10]}
        onChildAgesChange={onChildAgesChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Гости/i }));
    fireEvent.change(screen.getByLabelText('Возраст ребёнка 2'), { target: { value: '12' } });
    expect(onChildAgesChange).toHaveBeenCalledWith([5, 12]);
  });
});
