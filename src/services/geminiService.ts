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
  const relationship = personProfile?.relationship || 'important person';
  const interestList = (personProfile?.interests || []).join(', ') || 'not specified';
  const dislikeList = (personProfile?.dislikes || []).join(', ') || 'none listed';
  const brandList = (personProfile?.favoriteBrands || []).join(', ') || 'none listed';
  const pastGiftList = pastGifts.length
    ? pastGifts
        .slice(-8)
        .map((gift) => `${gift.itemName}${gift.occasion ? ` for ${gift.occasion}` : ''}${gift.cost ? ` ($${gift.cost})` : ''}`)
        .join('; ')
    : 'No past gifts recorded.';
  const maxBudget = budget && budget > 0 ? budget : undefined;

  const prompt = `You are a premium gift strategist who is allowed to use Google Search grounding.
Generate 5 highly specific gift recommendations for this person.

Relationship context: ${relationship}
Name: ${personProfile?.name || 'Unknown'}
Bio / profile: ${personProfile?.bio || 'No bio provided.'}
Interests: ${interestList}
Dislikes: ${dislikeList}
Favorite brands: ${brandList}
Budget ceiling: ${maxBudget ? `$${maxBudget}` : 'Flexible, but avoid unnecessary splurges'}
Past gifts already given: ${pastGiftList}

Instructions:
- Relationship fit matters most. The gifts should feel right for a ${relationship}, not just any person.
- Use web knowledge to ground suggestions in real, current gift categories, trends, and product directions.
- Avoid recommending the same type of gift repeatedly if it overlaps too much with past gifts.
- Favor giftable ideas that are practical to purchase online in the United States.
- Keep descriptions concrete and helpful, not vague.
- If budget is provided, keep each recommendation at or under budget.
- Provide search-friendly buying links or shopping-search links rather than making up fake product pages.

Return valid JSON only as an array of 5 objects with this exact shape:
[
  {
    "itemName": "string",
    "description": "string",
    "price": 0,
    "buyLink": "string",
    "explanation": "string",
    "relationshipFit": "string",
    "searchQuery": "string"
  }
]`;

  const normalizeRecommendations = (rawRecommendations: any[]) =>
    rawRecommendations.map((recommendation) => {
      const searchQuery =
        recommendation.searchQuery ||
        `${recommendation.itemName} gift for ${relationship}`;

      return {
        itemName: recommendation.itemName,
        description: recommendation.description,
        price: typeof recommendation.price === 'number' ? recommendation.price : 0,
        buyLink:
          recommendation.buyLink ||
          `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
        explanation: recommendation.explanation,
        relationshipFit:
          recommendation.relationshipFit ||
          `Chosen to feel personal for a ${relationship}.`,
        searchQuery
      };
    });

  const parseJsonArray = (text: string) => {
    const trimmed = text.trim();
    const start = trimmed.indexOf('[');
    const end = trimmed.lastIndexOf(']');
    if (start === -1 || end === -1) {
      throw new Error('Recommendation response did not contain a JSON array.');
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  };

  try {
    const interaction = await ai.interactions.create({
      model: 'gemini-2.5-flash',
      input: prompt,
      tools: [{ type: 'google_search' }],
      response_mime_type: 'application/json'
    });

    const textOutput =
      interaction.outputs
        ?.filter((output: any) => output.type === 'text')
        .map((output: any) => output.text || '')
        .join('\n') || '';

    return normalizeRecommendations(parseJsonArray(textOutput));
  } catch (groundedError) {
    console.error('Grounded recommendations failed, falling back to standard generation:', groundedError);

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
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
              explanation: { type: Type.STRING },
              relationshipFit: { type: Type.STRING },
              searchQuery: { type: Type.STRING }
            },
            required: ["itemName", "description", "price", "buyLink", "explanation", "relationshipFit", "searchQuery"]
          }
        }
      }
    });

    return normalizeRecommendations(JSON.parse(response.text));
  }
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

export async function generateThankYouNote(
  personName: string,
  giftName: string,
  relationship: string,
  previousNotes: string[] = []
) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  const prompt = `Generate a warm, personalized card note for ${personName} about ${giftName}. Our relationship is ${relationship}.
  
  Keep it heartfelt, specific, and concise enough to fit naturally in a card.
  Do not repeat wording, structure, or standout phrases from these previous notes to the same person:
  ${previousNotes.length > 0 ? previousNotes.map((note, index) => `${index + 1}. ${note}`).join('\n') : 'No previous notes available.'}
  
  Return only the card note text.`;

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
