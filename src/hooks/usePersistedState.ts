import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

export type PersistStorage = 'local' | 'session';

export interface UsePersistedStateOptions<T> {
  /** Which Web Storage area to use. Defaults to `'local'`. */
  storage?: PersistStorage;
  /**
   * Validate and normalise a parsed value before it is trusted. Return
   * `undefined` to reject it and fall back to the default — stored layouts
   * outlive the code that wrote them, so a shape check is cheap insurance.
   */
  validate?: (value: unknown) => T | undefined;
  /** Serializer. Defaults to `JSON.stringify`. */
  serialize?: (value: T) => string;
  /** Deserializer. Defaults to `JSON.parse`. */
  deserialize?: (raw: string) => unknown;
}

export type UsePersistedStateResult<T> = [
  value: T,
  setValue: Dispatch<SetStateAction<T>>,
  clear: () => void,
];

function getStorage(kind: PersistStorage): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    // Access itself can throw under strict privacy settings, so this is inside
    // the try rather than a plain existence check.
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The `persistKey` behaviour every component in the kit with a layout worth
 * remembering shares, extracted from `ResizableSplitPane`. SSR-safe (no
 * storage access on the server) and tolerant of every way Web Storage fails:
 * disabled cookies, private mode, exceeded quota, corrupt JSON.
 *
 * Pass `undefined` as the key to disable persistence entirely — that is what a
 * component does when the consumer omits `persistKey`, and it keeps the hook
 * call unconditional.
 *
 * Note on hydration: the stored value is read in the initial render so the
 * first paint is already correct, matching how `ResizableSplitPane` behaves.
 * Under SSR the server renders the default, so a persisted value that differs
 * will produce a hydration warning — read it in an effect instead if that
 * matters more to you than the flash.
 *
 * ```tsx
 * const [sizes, setSizes, clearSizes] = usePersistedState(persistKey, defaultSizes, {
 *   validate: (v) => (Array.isArray(v) && v.every(isFiniteRatio) ? (v as number[]) : undefined),
 * });
 * ```
 */
export function usePersistedState<T>(
  key: string | undefined,
  defaultValue: T | (() => T),
  options: UsePersistedStateOptions<T> = {},
): UsePersistedStateResult<T> {
  const optsRef = useRef(options);
  optsRef.current = options;

  const defaultRef = useRef(defaultValue);
  defaultRef.current = defaultValue;

  const resolveDefault = useCallback(
    (): T =>
      typeof defaultRef.current === 'function'
        ? (defaultRef.current as () => T)()
        : defaultRef.current,
    [],
  );

  const read = useCallback(
    (readKey: string | undefined): T | undefined => {
      if (!readKey) return undefined;
      const store = getStorage(optsRef.current.storage ?? 'local');
      if (!store) return undefined;
      try {
        const raw = store.getItem(readKey);
        if (raw === null) return undefined;
        const parsed = (optsRef.current.deserialize ?? JSON.parse)(raw);
        const validate = optsRef.current.validate;
        return validate ? validate(parsed) : (parsed as T);
      } catch {
        // Corrupt entry or storage read failure — behave as if unset.
        return undefined;
      }
    },
    [],
  );

  const write = useCallback((writeKey: string | undefined, value: T) => {
    if (!writeKey) return;
    const store = getStorage(optsRef.current.storage ?? 'local');
    if (!store) return;
    try {
      store.setItem(writeKey, (optsRef.current.serialize ?? JSON.stringify)(value));
    } catch {
      /* quota or security — persistence is best-effort, never fatal */
    }
  }, []);

  const [value, setValueState] = useState<T>(() => read(key) ?? resolveDefault());

  const valueRef = useRef(value);
  valueRef.current = value;

  const keyRef = useRef(key);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (action) => {
      const next =
        typeof action === 'function' ? (action as (prev: T) => T)(valueRef.current) : action;
      valueRef.current = next;
      setValueState(next);
      write(keyRef.current, next);
    },
    [write],
  );

  const clear = useCallback(() => {
    const store = getStorage(optsRef.current.storage ?? 'local');
    if (keyRef.current && store) {
      try {
        store.removeItem(keyRef.current);
      } catch {
        /* ignore */
      }
    }
    const fallback = resolveDefault();
    valueRef.current = fallback;
    setValueState(fallback);
  }, [resolveDefault]);

  // A changed key points at a different saved layout — adopt it (or fall back
  // to the default if nothing is stored under the new key).
  useEffect(() => {
    if (keyRef.current === key) return;
    keyRef.current = key;
    const next = read(key) ?? resolveDefault();
    valueRef.current = next;
    setValueState(next);
  }, [key, read, resolveDefault]);

  return [value, setValue, clear];
}

export default usePersistedState;
