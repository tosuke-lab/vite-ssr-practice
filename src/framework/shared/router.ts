import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { History, Location } from "history";

export const HistoryContext = createContext<History | undefined>(undefined);
if (import.meta.env.DEV) {
  HistoryContext.displayName = "HistoryContext";
}

export const LocationContext = createContext<
  Readonly<{ location: Location; isPending: boolean }> | undefined
>(undefined);

export function useRoute() {
  const history = useContext(HistoryContext);
  if (history == null) throw new Error("cannot access history");

  const [isPending, startTransition] = useTransition();
  const [location, setLocation] = useState(history.location);

  useEffect(
    () =>
      history.listen((state) => {
        startTransition(() => {
          setLocation((prev) =>
            prev.key === state.location.key ? prev : state.location
          );
        });
      }),
    [history]
  );

  useScrollRestoration(history, location);

  return {
    history,
    isPending,
    location,
  };
}

function useScrollRestoration(history: History, location: Location) {
  // Transitionにより、pushStateのタイミングと実際のDOM変化のタイミングにずれが生まれてうまく動かないので、ブラウザのスクロール位置制御を無効化
  useEffect(() => {
    let originalScrollRestoration: ScrollRestoration;
    if (window.history.scrollRestoration) {
      originalScrollRestoration = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
    }
    return () => {
      if (window.history.scrollRestoration) {
        window.history.scrollRestoration = originalScrollRestoration;
      }
    };
  }, []);

  // スクロール位置を保持する
  const { current: scrollStore } = useRef(
    new Map<string, { x: number; y: number }>()
  );
  useEffect(() => {
    let prevHistoryKey = history.location.key;
    return history.listen((state) => {
      // この時点ではまだDOMに変更は反映されていないので、変更される前のLocationでのスクロール位置を保持しておく
      scrollStore.set(prevHistoryKey, {
        x: window.pageXOffset,
        y: window.pageYOffset,
      });
      prevHistoryKey = state.location.key;
    });
  }, [history, scrollStore]);

  // スクロール位置を復元する
  // locationが変化して再描画された後のuseEffectでは、DOMに変更が反映されている
  useEffect(() => {
    let state = scrollStore.get(location.key);
    if (state == null) {
      state = { x: 0, y: 0 };
    }
    window.scrollTo(state.x, state.y);
  }, [location, scrollStore]);
}
