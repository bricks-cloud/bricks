import { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";
import Home from "./pages/home";
import PostCodeGenerationAi from "./pages/post-code-generation-ai";
import PostCodeGeneration from "./pages/post-code-generation";
import CodeGenerationStatus from "./pages/code-generation-status";
import CodeOutputSetting from "./pages/code-output-setting";
import Error from "./pages/error";
import PageContext, { PAGES } from "./context/page-context";
import { io } from "socket.io-client";
import {
  AiApplication,
  CssFramework,
  GenerationMethod,
  Language,
  UiFramework,
} from "./constants";
import { withTimeout } from "./utils";
import { EVENT_ERROR } from "./analytic/amplitude";
import { isEmpty } from "bricks-core/src/utils";

const socket = io("ws://localhost:32044");

const UI = () => {
  const [isComponentSelected, setIsComponentSelected] = useState(false);
  const [currentPage, setCurrentPage] = useState(PAGES.HOME);
  const [previousPage, setPreviousPage] = useState(PAGES.HOME);
  const [connectedToVSCode, setConnectedToVSCode] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isGeneratingCodeWithAi, setIsGeneratingCodeWithAi] = useState(false);
  const [aiApplications, setAiApplications] = useState([
    AiApplication.componentIdentification,
    AiApplication.autoNaming,
  ]);
  const [limit, setLimit] = useState(0);

  // User settings
  const [selectedLanguage, setSelectedLanguage] = useState(Language.javascript);
  const [selectedUiFramework, setSelectedUiFramework] = useState(
    UiFramework.react
  );
  const [selectedGenerationMethod, setSelectedGenerationMethod] = useState(
    GenerationMethod.withai
  );
  const [selectedCssFramework, setSelectedCssFramework] = useState(
    CssFramework.tailwindcss
  );

  const setCurrentPageWithAdjustedScreenSize = (page: string) => {
    if (page === PAGES.POST_CODE_GENERATION) {
      parent.postMessage(
        {
          pluginMessage: {
            type: "adjust-plugin-screen-size",
            height: 550,
            width: 350,
          },
        },
        "*"
      );
    } else if (page === PAGES.POST_CODE_GENERATION_AI) {
      parent.postMessage(
        {
          pluginMessage: {
            type: "adjust-plugin-screen-size",
            height: 300,
            width: 350,
          },
        },
        "*"
      );
    } else if (page === PAGES.SETTING) {
      parent.postMessage(
        {
          pluginMessage: {
            type: "adjust-plugin-screen-size",
            height: 680,
            width: 350,
          },
        },
        "*"
      );
    } else if (page === PAGES.HOME) {
      parent.postMessage(
        {
          pluginMessage: {
            type: "adjust-plugin-screen-size",
            height: 300,
            width: 350,
          },
        },
        "*"
      );
    } else {
      parent.postMessage(
        {
          pluginMessage: {
            type: "adjust-plugin-screen-size",
            height: 300,
            width: 350,
          },
        },
        "*"
      );
    }

    setCurrentPage(page);
  };

  useEffect(() => {
    parent.postMessage({ pluginMessage: { type: "get-settings" } }, "*");
    parent.postMessage({ pluginMessage: { type: "get-limit" } }, "*");
    parent.postMessage({ pluginMessage: { type: "get-last-reset" } }, "*");

    socket.on("connect", () => {
      setConnectedToVSCode(true);
      parent.postMessage(
        {
          pluginMessage: {
            type: "update-connection-status",
            connected: true,
          },
        },
        "*"
      );
      console.log("connected!");
    });

    socket.on("disconnect", () => {
      setConnectedToVSCode(false);
      parent.postMessage(
        {
          pluginMessage: {
            type: "update-connection-status",
            connected: false,
          },
        },
        "*"
      );
    });

    socket.on("pong", () => {
      console.log("last pong:", new Date().toISOString());
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("pong");
    };
  }, []);

  const resetLimit = () => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "set-last-reset",
        },
      },
      "*"
    );

    parent.postMessage(
      {
        pluginMessage: {
          type: "reset-limit",
        },
      },
      "*"
    );

    setLimit(6);
  };

  onmessage = async (event: MessageEvent) => {
    const pluginMessage = event.data.pluginMessage;

    if (pluginMessage.type === "settings") {
      const { userId, settings } = pluginMessage;

      // Send user id to VS Code for analytics purpose. This code will try sending until connected.
      const intervalId = setInterval(() => {
        if (!socket.connected) return;
        socket.emit("user-id", userId);
        clearInterval(intervalId);
      }, 1000);

      if (settings) {
      }

      setSelectedLanguage(settings.language);
      setSelectedUiFramework(settings.uiFramework);
      setSelectedCssFramework(settings.cssFramework);
      setSelectedGenerationMethod(settings.generationMethod);
    }

    if (pluginMessage.type === "get-limit") {
      if (Number.isInteger(pluginMessage.limit) && pluginMessage.limit >= 0) {
        setLimit(pluginMessage.limit);
      } else {
        resetLimit();
      }
    }

    if (pluginMessage.type === "decrease-limit") {
      if (Number.isInteger(pluginMessage.limit) && pluginMessage.limit >= 0) {
        setLimit(pluginMessage.limit);
      }
    }

    if (pluginMessage.type === "get-last-reset") {
      // 86400000 is one day
      if (
        !!pluginMessage.reset &&
        Date.now() - pluginMessage.reset > 86400000
      ) {
        resetLimit();
      }
    }

    if (pluginMessage.type === "selection-change") {
      setIsComponentSelected(pluginMessage.isComponentSelected);
      setPreviousPage(currentPage);

      if (!isGeneratingCodeWithAi) {
        setCurrentPageWithAdjustedScreenSize(PAGES.HOME);
      }
    }

    if (pluginMessage.type === "generated-files") {
      if (isGeneratingCodeWithAi) {
        setAiApplications(pluginMessage.applications);
      }

      if (!isEmpty(pluginMessage.applications)) {
        parent.postMessage(
          {
            pluginMessage: {
              type: "decrease-limit",
            },
          },
          "*"
        );
      }

      setIsGeneratingCode(false);
      setIsGeneratingCodeWithAi(false);

      if (pluginMessage.error) {
        // Error from Bricks core
        setCurrentPageWithAdjustedScreenSize(PAGES.ERROR);
        return;
      }

      const TIMEOUT_SECONDS = 10;

      socket.emit(
        "code-generation",
        { files: pluginMessage.files },
        withTimeout(
          (response) => {
            if (response.error) {
              console.error("Error from VS Code. See more in VS code console.");
              parent.postMessage(
                {
                  pluginMessage: {
                    type: "analytics",
                    eventName: EVENT_ERROR,
                    eventProperties: {
                      source: "vscode",
                      error: response.error,
                    },
                  },
                },
                "*"
              );

              setCurrentPageWithAdjustedScreenSize(PAGES.ERROR);
            }
          },
          () => {
            const error = `VS Code timeout after ${TIMEOUT_SECONDS} seconds.`;

            console.error(error);
            parent.postMessage(
              {
                pluginMessage: {
                  type: "analytics",
                  eventName: EVENT_ERROR,
                  eventProperties: {
                    source: "vscode",
                    error,
                  },
                },
              },
              "*"
            );
            setCurrentPageWithAdjustedScreenSize(PAGES.ERROR);
          },
          // set timeout
          TIMEOUT_SECONDS * 1000
        )
      );
    }
  };

  return (
    <PageContext.Provider
      value={{
        currentPage: currentPage,
        previousPage: previousPage,
        setCurrentPage: (page: string) => {
          setPreviousPage(currentPage);
          setCurrentPageWithAdjustedScreenSize(page);
        },
      }}
    >
      <div className="h-full">
        {currentPage === PAGES.HOME && (
          <Home
            connectedToVSCode={connectedToVSCode}
            isComponentSelected={isComponentSelected}
            selectedUiFramework={selectedUiFramework}
            selectedCssFramework={selectedCssFramework}
            selectedLanguage={selectedLanguage}
            limit={limit}
            selectedGenerationMethod={selectedGenerationMethod}
            setIsGeneratingCodeWithAi={setIsGeneratingCodeWithAi}
            setIsGeneratingCode={setIsGeneratingCode}
          />
        )}
        {currentPage === PAGES.SETTING && (
          <CodeOutputSetting
            selectedUiFramework={selectedUiFramework}
            setSelectedUiFramework={setSelectedUiFramework}
            selectedCssFramework={selectedCssFramework}
            setSelectedCssFramework={setSelectedCssFramework}
            selectedLanguage={selectedLanguage}
            limit={limit}
            setSelectedLanguage={setSelectedLanguage}
            selectedGenerationMethod={selectedGenerationMethod}
            setSelectedGenerationMethod={setSelectedGenerationMethod}
          />
        )}
        {currentPage === PAGES.CODE_GENERATION && (
          <CodeGenerationStatus
            selectedGenerationMethod={selectedGenerationMethod}
            selectedUiFramework={selectedUiFramework}
            isGeneratingCode={isGeneratingCode}
            limit={limit}
            isGeneratingCodeWithAi={isGeneratingCodeWithAi}
          />
        )}
        {currentPage === PAGES.POST_CODE_GENERATION && <PostCodeGeneration />}
        {currentPage === PAGES.POST_CODE_GENERATION_AI && (
          <PostCodeGenerationAi limit={limit} aiApplications={aiApplications} />
        )}
        {currentPage === PAGES.ERROR && <Error />}
      </div>
    </PageContext.Provider>
  );
};

const root = ReactDOM.createRoot(document.getElementById("react-page"));

root.render(<UI />);
