import { useEffect, useRef } from "react";

interface InfiniteScrollTriggerProps {
  disabled?: boolean;
  onTrigger: () => void;
  rootMargin?: string;
}

export function InfiniteScrollTrigger({
  disabled = false,
  onTrigger,
  rootMargin = "200px",
}: InfiniteScrollTriggerProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onTrigger);
  callbackRef.current = onTrigger;

  useEffect(() => {
    const node = elementRef.current;

    if (!node || disabled) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.find((candidate) => candidate.isIntersecting);
        if (!entry) {
          return;
        }

        callbackRef.current();
      },
      { root: null, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [disabled, rootMargin]);

  return <div ref={elementRef} aria-hidden="true" />;
}
