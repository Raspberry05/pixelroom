export type IngredientAmount = {
  ingredientId: string;
  amount: number;
};

export type ApplianceType = "stove" | "oven" | "fryer" | "microwave" | "blender";

export type Recipe = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  ingredients: IngredientAmount[];
  /** Allows some flexibility in ingredient amounts (e.g., 2-3 apples) */
  flexibleAmounts?: boolean;
  /** Required appliance to cook this recipe */
  requiredAppliance?: ApplianceType;
};

export type CookedDish = {
  recipeId: string | null;
  name: string;
  emoji: string;
  description: string;
  quality: "perfect" | "good" | "mystery";
};

/**
 * All defined recipes in the game
 */
export const RECIPES: Recipe[] = [
  // Fruit dishes
  {
    id: "fruit_salad",
    name: "Fruit Salad",
    emoji: "🥗",
    description: "A colorful mix of fresh fruits",
    ingredients: [
      { ingredientId: "apple", amount: 2 },
      { ingredientId: "grape", amount: 2 },
      { ingredientId: "orange", amount: 1 },
    ],
    flexibleAmounts: true,
  },
  {
    id: "berry_parfait",
    name: "Berry Parfait",
    emoji: "🍨",
    description: "Sweet berries with cream",
    ingredients: [
      { ingredientId: "strawberry", amount: 3 },
      { ingredientId: "milk", amount: 1 },
    ],
    flexibleAmounts: true,
  },
  {
    id: "fruit_smoothie",
    name: "Fruit Smoothie",
    emoji: "🥤",
    description: "Blended tropical goodness",
    ingredients: [
      { ingredientId: "banana", amount: 2 },
      { ingredientId: "strawberry", amount: 2 },
      { ingredientId: "milk", amount: 1 },
    ],
    flexibleAmounts: true,
    requiredAppliance: "blender",
  },
  
  // Protein dishes
  {
    id: "fried_chicken",
    name: "Fried Chicken",
    emoji: "🍗",
    description: "Crispy golden fried chicken",
    ingredients: [
      { ingredientId: "chicken", amount: 1 },
      { ingredientId: "egg", amount: 1 },
      { ingredientId: "flour", amount: 1 },
    ],
    requiredAppliance: "fryer",
  },
  {
    id: "scrambled_eggs",
    name: "Scrambled Eggs",
    emoji: "🍳",
    description: "Fluffy scrambled eggs",
    ingredients: [
      { ingredientId: "egg", amount: 2 },
      { ingredientId: "butter", amount: 1 },
    ],
    requiredAppliance: "stove",
  },
  {
    id: "bacon_eggs",
    name: "Bacon & Eggs",
    emoji: "🥓",
    description: "Classic breakfast combo",
    ingredients: [
      { ingredientId: "bacon", amount: 2 },
      { ingredientId: "egg", amount: 2 },
    ],
    requiredAppliance: "stove",
  },
  {
    id: "grilled_fish",
    name: "Grilled Fish",
    emoji: "🐟",
    description: "Perfectly grilled fish with herbs",
    ingredients: [
      { ingredientId: "fish", amount: 1 },
      { ingredientId: "garlic", amount: 1 },
      { ingredientId: "butter", amount: 1 },
    ],
    requiredAppliance: "stove",
  },
  {
    id: "shrimp_pasta",
    name: "Shrimp Pasta",
    emoji: "🍤",
    description: "Pasta with succulent shrimp",
    ingredients: [
      { ingredientId: "shrimp", amount: 2 },
      { ingredientId: "pasta", amount: 1 },
      { ingredientId: "garlic", amount: 1 },
      { ingredientId: "tomato", amount: 1 },
    ],
    requiredAppliance: "stove",
  },
  
  // Vegetable dishes
  {
    id: "vegetable_stir_fry",
    name: "Vegetable Stir Fry",
    emoji: "🥘",
    description: "Colorful mixed vegetables",
    ingredients: [
      { ingredientId: "broccoli", amount: 1 },
      { ingredientId: "carrot", amount: 2 },
      { ingredientId: "onion", amount: 1 },
      { ingredientId: "garlic", amount: 1 },
    ],
    requiredAppliance: "stove",
  },
  {
    id: "tomato_soup",
    name: "Tomato Soup",
    emoji: "🍜",
    description: "Warm and comforting tomato soup",
    ingredients: [
      { ingredientId: "tomato", amount: 3 },
      { ingredientId: "onion", amount: 1 },
      { ingredientId: "garlic", amount: 1 },
      { ingredientId: "milk", amount: 1 },
    ],
    requiredAppliance: "stove",
  },
  {
    id: "mashed_potatoes",
    name: "Mashed Potatoes",
    emoji: "🥔",
    description: "Creamy mashed potatoes",
    ingredients: [
      { ingredientId: "potato", amount: 3 },
      { ingredientId: "butter", amount: 1 },
      { ingredientId: "milk", amount: 1 },
    ],
    requiredAppliance: "stove",
  },
  
  // Grain-based dishes
  {
    id: "cheese_sandwich",
    name: "Grilled Cheese",
    emoji: "🥪",
    description: "Melted cheese between toasted bread",
    ingredients: [
      { ingredientId: "bread", amount: 2 },
      { ingredientId: "cheese", amount: 1 },
      { ingredientId: "butter", amount: 1 },
    ],
  },
  {
    id: "fried_rice",
    name: "Fried Rice",
    emoji: "🍚",
    description: "Savory fried rice with vegetables",
    ingredients: [
      { ingredientId: "rice", amount: 1 },
      { ingredientId: "egg", amount: 1 },
      { ingredientId: "carrot", amount: 1 },
      { ingredientId: "onion", amount: 1 },
    ],
  },
  {
    id: "spaghetti",
    name: "Spaghetti",
    emoji: "🍝",
    description: "Classic pasta with tomato sauce",
    ingredients: [
      { ingredientId: "pasta", amount: 1 },
      { ingredientId: "tomato", amount: 2 },
      { ingredientId: "garlic", amount: 1 },
      { ingredientId: "onion", amount: 1 },
    ],
  },
  
  // Simple combinations
  {
    id: "buttered_toast",
    name: "Buttered Toast",
    emoji: "🍞",
    description: "Simple and satisfying",
    ingredients: [
      { ingredientId: "bread", amount: 1 },
      { ingredientId: "butter", amount: 1 },
    ],
  },
];

