import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCarouselGestures } from "@/shared/hooks/useCarouselGestures";

function Harness({
  captureVerticalWheel = false,
  onPrevious,
  onNext,
  onInteraction,
}: {
  captureVerticalWheel?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onInteraction?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const gestures = useCarouselGestures({
    elementRef: ref,
    itemCount: 3,
    onPrevious,
    onNext,
    onInteraction,
    captureVerticalWheel,
    verticalActivationDelayMs: 650,
  });

  return (
    <div
      ref={ref}
      data-testid="carousel"
      onPointerEnter={gestures.onPointerEnter}
      onPointerLeave={gestures.onPointerLeave}
      onPointerDown={gestures.onPointerDown}
      onPointerUp={gestures.onPointerUp}
      onPointerCancel={gestures.onPointerCancel}
    />
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("useCarouselGestures", () => {
  it("横向触控板手势立即切换并阻止页面滚动", () => {
    const onNext = vi.fn();
    const onInteraction = vi.fn();
    render(
      <Harness
        onPrevious={vi.fn()}
        onNext={onNext}
        onInteraction={onInteraction}
      />,
    );
    const event = new WheelEvent("wheel", {
      deltaX: 50,
      deltaY: 2,
      cancelable: true,
    });

    screen.getByTestId("carousel").dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onInteraction).toHaveBeenCalledTimes(1);
  });

  it("Rails 在停留延迟结束前不接管纵向滚动", () => {
    vi.useFakeTimers();
    const onNext = vi.fn();
    render(
      <Harness captureVerticalWheel onPrevious={vi.fn()} onNext={onNext} />,
    );
    const carousel = screen.getByTestId("carousel");
    fireEvent.pointerEnter(carousel);

    const scrollingEvent = new WheelEvent("wheel", {
      deltaY: 50,
      cancelable: true,
    });
    carousel.dispatchEvent(scrollingEvent);
    expect(scrollingEvent.defaultPrevented).toBe(false);
    expect(onNext).not.toHaveBeenCalled();

    vi.advanceTimersByTime(650);
    const activatedEvent = new WheelEvent("wheel", {
      deltaY: 50,
      cancelable: true,
    });
    carousel.dispatchEvent(activatedEvent);

    expect(activatedEvent.defaultPrevented).toBe(true);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("衰减的触控板惯性只切换一次", () => {
    vi.useFakeTimers();
    const onNext = vi.fn();
    render(<Harness onPrevious={vi.fn()} onNext={onNext} />);
    const carousel = screen.getByTestId("carousel");
    const swipe = (deltaX: number) =>
      carousel.dispatchEvent(
        new WheelEvent("wheel", {
          deltaX,
          cancelable: true,
        }),
      );

    swipe(50);
    expect(onNext).toHaveBeenCalledTimes(1);

    swipe(30);
    swipe(15);
    swipe(6);
    expect(onNext).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(90);
    swipe(50);
    expect(onNext).toHaveBeenCalledTimes(2);
  });

  it("惯性尚未结束时仍识别第二次主动滑动", () => {
    const onNext = vi.fn();
    render(<Harness onPrevious={vi.fn()} onNext={onNext} />);
    const carousel = screen.getByTestId("carousel");
    const swipe = (deltaX: number) =>
      carousel.dispatchEvent(
        new WheelEvent("wheel", { deltaX, cancelable: true }),
      );

    swipe(50);
    swipe(12);
    swipe(4);
    swipe(24);
    swipe(20);

    expect(onNext).toHaveBeenCalledTimes(2);
  });

  it("手指横滑切换轮播，纵向滑动保持页面滚动意图", () => {
    const onNext = vi.fn();
    render(<Harness onPrevious={vi.fn()} onNext={onNext} />);
    const carousel = screen.getByTestId("carousel");

    fireEvent.pointerDown(carousel, {
      pointerType: "touch",
      clientX: 100,
      clientY: 20,
    });
    fireEvent.pointerUp(carousel, {
      pointerType: "touch",
      clientX: 30,
      clientY: 24,
    });
    expect(onNext).toHaveBeenCalledTimes(1);

    fireEvent.pointerDown(carousel, {
      pointerType: "touch",
      clientX: 100,
      clientY: 20,
    });
    fireEvent.pointerUp(carousel, {
      pointerType: "touch",
      clientX: 70,
      clientY: 100,
    });
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
