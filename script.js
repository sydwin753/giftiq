const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 }
);

document.querySelectorAll(".reveal").forEach((element) => {
  observer.observe(element);
});

const giftForm = document.querySelector("#gift-form");
const resultTitle = document.querySelector("#result-title");
const resultSummary = document.querySelector("#result-summary");
const resultList = document.querySelector("#result-list");

const recommendations = {
  "best-friend": {
    birthday: {
      cozy: {
        title: "Warm birthday ideas for your best friend",
        summary: "Lean into comfort, nostalgia, and one detail that feels deeply personal.",
        items: [
          ["Movie-night bundle", "Plush blanket, gourmet popcorn, and a handwritten note."],
          ["Soft reset kit", "Cloud socks, tea sachets, and a sleep mask in her favorite color."],
          ["Memory box", "Printed photos, tiny keepsakes, and an inside-joke card."]
        ]
      },
      elevated: {
        title: "Curated birthday ideas for your best friend",
        summary: "Start with gifts that feel close, elevated, and easy to personalize.",
        items: [
          ["Personal ritual set", "Journal, satin pouch, and a signature candle."],
          ["Small luxury bundle", "Silk sleep mask, lip treatment, and espresso gift card."],
          ["Memory-forward gift", "Mini photo book paired with a handwritten note."]
        ]
      }
    }
  },
  mom: {
    "mothers-day": {
      practical: {
        title: "Useful Mother's Day gifts that still feel thoughtful",
        summary: "Choose upgraded everyday items she will reach for constantly.",
        items: [
          ["Kitchen refresh", "Beautiful olive oil, linen towel, and recipe journal."],
          ["Morning routine set", "Insulated mug, premium coffee, and a compact vase."],
          ["Desk calm bundle", "Planner, pen set, and hand cream for her work bag."]
        ]
      },
      elevated: {
        title: "Elegant Mother's Day picks for mom",
        summary: "Aim for polished gifts that feel generous without being overcomplicated.",
        items: [
          ["Garden brunch edit", "Ceramic planter, tea tin, and floral shears."],
          ["Quiet luxury set", "Cashmere socks, framed photo, and rich hand balm."],
          ["Hosting upgrade", "Serving board, olive dish, and a bottle she loves."]
        ]
      }
    }
  },
  boyfriend: {
    birthday: {
      playful: {
        title: "Playful birthday ideas for your boyfriend",
        summary: "Keep it fun, a little flirty, and built around something you can do together.",
        items: [
          ["Date-night kit", "Card game, snack spread, and movie vouchers."],
          ["Mini hobby drop", "Accessory for his favorite hobby plus a funny card."],
          ["Weekend surprise", "Disposable camera, road-trip snacks, and playlist note."]
        ]
      },
      practical: {
        title: "Actually useful birthday gifts for your boyfriend",
        summary: "Focus on upgrades he would want but probably would not buy himself.",
        items: [
          ["Daily carry refresh", "Wallet, key organizer, and sleek water bottle."],
          ["Travel-ready set", "Dopp kit, charger pouch, and compression socks."],
          ["Desk upgrade", "Laptop stand, blue-light glasses, and cable organizer."]
        ]
      }
    }
  },
  coworker: {
    "thank-you": {
      "under-25": {
        title: "Smart thank-you gifts for a coworker under $25",
        summary: "Professional, friendly, and polished is the goal here.",
        items: [
          ["Coffee break combo", "Local beans or cafe card with a great snack."],
          ["Desk detail", "Nice pen and a minimalist notebook."],
          ["Small appreciation set", "Hand cream, mints, and a concise thank-you note."]
        ]
      }
    }
  }
};

function fallbackRecommendation({ recipient, occasion, vibe, budget }) {
  const labels = {
    "best-friend": "best friend",
    mom: "mom",
    boyfriend: "boyfriend",
    coworker: "coworker",
    birthday: "birthday",
    "mothers-day": "Mother's Day",
    graduation: "graduation",
    "thank-you": "thank-you",
    cozy: "cozy",
    elevated: "elevated",
    playful: "playful",
    practical: "practical",
    "under-25": "under $25",
    "under-50": "under $50",
    "under-100": "under $100",
    splurge: "splurge"
  };

  return {
    title: `Gift ideas for your ${labels[recipient]} ${labels[occasion]} moment`,
    summary: `Build around a ${labels[vibe]} feel and keep the total around ${labels[budget]}.`,
    items: [
      ["Anchor gift", "Choose one main item tied directly to something they already love."],
      ["Texture piece", "Add something tactile or beautiful so the gift feels more finished."],
      ["Personal note", "Include a short message explaining why this reminded you of them."]
    ]
  };
}

function findRecommendation(values) {
  const exact =
    recommendations[values.recipient]?.[values.occasion]?.[values.vibe] ||
    recommendations[values.recipient]?.[values.occasion]?.[values.budget];

  return exact || fallbackRecommendation(values);
}

function renderRecommendation(recommendation) {
  resultTitle.textContent = recommendation.title;
  resultSummary.textContent = recommendation.summary;
  resultList.innerHTML = recommendation.items
    .map(
      ([title, copy]) => `
        <article class="result-item">
          <h4>${title}</h4>
          <p>${copy}</p>
        </article>
      `
    )
    .join("");
}

giftForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(giftForm);
  const values = Object.fromEntries(formData.entries());
  const recommendation = findRecommendation(values);
  renderRecommendation(recommendation);
});