/**
 * Match ingredients to a recipe
 * Returns the best matching recipe or null for mystery dish
 */
export function matchRecipe(selectedIngredients: IngredientAmount[]): Recipe | null {
  for (const recipe of RECIPES) {
    if (isRecipeMatch(recipe, selectedIngredients)) {
      return recipe;
    }
  }
  return null;
}

/**
 * Check if selected ingredients match a recipe
 */
function isRecipeMatch(recipe: Recipe, selected: IngredientAmount[]): boolean {
  // Must have same number of unique ingredients
  if (recipe.ingredients.length !== selected.length) {
    return false;
  }
  
  // Check each recipe ingredient
  for (const recipeIng of recipe.ingredients) {
    const selectedIng = selected.find((s) => s.ingredientId === recipeIng.ingredientId);
    
    if (!selectedIng) {
      return false; // Missing required ingredient
    }
    
    if (recipe.flexibleAmounts) {
      // Allow ±1 flexibility for flexible recipes
      const diff = Math.abs(selectedIng.amount - recipeIng.amount);
      if (diff > 1) {
        return false;
      }
    } else {
      // Exact match required for non-flexible recipes
      if (selectedIng.amount !== recipeIng.amount) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Create a cooked dish result from ingredients
 */
export function createDish(selectedIngredients: IngredientAmount[]): CookedDish {
  const recipe = matchRecipe(selectedIngredients);

  if (recipe) {
    // Known recipe - good or perfect quality based on exact match
    const isExactMatch = recipe.ingredients.every((recipeIng) => {
      const selected = selectedIngredients.find(
        (s) => s.ingredientId === recipeIng.ingredientId,
      );
      return selected && selected.amount === recipeIng.amount;
    });

    // Prefer DevTools dish catalog overrides (name / emoji).
    let name = recipe.name;
    let emoji = recipe.emoji;
    let description = recipe.description;
    try {
      // Lazy require avoids circular imports with catalogExtras ↔ recipes.
      const { dishForRecipe } = require("./catalogExtras") as {
        dishForRecipe: (
          id: string | null,
        ) => {
          name: string;
          emoji: string;
          description: string;
        } | null;
      };
      const override = dishForRecipe(recipe.id);
      if (override) {
        name = override.name || name;
        emoji = override.emoji || emoji;
        description = override.description || description;
      }
    } catch {
      // ignore
    }

    return {
      recipeId: recipe.id,
      name,
      emoji,
      description,
      quality: isExactMatch ? "perfect" : "good",
    };
  }
  
  // Unknown combination - mystery dish
  const mysteryNames = [
    "Mystery Dish",
    "Whatever This Is",
    "Experimental Cuisine",
    "Surprise Meal",
    "Creative Fusion",
    "Questionable Dish",
  ];
  
  const mysteryDescriptions = [
    "It's... something?",
    "Not sure what happened here",
    "An interesting experiment",
    "Tastes better than it looks",
    "Definitely edible... probably",
    "A culinary adventure",
  ];
  
  const randomName = mysteryNames[Math.floor(Math.random() * mysteryNames.length)] ?? "Mystery Dish";
  const randomDesc = mysteryDescriptions[Math.floor(Math.random() * mysteryDescriptions.length)] ?? "Not sure what happened here";
  
  return {
    recipeId: null,
    name: randomName,
    emoji: "🤔",
    description: randomDesc,
    quality: "mystery",
  };
}

/**
 * Get the required appliance for selected ingredients (by matching to recipe)
 */
export function getRequiredAppliance(selectedIngredients: IngredientAmount[]): ApplianceType | null {
  const recipe = matchRecipe(selectedIngredients);
  return recipe?.requiredAppliance ?? null;
}

/**
 * Get recipe by ID
 */
export function getRecipe(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}
