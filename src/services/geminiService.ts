import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    // Fallback to a dummy key to prevent crash on initialization if key is missing
    aiInstance = new GoogleGenAI({ apiKey: apiKey || 'AIzaSy-dummy-key-for-initialization' });
  }
  return aiInstance;
}

export async function identifyItem(base64Image: string) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  const prompt = "Identify the main item in this image. Provide a short name (max 5 words) and a brief description (max 20 words). Format as JSON: { \"name\": \"...\", \"description\": \"...\" }";
  
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text);
}

export async function scanEmailsForGifts(emails: string[]) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  const prompt = `Analyze these email snippets and identify potential gift order confirmations. For each, provide the item name, date, cost, and retailer. Format as JSON array: [{ "itemName": "...", "date": "...", "cost": 0.0, "retailer": "..." }]`;
  
  const response = await ai.models.generateContent({
    model,
    contents: emails.join("\n\n"),
    config: {
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text);
}

export async function getGiftRecommendations(personProfile: any, pastGifts: any[], budget?: number) {
  const ai = getAI();
  const model = "gemini-3.1-pro-preview";
  const prompt = `Suggest 5 personalized gift ideas for this person:
    Profile: ${JSON.stringify(personProfile)}
    Past Gifts: ${JSON.stringify(pastGifts)}
    Budget: ${budget ? `$${budget}` : 'Any'}
    
    For each idea, provide a name, description, estimated price, a search link, and a short explanation of why this gift fits the person based on their profile.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING },
            description: { type: Type.STRING },
            price: { type: Type.NUMBER },
            buyLink: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["itemName", "description", "price", "buyLink", "explanation"]
        }
      }
    }
  });

  return JSON.parse(response.text);
}

export async function extractInterestsFromBio(bio: string) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  const prompt = `Extract a detailed profile from this text: "${bio}". 
    Identify interests, dislikes, favorite brands, and clothing/shoe sizes if mentioned. 
    Format as JSON: { "interests": [], "dislikes": [], "favoriteBrands": [], "sizes": {} }`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          interests: { type: Type.ARRAY, items: { type: Type.STRING } },
          dislikes: { type: Type.ARRAY, items: { type: Type.STRING } },
          favoriteBrands: { type: Type.ARRAY, items: { type: Type.STRING } },
          sizes: { type: Type.OBJECT, additionalProperties: { type: Type.STRING } }
        }
      }
    }
  });

  return JSON.parse(response.text);
}

export async function detectGiftConflicts(newItemName: string, pastGifts: any[]) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  const prompt = `Check if "${newItemName}" is too similar to any of these past gifts: ${JSON.stringify(pastGifts)}. 
    Return a warning message if it is, or null if it's unique.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isConflict: { type: Type.BOOLEAN },
          warning: { type: Type.STRING }
        }
      }
    }
  });

  return JSON.parse(response.text);
}

export async function generateThankYouNote(personName: string, giftName: string, relationship: string) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  const prompt = `Generate a warm, personalized thank-you note for ${personName} who gave me a ${giftName}. Our relationship is: ${relationship}.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt
  });

  return response.text;
}

export async function scanReceipt(base64Image: string) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  const prompt = "Extract items and prices from this receipt image.";

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING },
            price: { type: Type.NUMBER }
          },
          required: ["itemName", "price"]
        }
      }
    }
  });

  return JSON.parse(response.text);
}

export async function extractWishlistIdeas(wishlistUrl: string) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  const prompt = `Extract gift ideas from this wishlist link or text: "${wishlistUrl}". Return a JSON array of objects with itemName and description.`;
  
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["itemName", "description"]
        }
      }
    }
  });
  return JSON.parse(response.text);
}
