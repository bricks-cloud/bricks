import React, { useContext } from "react";
import { RadioGroup as BaseRadioGroup } from "@headlessui/react";
import PageContext, { PAGES } from "../context/page-context";
import {
  CssFramework,
  Settings,
  UiFramework,
} from "../constants";
import * as logo from "../assets/arrow.png";
import htmlLogo from "../assets/html-logo.svg";
import reactLogo from "../assets/react-logo.svg";
import cssLogo from "../assets/css-logo.svg";
import tailwindcssLogo from "../assets/tailwindcss-logo.svg";
import Button from "../components/Button";

type Option<T> = {
  id: T;
  name: string;
  logo: string;
};

const UiFrameworks: Option<UiFramework>[] = [
  { id: UiFramework.html, name: "HTML", logo: htmlLogo },
  { id: UiFramework.react, name: "React", logo: reactLogo },
];

const CssFrameworks: Option<CssFramework>[] = [
  { id: CssFramework.css, name: "CSS", logo: cssLogo },
  { id: CssFramework.tailwindcss, name: "TailwindCSS", logo: tailwindcssLogo },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function updateSettings(
  uiFramework: string,
  cssFramework: string,
) {
  parent.postMessage(
    {
      pluginMessage: {
        type: "update-settings",
        settings: {
          uiFramework,
          cssFramework,
        } as Settings,
      },
    },
    "*" //TODO: can use different origin??
  );
}

const chooseRadioButtonStyle = (checked: boolean, disabled: boolean) => {
  const baseClassName =
    "border rounded-md py-3 px-3 flex items-center justify-center text-sm font-medium sm:flex-1 hover:cursor-pointer";
  if (disabled) {
    return classNames(
      "bg-gray-300 border-gray-300 text-gray-500",
      baseClassName
    );
  }

  if (checked) {
    return classNames(
      "bg-blue-50 border-blue-700 border-2 text-gray-900 hover:bg-blue-50",
      "shadow-md",
      "text-gray-900",
      baseClassName
    );
  }

  return classNames("shadow-md", "text-gray-900", baseClassName);
};

const RadioGroup = ({
  value,
  onChange,
  label,
  options,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: Option<UiFramework | CssFramework>[];
  disabled?: boolean;
}) => (
  <BaseRadioGroup value={value} onChange={onChange} disabled={disabled}>
    <BaseRadioGroup.Label className="font-vietnam font-bold text-lg">
      {label}
    </BaseRadioGroup.Label>

    <div className="mt-3 grid grid-cols-2 gap-x-4">
      {options.map((option) => (
        <BaseRadioGroup.Option
          key={option.id}
          value={option.id}
          className={({ checked }) => chooseRadioButtonStyle(checked, disabled)}
        >
          <img className="h-7 mr-2" src={option.logo} />
          <BaseRadioGroup.Label as="span" className="text-sm">
            {option.name}
          </BaseRadioGroup.Label>
        </BaseRadioGroup.Option>
      ))}
    </div>
  </BaseRadioGroup>
);

interface Props {
  selectedUiFramework: UiFramework;
  setSelectedUiFramework: (value: UiFramework) => void;
  selectedCssFramework: CssFramework;
  setSelectedCssFramework: (value: CssFramework) => void;
}

const CodeOutputSetting: React.FC<Props> = ({
  selectedUiFramework,
  setSelectedUiFramework,
  selectedCssFramework,
  setSelectedCssFramework,
}) => {
  const { previousPage, setCurrentPage } = useContext(PageContext);

  const handleBackClick = () => {
    setCurrentPage(previousPage);
  };

  const handleSaveButtonClick = () => {
    updateSettings(
      selectedUiFramework,
      selectedCssFramework,
    );
    setCurrentPage(PAGES.HOME);
  };

  return (
    <div className="h-full w-full flex flex-col justify-between items-center px-3 py-5">
      <div className="w-full">
        <div className="flex items-start">
          <button onClick={handleBackClick}>
            <img className="h-7" src={logo.default} />
          </button>
          <div className="ml-2 flex flex-col justify-start">
            <p className="font-vietnam font-bold text-lg mb-2">
              Select your framework
            </p>
            <p className="font-vietnam font-normal text-base text-gray-400">
              You can change this later
            </p>
          </div>
        </div>

        <div className="my-6 mx-2 flex flex-col gap-8">
          <RadioGroup
            value={selectedUiFramework}
            onChange={setSelectedUiFramework}
            label="UI Framework"
            options={UiFrameworks}
          />
          <RadioGroup
            value={selectedCssFramework}
            onChange={setSelectedCssFramework}
            label="CSS Framework"
            options={CssFrameworks}
          />
        </div>
      </div>

      <div className="h-36 w-full flex justify-center items-start">
        <Button type="button" onClick={handleSaveButtonClick}>
          Save
        </Button>
      </div>
    </div>
  );
};

export default CodeOutputSetting;
