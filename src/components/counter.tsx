import { useState } from "react";

export const Counter = (): JSX.Element => {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount((n) => n + 1)}>+1</button>
      {count}
    </div>
  );
};
