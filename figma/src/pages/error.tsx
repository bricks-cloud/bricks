import { useContext } from "react";
import errorIcon from "../assets/error-icon.svg";
import PageContext, { PAGES } from "../context/page-context";

const Error = () => {
  const { setCurrentPage } = useContext(PageContext);

  const handleDismissButtonClick = () => {
    setCurrentPage(PAGES.HOME);
  };

  const handleLinkClick = () => {
    window.open(
      "https://join.slack.com/t/brickscommunity/shared_invite/zt-1pb2hy3h2-9rDYWMZdHKxHblzUG0CpTQ",
      "_blank"
    );
  };

  return (
    <div className="h-full w-full flex flex-col justify-between items-center">
      <img className="h-32 mt-36" src={errorIcon} />

      <div className="p-6 mb-12 flex flex-col justify-between items-center">
        <p className="font-vietnam text-black font-bold text-lg mb-4">
          Oh no! Something went wrong.
        </p>
        <p className="font-vietnam text-sm text-gray-400 text-center">
          We're sorry. The team will look into the issue.
        </p>
        <p className="font-vietnam text-sm text-gray-400 text-center">
          Feel free to{" "}
          <a
            className="underline hover:cursor-pointer"
            onClick={handleLinkClick}
          >
            contact us
          </a>{" "}
          if the problem persists.
        </p>
      </div>

      <div className="h-36 w-full flex flex-col justify-center items-center mb-20">
        <button
          onClick={handleDismissButtonClick}
          className="text-base text-blue-600"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default Error;
