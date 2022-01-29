import { Helmet } from "react-helmet-async";

export const Head: React.FC = ({ children }) => {
  return <Helmet>{children}</Helmet>;
};
