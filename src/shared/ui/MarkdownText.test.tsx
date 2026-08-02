import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkdownText } from './MarkdownText';

describe('MarkdownText', () => {
  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

  beforeEach(() => {
    openSpy.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('将危险协议渲染为普通文本而非链接', () => {
    render(<MarkdownText text={'[danger](javascript:alert(1))'} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('[danger](javascript:alert(1))')).toBeInTheDocument();
  });

  it('点击 Discord 链接时不弹警告', () => {
    render(<MarkdownText text={'https://discord.com/channels/1/3'} />);
    const link = screen.getByRole('link');

    fireEvent.click(link);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('点击非 Discord 链接时显示警告并在确认后打开', () => {
    render(<MarkdownText text={'https://example.com/post'} />);
    const link = screen.getByRole('link');

    fireEvent.click(link);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog.parentElement).toBe(document.body);
    expect(screen.getByText('example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '继续前往' }));

    expect(openSpy).toHaveBeenCalledWith('https://example.com/post', '_blank', 'noopener,noreferrer');
  });

  it('分别渲染行内代码和围栏代码块', () => {
    const { container } = render(<MarkdownText text={'`xx`\n```\nxxx\n```'} />);

    expect(container.querySelector('code.inline-code')?.textContent).toBe('xx');
    expect(container.querySelector('pre.code-block code')?.textContent).toBe('xxx');
  });

  it('围栏代码块内部的反引号不会被当作行内代码解析', () => {
    const { container } = render(<MarkdownText text={'```\nconst x = `xx`;\n```'} />);

    expect(container.querySelectorAll('code.inline-code')).toHaveLength(0);
    expect(container.querySelector('pre.code-block code')?.textContent).toBe('const x = `xx`;');
  });

  it('只高亮 Markdown 文本节点，不破坏链接与代码', () => {
    const { container } = render(
      <MarkdownText
        text={'**Odysseia** [Odysseia](https://discord.com/channels/1/3) `Odysseia`'}
        highlight="Odysseia"
      />,
    );

    expect(container.querySelectorAll('mark')).toHaveLength(2);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://discord.com/channels/1/3');
    expect(container.querySelector('code.inline-code')).toHaveTextContent('Odysseia');
    expect(container.querySelector('code.inline-code mark')).toBeNull();
  });
});
