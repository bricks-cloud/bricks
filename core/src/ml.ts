export const predictImages = async (ids: string[]) => {
  const response = await fetch(
    // "https://ml-backend-nfhyx3cm5q-uc.a.run.app/predict/image",
    "http://localhost:8080/predict/image",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // TODO: allow users to pass in their own API key
        "X-API-KEY": process.env.ML_BACKEND_API_KEY,
      },
      body: JSON.stringify({
        ids,

        // TODO: figure out workaround so users don't have to pass in figmatoken and filekey?
        figmaToken: process.env.FIGMA_TOKEN,
        fileKey: "6P3EluMjO1528T7OtthbI9",
      }),
    }
  );

  return response.json(); // { <figma_node_id>: <predicted_html_tag> }
};

export const predictTexts = async (texts: string[]) => {
  const response = await fetch(
    // "https://ml-backend-nfhyx3cm5q-uc.a.run.app/predict/text",
    "http://localhost:8080/predict/text",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // TODO: allow users to pass in their own API key
        "X-API-KEY": process.env.ML_BACKEND_API_KEY,
      },
      body: JSON.stringify({ texts }),
    }
  );

  // { "predictions": [ /* array of 0's and 1's */ ] }
  return response.json() as Promise<{ predictions: number[] }>;
};
