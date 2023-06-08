import { useContext, PropsWithChildren } from "react";
import * as settingsLogo from "../assets/setting-logo.png";
import PageContext, { PAGES } from "../context/page-context";
import {
  CssFramework,
  UiFramework,
} from "../constants";
import Button from "../components/Button";

export interface Props {
  connectedToVSCode: boolean;
  selectedUiFramework: UiFramework;
  selectedCssFramework: CssFramework;
  isComponentSelected: boolean;
  setIsGeneratingCode: (value: boolean) => void;
}

const Home = (props: PropsWithChildren<Props>) => {
  const {
    connectedToVSCode,
    isComponentSelected,
    selectedUiFramework,
    setIsGeneratingCode,
    selectedCssFramework
  } = props;
  const { setCurrentPage } = useContext(PageContext);

  const handleGenerateCodeButtonClick = async () => {
    await setIsGeneratingCode(true);
    await setCurrentPage(PAGES.CODE_GENERATION);

    parent.postMessage(
      {
        pluginMessage: {
          type: "styled-bricks-nodes",
          options: {
            uiFramework: selectedUiFramework,
            cssFramework: selectedCssFramework,
          },
        },
      },
      "*"
    );
  };

  const handleOutputSettingButtonClick = () => {
    setCurrentPage(PAGES.SETTING);
  };

  const isGenerateCodeButtonEnabled = isComponentSelected && connectedToVSCode;

  const getCenterContent = (isConnectedToVSCode: boolean) => {
    if (isConnectedToVSCode) {
      return (
        <div>
          <p className="font-vietnam text-black font-bold text-lg mb-4">
            Select a frame or component to get started
          </p>
          <p className="font-vietnam italic text-sm text-gray-400">
            {isComponentSelected
              ? "Components detected"
              : "No components selected"}
          </p>
        </div>
      );
    }

    return (
      <div>
        <p className="font-vietnam text-black font-bold text-lg mb-4">
          Activate Bricks VSCode extension to get started
        </p>
        <p className="font-vietnam text-black text-sm mb-1">
          Install VSCode extension{" "}
          <a
            href="https://marketplace.visualstudio.com/items?itemName=Bricks.d2c-vscode"
            target="_top"
            className="text-blue-600 dark:text-blue-500 hover:underline"
          >
            {" "}
            here
          </a>
        </p>
        <p className="font-vietnam text-black text-sm">
          For any issues, check out our{" "}
          <a
            href="https://github.com/bricks-cloud/bricks/tree/main/docs"
            target="_top"
            className="text-blue-600 dark:text-blue-500 hover:underline"
          >
            FAQs
          </a>
        </p>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col justify-between items-center">
      <div className="p-6">{getCenterContent(connectedToVSCode)}</div>
      <div className="h-28 w-full flex justify-center items-center">
        <div className="h-28 w-full flex flex-col justify-center items-center gap-4 mb-2">
          <Button
            onClick={handleGenerateCodeButtonClick}
            disabled={!isGenerateCodeButtonEnabled}
          >
            Generate Code
          </Button>
          {connectedToVSCode ? (
            <Button onClick={handleOutputSettingButtonClick} secondary>
              <img className="h-4 mr-2" src={settingsLogo.default} />
              Setting
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Home;
