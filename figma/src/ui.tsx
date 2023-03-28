import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";
import { StyledBricksNode } from "bricks-core/src/StyledBricksNode";
import { IFile } from "bricks-core/src/IFile";
import htmlPlugin from "bricks-html-plugin";
import reactPlugin from "bricks-react-plugin";
import Home from "./pages/home";
import PostCodeGeneration from "./pages/post-code-generation";
import CodeGenerationStatus from "./pages/code-generation-status";
import CodeOutputSetting from "./pages/code-output-setting";
import PageContext, { PAGES } from "./context/page-context";
import { io } from "socket.io-client";
import { CssFramework, Language, UiFramework } from "./constants";

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
    UiFramework.html
  );
  const [selectedCssFramework, setSelectedCssFramework] = useState(
    CssFramework.css
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


    if (pluginMessage.type === "new-styled-bricks-nodes") {
      socket.emit("code-generation", { files: pluginMessage.files }, (response) => {
        if (response.status === "ok") {
          setIsGeneratingCode(false);
        }
      });

    }

    if (pluginMessage.type === "styled-bricks-nodes") {
      const styledBricksNodes: StyledBricksNode[] =
        pluginMessage.styledBricksNodes;

      let files: IFile[] = [];

      if (selectedUiFramework === UiFramework.html) {
        files = htmlPlugin.transform(styledBricksNodes, {
          tailwindcss: selectedCssFramework === CssFramework.tailwindcss,
        });
      }

      if (selectedUiFramework === UiFramework.react) {
        files = reactPlugin.transform(styledBricksNodes, {
          typescript: selectedLanguage === Language.typescript,
          tailwindcss: selectedCssFramework === CssFramework.tailwindcss,
        });
      }

      socket.emit("code-generation", { files }, (response) => {
        if (response.status === "ok") {
          setIsGeneratingCode(false);
        }
      });
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
      </div>
    </PageContext.Provider>
  );
};

const root = ReactDOM.createRoot(document.getElementById("react-page"));

root.render(<UI />);
