import { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";
import Home from "./pages/home";
import PostCodeGeneration from "./pages/post-code-generation";
import CodeGenerationStatus from "./pages/code-generation-status";
import CodeOutputSetting from "./pages/code-output-setting";
import Error from "./pages/error";
import PageContext, { PAGES } from "./context/page-context";
import { io } from "socket.io-client";
import {
  CssFramework,
  UiFramework,
} from "./constants";
import { withTimeout } from "./utils";

const socket = io("ws://localhost:32044");

const UI = () => {
  const [isComponentSelected, setIsComponentSelected] = useState(false);
  const [currentPage, setCurrentPage] = useState(PAGES.HOME);
  const [previousPage, setPreviousPage] = useState(PAGES.HOME);
  const [connectedToVSCode, setConnectedToVSCode] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // User settings
  const [selectedUiFramework, setSelectedUiFramework] = useState(
    UiFramework.react
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
            height: 350,
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
            height: 420,
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

  onmessage = async (event: MessageEvent) => {
    const pluginMessage = event.data.pluginMessage;

    if (pluginMessage.type === "settings") {
      const { settings } = pluginMessage;

      setSelectedUiFramework(settings.uiFramework);
      setSelectedCssFramework(settings.cssFramework);
    }

    if (pluginMessage.type === "selection-change") {
      setIsComponentSelected(pluginMessage.isComponentSelected);
      setPreviousPage(currentPage);
    }

    if (pluginMessage.type === "generated-files") {
      setIsGeneratingCode(false);

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

              setCurrentPageWithAdjustedScreenSize(PAGES.ERROR);
            }
          },
          () => {
            const error = `VS Code timeout after ${TIMEOUT_SECONDS} seconds.`;

            console.error(error);
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
            setIsGeneratingCode={setIsGeneratingCode}
          />
        )}
        {currentPage === PAGES.SETTING && (
          <CodeOutputSetting
            selectedUiFramework={selectedUiFramework}
            selectedCssFramework={selectedCssFramework}
          />
        )}
        {currentPage === PAGES.CODE_GENERATION && (
          <CodeGenerationStatus
            selectedUiFramework={selectedUiFramework}
            isGeneratingCode={isGeneratingCode}
          />
        )}
        {currentPage === PAGES.POST_CODE_GENERATION && <PostCodeGeneration />}
        {currentPage === PAGES.ERROR && <Error />}
      </div>
    </PageContext.Provider>
  );
};

const root = ReactDOM.createRoot(document.getElementById("react-page"));

root.render(<UI />);
