import { useContext, PropsWithChildren } from "react";
import * as bricksLogo from "../assets/bricks-logo-without-bg.png";
import * as settingsLogo from "../assets/setting-logo.png";
import PageContext, { PAGES } from "../context/page-context";
import { CssFramework, UiFramework, Language } from "../constants";
import { EVENT_GENERATE_BUTTON_CLICK, EVENT_INSTALLATION_LINK_CLICK, EVENT_FAQ_LINK_CLICK } from "../analytics/amplitude";

export interface Props {
  connectedToVSCode: boolean;
  selectedUiFramework: UiFramework;
  selectedCssFramework: CssFramework;
  selectedLanguage: Language;
  isComponentSelected: boolean;
  setIsGeneratingCode: (value: boolean) => void;
}

const Home = (props: PropsWithChildren<Props>) => {
  const {
    connectedToVSCode,
    isComponentSelected,
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
      "*",
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
      "*",
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
      "*",
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
      "*",
    );
  };

  const isGenerateCodeButtonEnabled = isComponentSelected && connectedToVSCode;
  const buttonColor = isGenerateCodeButtonEnabled
    ? " bg-blue-700 hover:bg-blue-800"
    : " bg-gray-300";

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
          Install VSCode extension <a onClick={handleInstallationLinkClick} href="https://marketplace.visualstudio.com/items?itemName=Bricks.d2c-vscode" target="_top" className="text-blue-600 dark:text-blue-500 hover:underline"> here</a>
        </p>
        <p className="font-vietnam text-black text-sm">
          For any issues, check out our <a onClick={handleFaqLinkClick} href="https://github.com/bricks-cloud/bricks/tree/main/docs" target="_top" className="text-blue-600 dark:text-blue-500 hover:underline">FAQs</a>
        </p>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col justify-between items-center">
      <div className="bg-dark-mask h-52 w-full bg-cover bg-right-bottom p-6 flex items-center justify-center text-white">
        <div className="w-full mb-6 flex flex-col items-start justify-center">
          <p className="font-vietnam font-bold text-2xl mb-4">
            Welcome to Bricks
          </p>
          <p className="font-vietnam w-64 font-normal text-sm text-gray-300">
            Auto transform Figma into code that can be used on the fly
          </p>
        </div>
        <img className="h-16 mr-4" src={bricksLogo.default} />
      </div>

      <div className="p-6">{getCenterContent(connectedToVSCode)}</div>

      <div className="h-36 w-full flex justify-center items-center">
        <div className="h-36 w-full flex flex-col justify-center items-center">
          <button
            onClick={handleGenerateCodeButtonClick}
            disabled={!isGenerateCodeButtonEnabled}
            type="button"
            className={
              "mb-4 font-roboto text-white focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-base px-10 py-3 focus:outline-none" +
              buttonColor
            }
          >
            Generate Code
          </button>
          <button
            onClick={handleOutputSettingButtonClick}
            className="text-center inline-flex items-center text-sm text-blue-600"
          >
            <img className="h-4 mr-2" src={settingsLogo.default} />
            Output Setting
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
