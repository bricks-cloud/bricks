import React from "react";

interface ButtonProps extends React.ComponentProps<"button"> {
  primary?: boolean;
  secondary?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  primary,
  secondary,
  disabled,
  children,
  ...props
}) => {
  // Secondary button
  if (secondary) {
    const textColor = disabled ? "text-gray-300" : "text-blue-600";
    return (
      <button
        {...props}
        className={`text-center inline-flex items-center text-base text-blue-600 ${textColor}`}
      >
        {children}
      </button>
    );
  }

  // Primary button
  const buttonColor = disabled
    ? " bg-gray-300"
    : " bg-blue-700 hover:bg-blue-800";
  return (
    <button
      disabled={disabled}
      type="button"
      className={`font-roboto text-white focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-base px-10 py-3 focus:outline-none ${buttonColor}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
