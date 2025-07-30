// src/lib/ai.ts

/**
 * A client-side function to interact with our Gemini API backend.
 * It sends a prompt and optional files to the server for processing.
 *
 * @param {string} prompt - The text prompt to send to the AI.
 * @param {File[]} [files] - An optional array of files to include in the request.
 * @returns {Promise<string>} The text response from the AI.
 * @throws {Error} If the API call fails or returns an error.
 */
export async function getAiResponse(prompt: string, files?: File[]): Promise<string> {
  const formData = new FormData();
  formData.append("prompt", prompt);

  if (files) {
    files.forEach((file) => {
      formData.append("files", file);
    });
  }

  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    const result = await response.json();
    return result.text;
  } catch (error) {
    console.error("Error calling AI API:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("An unknown error occurred while contacting the AI service.");
  }
}
