import { useContext } from "react";
import errorIcon from "../assets/error-icon.svg";
import PageContext, { PAGES } from "../context/page-context";
import Link, { URL } from "../components/Link";
import Button from "../components/Button";

const Error = () => {
  const { setCurrentPage } = useContext(PageContext);

  const handleDismissButtonClick = () => {
    setCurrentPage(PAGES.HOME);
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
          <Link className="underline hover:cursor-pointer" href={URL.SLACK}>
            contact us
          </Link>{" "}
          if the problem persists.
        </p>
      </div>

      <div className="h-36 w-full flex flex-col justify-center items-center mb-20">
        <Button onClick={handleDismissButtonClick} secondary>
          Dismiss
        </Button>
      </div>
    </div>
  );
};

export default Error;
