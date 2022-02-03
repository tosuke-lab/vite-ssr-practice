import { parsePath } from "history";
import React, { useContext } from "react";
import { HistoryContext } from "../../framework/shared/router";

export const UnsafeLink = ({
  children,
  href,
}: React.PropsWithChildren<{
  href: string;
}>): JSX.Element => {
  const history = useContext(HistoryContext)!;

  const handleClick: React.MouseEventHandler = (ev) => {
    if (href != null && href.startsWith("/")) {
      ev.preventDefault();
      history.push({ search: "", hash: "", ...parsePath(href) });
    }
  };

  return (
    <a href={href} onClick={handleClick}>
      {children}
    </a>
  );
};
