import React, { useContext } from "react";
import * as logo from "../assets/visual-studio-code.png";
import PageContext, { PAGES } from "../context/page-context";

const PostCodeGeneration = () => {
  const { setCurrentPage } = useContext(PageContext);

  const handleDismissButtonClick = () => {
    setCurrentPage(PAGES.HOME);
  };

  return (
    <div className="h-full w-full flex flex-col justify-between items-center">
      <img className="h-32 mt-36" src={logo.default} />

      <div className="p-6 mb-12 flex flex-col justify-between items-center">
        <p className="font-vietnam text-black font-bold text-lg mb-4">
          Your generated code is ready!
        </p>
        <p className="font-vietnam text-sm text-gray-400 text-center">
          Preview and refine your code under <br /> bricks-workspace in VSCode
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

export default PostCodeGeneration;
