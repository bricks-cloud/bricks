export const predictImages = async (idImageMap: Record<string, string>) => {
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
      body: JSON.stringify(idImageMap),
    }
  );

  return response.json() as Promise<Record<string, string>>;
};

export const predictTexts = async (idTextMap: Record<string, string>) => {
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
      body: JSON.stringify(idTextMap),
    }
  );

  return response.json() as Promise<Record<string, string>>;
};
