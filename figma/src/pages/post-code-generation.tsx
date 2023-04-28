import { useContext, useState } from "react";
//@ts-ignore
import demo from "../assets/bricks-demo.gif";
import PageContext, { PAGES } from "../context/page-context";
import Button from "../components/Button";
import { EVENT_FEEDBACK } from "../analytics/amplitude";

const PostCodeGeneration = () => {
  const { setCurrentPage } = useContext(PageContext);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleDismissButtonClick = () => {
    setCurrentPage(PAGES.HOME);
  };

  const handleSubmitFeedback = () => {
    if (feedback.trim() === "") return;

    parent.postMessage(
      {
        pluginMessage: {
          type: "analytics",
          eventName: EVENT_FEEDBACK,
          eventProperties: {
            feedback: feedback.trim(),
          },
        },
      },
      "*"
    );

    setSubmitted(true);
  };

  return (
    <div className="h-full w-full flex flex-col justify-center items-center gap-12 pt-12">
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

      <div className="max-w-xs mx-auto flex flex-col justify-between items-center">
        <p className="font-vietnam text-sm text-black text-center mb-2">
          How are you liking Bricks?
        </p>
        <textarea
          className="w-64 h-24 border border-gray-400 rounded-md p-2 text-sm focus:outline-blue-500"
          placeholder="We appreciate any feedback!"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </div>

      <div className="flex flex-col justify-center items-center gap-4">
        <Button
          disabled={feedback.trim() === "" || submitted}
          onClick={handleSubmitFeedback}
        >
          {!submitted ? "Submit" : "Submitted!"}
        </Button>
        <Button secondary onClick={handleDismissButtonClick}>
          Dismiss
        </Button>
      </div>
    </div>
  );
};

export default PostCodeGeneration;
