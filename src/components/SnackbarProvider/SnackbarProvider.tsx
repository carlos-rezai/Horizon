import { useCallback, useRef, useState, type ReactNode } from "react";
import Snackbar from "../Snackbar/Snackbar";
import {
  SnackbarContext,
  SnackbarStackContext,
  type NotifyArg,
  type SnackbarVariant,
  type SnackbarActionConfig,
} from "./useSnackbar";
import { StyledStack } from "./SnackbarProvider.styles";

const MAX_VISIBLE = 4;
const DEFAULT_DURATION = 3200;
const LONG_DURATION = 6000;

interface Snack {
  id: number;
  message: string;
  variant: SnackbarVariant;
  action?: SnackbarActionConfig;
}

interface SnackbarProviderProps {
  children: ReactNode;
}

export default function SnackbarProvider({ children }: SnackbarProviderProps) {
  const [snacks, setSnacks] = useState<Snack[]>([]);
  // The stack DOM node, exposed so persistent banners can portal into it and
  // share this single fixed region instead of each self-fixing to the corner.
  const [stackNode, setStackNode] = useState<HTMLElement | null>(null);
  const nextId = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setSnacks((list) => list.filter((s) => s.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, opts?: NotifyArg): number => {
      const variant: SnackbarVariant =
        typeof opts === "string" ? opts : (opts?.variant ?? "success");
      const action = typeof opts === "object" ? opts.action : undefined;
      const duration =
        (typeof opts === "object" ? opts.duration : undefined) ??
        (variant === "error" || variant === "warning" || action
          ? LONG_DURATION
          : DEFAULT_DURATION);

      const id = ++nextId.current;
      setSnacks((list) => [
        ...list.slice(-(MAX_VISIBLE - 1)),
        { id, message, variant, action },
      ]);

      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss]
  );

  return (
    <SnackbarContext.Provider value={{ notify, dismiss }}>
      <SnackbarStackContext.Provider value={stackNode}>
        {children}
        <StyledStack ref={setStackNode}>
          {snacks.map((snack) => (
            <Snackbar
              key={snack.id}
              message={snack.message}
              variant={snack.variant}
              action={snack.action}
              onClose={() => dismiss(snack.id)}
              positioned={false}
            />
          ))}
        </StyledStack>
      </SnackbarStackContext.Provider>
    </SnackbarContext.Provider>
  );
}
