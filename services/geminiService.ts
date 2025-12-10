import { GoogleGenAI } from "@google/genai";
import { GenerationConfig } from "../types";

// Helper: Ensure we always send raw Base64 bytes to the API, 
// even if the input is a remote URL (like the Unsplash demo image).
async function prepareImageForAPI(input: string): Promise<string> {
  // Case 1: Remote URL (http/https) -> Fetch and convert
  if (input.startsWith('http')) {
    try {
      const response = await fetch(input, { mode: 'cors' });
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          // remove "data:image/jpeg;base64," prefix
          resolve(res.split(',')[1]); 
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Image processing error:", e);
      throw new Error("Could not process source image. If using a demo image, ensure CORS is allowed.");
    }
  }

  // Case 2: Data URL (data:image/...) -> Strip prefix
  if (input.includes('base64,')) {
    return input.split('base64,')[1];
  }

  // Case 3: Raw Base64 or unknown -> Return as is
  return input;
}

// Retry wrapper for robustness against 500/503 errors
async function withRetry<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      // Check for server errors or rate limits
      if (error.status === 503 || error.status === 500 || error.message?.includes('Internal error') || error.message?.includes('Overloaded')) {
        console.warn(`Attempt ${i + 1} failed, retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1))); // Exponential backoffish
      } else {
        throw error; // Throw immediately for other errors (like 400 Bad Request)
      }
    }
  }
  throw lastError;
}

export const generateMarketingImage = async (
  base64Image: string, 
  userPrompt: string,
  config: GenerationConfig
): Promise<{ imageUrl: string }> => {
  return withRetry(async () => {
    try {
      // Initialize inside the function to ensure we use the latest API key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
      const imageModel = "gemini-3-pro-image-preview";
      
      // Convert URL or clean Base64
      const cleanBase64 = await prepareImageForAPI(base64Image);
  
      // Build the prompt based on configuration
      let stylePrompt = "Commercial, High Key, 8k Resolution, Sharp Focus.";
      if (config.blackAndWhite) {
        stylePrompt = "Black and White Photography, High Contrast, Noir Style, Ansel Adams aesthetic.";
      }
  
      // REFINE PROMPTS FOR STRICT VS LOOSE MODES
      let posePrompt = "The object being held (the product) MUST remain exactly as it appears. Ensure the hand grip is natural.";
      if (config.strictPose) {
        posePrompt += " STRICTLY mimic the exact arm angle, hand grip, and body posture of the reference image. Do not move the arm.";
      } else {
        posePrompt += " You have creative freedom with the pose. Analyze the product type and use your best judgement to select the most flattering angle, grip, and body posture to showcase it. Change the arm position to what sells this specific product best. Do not feel bound by the original posture.";
      }
  
      let facePrompt = "Replace the person with a professional model or character that fits the context.";
      if (config.keepFace) {
        facePrompt = "Keep the user's face and identity recognizable, but enhance lighting and skin texture for a professional look.";
      } else {
        facePrompt = "Generative swap: Replace the person in the image with a generated model. Use your best judgement to select a model (age, gender, style) that creates the strongest appeal for this specific product demographic. Do NOT preserve the original identity.";
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
      let generatedImageUrl = "";
      for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
              generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
              break;
          }
      }
      
      // Fallback if something weird happens, though usually it throws before this
      if (!generatedImageUrl) generatedImageUrl = base64Image;
  
      return { imageUrl: generatedImageUrl };
  
    } catch (error) {
      console.error("Gemini Generation Error:", error);
      throw error;
    }
  });
};

export const generateVariantImage = async (
  base64Image: string,
  setting: string,
  angle: string
): Promise<{ imageUrl: string }> => {
  return withRetry(async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Use the faster, cost-effective Flash model for the studio
      const imageModel = "gemini-2.5-flash-image";
  
      // Convert URL or clean Base64
      const cleanBase64 = await prepareImageForAPI(base64Image);
  
      const prompt = `
        Product Photography Remix.
        Object: Keep the main object/product from the input image exactly as is.
        Setting: ${setting}.
        Camera Angle/Composition: ${angle}.
        Lighting: Professional studio lighting matching the setting.
        Style: High resolution, photorealistic, advertising standard.
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
      });
  
      let generatedImageUrl = "";
      for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
              generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
              break;
          }
      }
  
      if (!generatedImageUrl) {
        throw new Error("No image generated from Flash model");
      }
  
      return { imageUrl: generatedImageUrl };
  
    } catch (error) {
      console.error("Gemini Flash Variant Error:", error);
      throw error;
    }
  });
};