import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

const options = [
  { value: 'newest', label: '最新' },
  { value: 'oldest', label: '最早' },
  { value: 'popular', label: '热门' },
];

describe('Select', () => {
  it('supports listbox keyboard navigation and selection', () => {
    const onChange = vi.fn();
    render(
      <Select
        id="sort"
        aria-label="排序"
        value="newest"
        options={options}
        onChange={onChange}
      />,
    );

    const trigger = screen.getByRole('button', { name: '排序' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'sort-listbox');

    fireEvent.click(trigger);
    const listbox = screen.getByRole('listbox');
    const optionElements = screen.getAllByRole('option');
    expect(listbox).toHaveAttribute('aria-labelledby', 'sort');
    expect(optionElements[0]).toHaveFocus();

    fireEvent.keyDown(optionElements[0], { key: 'ArrowDown' });
    expect(optionElements[1]).toHaveFocus();
    fireEvent.keyDown(optionElements[1], { key: 'End' });
    expect(optionElements[2]).toHaveFocus();
    fireEvent.keyDown(optionElements[2], { key: 'Home' });
    expect(optionElements[0]).toHaveFocus();
    fireEvent.keyDown(optionElements[0], { key: 'ArrowDown' });
    fireEvent.keyDown(optionElements[1], { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('oldest');
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens with Space and closes with Escape while restoring focus', async () => {
    render(
      <Select
        aria-label="排序"
        value="newest"
        options={options}
        onChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: '排序' });
    fireEvent.keyDown(trigger, { key: ' ' });
    const activeOption = screen.getAllByRole('option')[0];
    expect(activeOption).toHaveFocus();

    fireEvent.keyDown(activeOption, { key: 'Escape' });
    expect(trigger).toHaveFocus();
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });
});
