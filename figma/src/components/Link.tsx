import React from "react";

export enum URL {
  SLACK = "https://join.slack.com/t/brickscommunity/shared_invite/zt-1pb2hy3h2-9rDYWMZdHKxHblzUG0CpTQ",
}

interface LinkProps extends React.ComponentProps<"a"> {
  href: URL | string;
}

const Link: React.FC<LinkProps> = ({ children, href, ...props }) => {
  const handleLinkClick = () => {
    window.open(href, "_blank");
  };

  return (
    <a onClick={handleLinkClick} {...props}>
      {children}
    </a>
  );
};

export default Link;
