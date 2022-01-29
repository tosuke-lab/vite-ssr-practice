import { useData } from "../lib/data";

export const Slow = ({
  children,
  ms,
}: React.PropsWithChildren<{ ms: number }>): JSX.Element => {
  useData(`stop/${ms}`, () => new Promise((r) => setTimeout(r, ms)));

  return <>{children}</>;
};
