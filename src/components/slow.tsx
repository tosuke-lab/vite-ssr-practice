import { useData } from "../lib/data";

export const Slow = (): JSX.Element => {
  useData("stop", () => new Promise((r) => setTimeout(r, 2000)));

  return <p>Slow</p>;
};
