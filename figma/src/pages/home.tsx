import { useContext, PropsWithChildren, useEffect } from "react";
import * as bricksLogo from "../assets/bricks-logo-without-bg.png";
import * as settingsLogo from "../assets/setting-logo.png";
import PageContext, { PAGES } from "../context/page-context";
import { CssFramework, UiFramework, Language } from "../constants";
import {
  EVENT_GENERATE_BUTTON_CLICK,
  EVENT_INSTALLATION_LINK_CLICK,
  EVENT_FAQ_LINK_CLICK,
  EVENT_GENERATE_WITH_AI_BUTTON_CLICK,
} from "../analytics/amplitude";
import Button from "../components/Button";

export interface Props {
  connectedToVSCode: boolean;
  selectedUiFramework: UiFramework;
  selectedCssFramework: CssFramework;
  selectedLanguage: Language;
  isComponentSelected: boolean;
  isScanningForAi: boolean;
  canGenerateWithAi: boolean;
  limit: number,
  setIsGeneratingCodeWithAi: (value: boolean) => void;
  setIsGeneratingCode: (value: boolean) => void;
}

const Home = (props: PropsWithChildren<Props>) => {
  const {
    connectedToVSCode,
    isComponentSelected,
    setIsGeneratingCodeWithAi,
    isScanningForAi,
    canGenerateWithAi,
    limit,
    setIsGeneratingCode,
    selectedUiFramework,
    selectedCssFramework,
    selectedLanguage,
  } = props;
  const { setCurrentPage } = useContext(PageContext);

  const handleGenerateCodeButtonClick = () => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "styled-bricks-nodes",
          options: {
            language: selectedLanguage,
            uiFramework: selectedUiFramework,
            cssFramework: selectedCssFramework,
          },
        },
      },
      "*"
    );
    setIsGeneratingCode(true);
    setCurrentPage(PAGES.CODE_GENERATION);

    parent.postMessage(
      {
        pluginMessage: {
          type: "analytics",
          eventName: EVENT_GENERATE_BUTTON_CLICK,
          eventProperties: {
            language: selectedLanguage,
            uiFramework: selectedUiFramework,
            cssFramework: selectedCssFramework,
          },
        },
      },
      "*"
    );
  };

  const handleGenerateCodeWithAiButtonClick = () => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "generate-code-with-ai",
          options: {
            language: selectedLanguage,
            uiFramework: selectedUiFramework,
            cssFramework: selectedCssFramework,
          },
        },
      },
      "*"
    );

    setIsGeneratingCodeWithAi(true);
    setIsGeneratingCode(true);
    setCurrentPage(PAGES.CODE_GENERATION);

    parent.postMessage(
      {
        pluginMessage: {
          type: "analytics",
          eventName: EVENT_GENERATE_WITH_AI_BUTTON_CLICK,
          eventProperties: {
            language: selectedLanguage,
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

  const handleInstallationLinkClick = () => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "analytics",
          eventName: EVENT_INSTALLATION_LINK_CLICK,
          eventProperties: {
            language: selectedLanguage,
            uiFramework: selectedUiFramework,
            cssFramework: selectedCssFramework,
          },
        },
      },
      "*"
    );
  };

  const handleFaqLinkClick = () => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "analytics",
          eventName: EVENT_FAQ_LINK_CLICK,
          eventProperties: {
            language: selectedLanguage,
            uiFramework: selectedUiFramework,
            cssFramework: selectedCssFramework,
          },
        },
      },
      "*"
    );
  };

  const isGenerateCodeButtonEnabled = isComponentSelected && connectedToVSCode;
  const isGenerateWithAiButtonEnabled = isGenerateCodeButtonEnabled && canGenerateWithAi && selectedUiFramework === UiFramework.react;

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
            onClick={handleInstallationLinkClick}
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
            onClick={handleFaqLinkClick}
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
    <div className="h-full w-full flex flex-col justify-between items-center pb-8">
      <div className="bg-gray-700 h-16 w-full p-6 flex items-center justify-between px-6 text-white">
        <p className="font-vietnam font-bold text-xl mb-2 mt-2">
          Bricks
        </p>
        <img className="h-12" src={bricksLogo.default} />
      </div>

      <div className="p-6">{getCenterContent(connectedToVSCode)}</div>

      <div className="h-36 w-full flex justify-center items-center">
        <div className="h-36 w-full flex flex-col justify-center items-center gap-4">
          <Button
            onClick={handleGenerateCodeWithAiButtonClick}
            loading={isScanningForAi}
            disabled={!isGenerateWithAiButtonEnabled || isScanningForAi || limit <= 0}
          >
            Generate Code With AI {'('}{limit}{')'}
          </Button>
          <Button
            onClick={handleGenerateCodeButtonClick}
            disabled={!isGenerateCodeButtonEnabled}
          >
            Generate Code
          </Button>
          <Button onClick={handleOutputSettingButtonClick} secondary>
            <img className="h-4 mr-2" src={settingsLogo.default} />
            Output Setting
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
