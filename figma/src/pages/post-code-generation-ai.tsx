import { useContext, PropsWithChildren, Component, ReactElement } from "react";
import PageContext, { PAGES } from "../context/page-context";
import Button from "../components/Button";
import { AiApplication } from "../constants";
import { isEmpty } from "bricks-core/src/utils";

export interface Props {
  limit: number;
  aiApplications: AiApplication[],
}

const PostCodeGenerationAi = (props: PropsWithChildren<Props>) => {
  const {
    limit,
    aiApplications,
  } = props;

  const { setCurrentPage } = useContext(PageContext);

  const handleDismissButtonClick = () => {
    setCurrentPage(PAGES.HOME);
  };

  const getAiTextContent = () => {
    if (isEmpty(aiApplications)) {
      return (
        <p className="font-vietnam text-black font-bold text-base mb-4 text-start">
          Ai is not applied in this code generation. No credits deducted.
        </p>
      );
    }

    const applications: ReactElement[] = [];

    for (const aiApplication of aiApplications) {
      if (aiApplication === AiApplication.componentIdentification) {
        applications.push(
          <p className="font-vietnam text-black text-base mb-4 text-start">
            * Auto identification of buttons and links.
          </p>
        );
      }

      if (aiApplication === AiApplication.autoNaming) {
        applications.push(
          <p className="font-vietnam text-black text-base text-start">
            * Auto naming of variables, data fields and props.
          </p>
        );
      }
    }

    return (
      <div>
        <p className="font-vietnam text-black font-bold text-base mb-4 text-start">
          Here is how Ai is applied:
        </p>
        <div className="max-w-xs mx-auto flex flex-col justify-start items-start mb-8">
          {applications.map((application) => (
            application
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col justify-center items-center gap-6">
      <div className="max-w-xs mx-auto flex flex-col justify-between items-start px-8">
        {getAiTextContent()}

        <p className="font-vietnam text-black font-bold text-base text-center">
          Ai code gen daily credits left: {limit}
        </p>
      </div>
      <Button secondary onClick={handleDismissButtonClick}>
        Dismiss
      </Button>
    </div>
  );
};

export default PostCodeGenerationAi;
