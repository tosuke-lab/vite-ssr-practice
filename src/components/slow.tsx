import { useData } from "../lib/useData";

export const Slow = (): JSX.Element => {
  useData("stop", () => new Promise((r) => setTimeout(r, 1000)));

  return <p>Slow</p>;
};
