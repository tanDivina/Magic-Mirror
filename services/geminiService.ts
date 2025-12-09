import { GoogleGenAI } from "@google/genai";
import { GenerationConfig } from "../types";

export const generateMarketingImage = async (
  base64Image: string, 
  userPrompt: string,
  config: GenerationConfig
): Promise<{ imageUrl: string }> => {
  try {
    // Initialize inside the function to ensure we use the latest API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const imageModel = "gemini-3-pro-image-preview";
    
    // Clean base64 string
    const cleanBase64 = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;

    // Build the prompt based on configuration
    let stylePrompt = "Commercial, High Key, 8k Resolution, Sharp Focus.";
    if (config.blackAndWhite) {
      stylePrompt = "Black and White Photography, High Contrast, Noir Style, Ansel Adams aesthetic.";
    }

    let posePrompt = "The object being held (the product) MUST remain exactly as it appears. Ensure the hand grip is natural.";
    if (config.strictPose) {
      posePrompt += " STRICTLY mimic the exact arm angle, hand grip, and body posture of the reference image.";
    }

    let facePrompt = "Replace the person with a professional model or character that fits the context.";
    if (config.keepFace) {
      facePrompt = "Keep the user's face and identity recognizable, but enhance lighting and skin texture for a professional look.";
    }

    let locationPrompt = "";
    if (config.lockLocation) {
      locationPrompt = "Maintain the original background environment and geometry. Do not generate a new background, only enhance the existing one.";
    }

    let productPreservationPrompt = "The object held in the hand is the focus.";
    if (config.lockProduct) {
      productPreservationPrompt = `
      CRITICAL - PRODUCT PRESERVATION:
      The object held in the hand is a real commercial product. 
      You MUST preserve the PRODUCT TEXT, LOGOS, and LABEL DETAILS exactly as they appear in the reference image.
      Do not hallucinate new text on the label. Do not blur or distort the brand name.
      Treat the product pixels as ground truth.
      `;
    }

    const prompt = `
      Professional Product Photography. 
      Task: Transform this reference image into a high-end commercial advertisement.
      
      ${productPreservationPrompt}

      Product Integrity: ${posePrompt}
      Subject: ${facePrompt}
      Context/Background: ${userPrompt}. ${locationPrompt}
      Style: ${stylePrompt}
    `;

    const imageResponse = await ai.models.generateContent({
      model: imageModel,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          },
        ],
      },
      config: {
        imageConfig: {
            aspectRatio: "3:4", 
            imageSize: "2K"
        },
      },
    });

    // Extract the generated image
    let generatedImageUrl = base64Image; // Fallback
    for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
        }
    }

    return { imageUrl: generatedImageUrl };

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};