import { useContext } from "react";
import { StatusContext } from "../framework/shared/status";

export const Status = ({ code }: { code: number }): JSX.Element | null => {
  const state = useContext(StatusContext);
  state.statusCode = code;
  return null;
};
