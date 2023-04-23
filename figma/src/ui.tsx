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
import { CssFramework, Language, UiFramework } from "./constants";
import { withTimeout } from "./utils";

const socket = io("ws://localhost:32044");

const UI = () => {
  const [isComponentSelected, setIsComponentSelected] = useState(false);
  const [currentPage, setCurrentPage] = useState(PAGES.HOME);
  const [previousPage, setPreviousPage] = useState(PAGES.HOME);
  const [connectedToVSCode, setConnectedToVSCode] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // User settings
  const [selectedLanguage, setSelectedLanguage] = useState(Language.javascript);
  const [selectedUiFramework, setSelectedUiFramework] = useState(
    UiFramework.react
  );
  const [selectedCssFramework, setSelectedCssFramework] = useState(
    CssFramework.tailwindcss
  );

  useEffect(() => {
    parent.postMessage({ pluginMessage: { type: "get-settings" } }, "*");

    socket.on("connect", () => {
      setConnectedToVSCode(true);
      console.log("connected!");
    });

    socket.on("disconnect", () => {
      setConnectedToVSCode(false);
      console.log("disconnected!");
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
      const settings = pluginMessage.settings;

      setSelectedLanguage(settings.language);
      setSelectedUiFramework(settings.uiFramework);
      setSelectedCssFramework(settings.cssFramework);
    }

    if (pluginMessage.type === "selection-change") {
      setIsComponentSelected(pluginMessage.isComponentSelected);
      setPreviousPage(currentPage);
      setCurrentPage(PAGES.HOME);
    }

    if (pluginMessage.type === "generated-files") {
      setIsGeneratingCode(false);

      if (pluginMessage.error) {
        console.error("There is an error from Bricks core.");
        setCurrentPage(PAGES.ERROR);
        return;
      }

      socket.emit(
        "code-generation",
        { files: pluginMessage.files },
        withTimeout(
          (response) => {
            if (response.error) {
              console.error("There is an error from VS Code.");
              // TODO: log response.error to amplitude
              setCurrentPage(PAGES.ERROR);
            }
          },
          () => {
            console.error("VS Code took too long to respond.");
            setCurrentPage(PAGES.ERROR);
          },
          // set timeout to 10 seconds
          10 * 1000
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
          setCurrentPage(page);
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
            setSelectedLanguage={setSelectedLanguage}
          />
        )}
        {currentPage === PAGES.CODE_GENERATION && (
          <CodeGenerationStatus isGeneratingCode={isGeneratingCode} />
        )}
        {currentPage === PAGES.POST_CODE_GENERATION && <PostCodeGeneration />}
        {currentPage === PAGES.ERROR && <Error />}
      </div>
    </PageContext.Provider>
  );
};

const root = ReactDOM.createRoot(document.getElementById("react-page"));

root.render(<UI />);
