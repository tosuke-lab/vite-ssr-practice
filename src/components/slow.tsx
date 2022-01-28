import { useData } from "../lib/data";

export const Slow = ({ ms }: { ms: number }): JSX.Element => {
  useData(`stop/${ms}`, () => new Promise((r) => setTimeout(r, ms)));

  return <p>Slow</p>;
};
