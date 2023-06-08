import { useContext } from "react";
//@ts-ignore
import demo from "../assets/bricks-demo.gif";
import PageContext, { PAGES } from "../context/page-context";
import Button from "../components/Button";

const PostCodeGeneration = () => {
  const { setCurrentPage } = useContext(PageContext);

  const handleDismissButtonClick = () => {
    setCurrentPage(PAGES.HOME);
  };

  return (
    <div className="h-full w-full flex flex-col justify-center items-center gap-6">
      <div className="max-w-xs mx-auto flex flex-col justify-between items-center">
        <p className="font-vietnam text-black font-bold text-lg mb-4 text-center">
          Your code is ready under <br /> "Bricks Generated Files"!
        </p>
        <p className="font-vietnam text-sm text-gray-400 mb-4 text-center">
          Return to VS Code to view, edit, and export generated files to your
          project.
        </p>
        <img className="h-32" src={demo} />
      </div>

      <div className="flex flex-col justify-center items-center gap-4">
        <Button secondary onClick={handleDismissButtonClick}>
          Dismiss
        </Button>
      </div>
    </div>
  );
};

export default PostCodeGeneration;
