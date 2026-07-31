export type GroceryCategory = "fruit" | "vegetable" | "protein" | "grain" | "dairy" | "spice";

export type GroceryItem = {
  id: string;
  name: string;
  category: GroceryCategory;
  emoji: string;
  price: number;
  description: string;
};

export const GROCERY_ITEMS: GroceryItem[] = [
  // Fruits
  {
    id: "apple",
    name: "Apple",
    category: "fruit",
    emoji: "🍎",
    price: 3,
    description: "Crisp and sweet red apple",
  },
  {
    id: "banana",
    name: "Banana",
    category: "fruit",
    emoji: "🍌",
    price: 2,
    description: "Ripe yellow banana",
  },
  {
    id: "grape",
    name: "Grapes",
    category: "fruit",
    emoji: "🍇",
    price: 4,
    description: "Bunch of juicy grapes",
  },
  {
    id: "orange",
    name: "Orange",
    category: "fruit",
    emoji: "🍊",
    price: 3,
    description: "Fresh citrus orange",
  },
  {
    id: "strawberry",
    name: "Strawberry",
    category: "fruit",
    emoji: "🍓",
    price: 5,
    description: "Sweet red strawberry",
  },
  {
    id: "watermelon",
    name: "Watermelon",
    category: "fruit",
    emoji: "🍉",
    price: 8,
    description: "Juicy watermelon slice",
  },
  
  // Vegetables
  {
    id: "tomato",
    name: "Tomato",
    category: "vegetable",
    emoji: "🍅",
    price: 3,
    description: "Fresh red tomato",
  },
  {
    id: "carrot",
    name: "Carrot",
    category: "vegetable",
    emoji: "🥕",
    price: 2,
    description: "Crunchy orange carrot",
  },
  {
    id: "broccoli",
    name: "Broccoli",
    category: "vegetable",
    emoji: "🥦",
    price: 4,
    description: "Green broccoli floret",
  },
  {
    id: "potato",
    name: "Potato",
    category: "vegetable",
    emoji: "🥔",
    price: 2,
    description: "Versatile potato",
  },
  {
    id: "onion",
    name: "Onion",
    category: "vegetable",
    emoji: "🧅",
    price: 2,
    description: "Aromatic onion",
  },
  {
    id: "garlic",
    name: "Garlic",
    category: "spice",
    emoji: "🧄",
    price: 3,
    description: "Pungent garlic clove",
  },
  
  // Proteins
  {
    id: "chicken",
    name: "Chicken",
    category: "protein",
    emoji: "🍗",
    price: 10,
    description: "Fresh chicken meat",
  },
  {
    id: "egg",
    name: "Egg",
    category: "protein",
    emoji: "🥚",
    price: 4,
    description: "Farm fresh egg",
  },
  {
    id: "bacon",
    name: "Bacon",
    category: "protein",
    emoji: "🥓",
    price: 8,
    description: "Crispy bacon strips",
  },
  {
    id: "fish",
    name: "Fish",
    category: "protein",
    emoji: "🐟",
    price: 12,
    description: "Fresh fish fillet",
  },
  {
    id: "shrimp",
    name: "Shrimp",
    category: "protein",
    emoji: "🦐",
    price: 15,
    description: "Plump shrimp",
  },
  
  // Grains & Staples
  {
    id: "bread",
    name: "Bread",
    category: "grain",
    emoji: "🍞",
    price: 5,
    description: "Fresh baked bread",
  },
  {
    id: "rice",
    name: "Rice",
    category: "grain",
    emoji: "🍚",
    price: 6,
    description: "White rice",
  },
  {
    id: "flour",
    name: "Flour",
    category: "grain",
    emoji: "🌾",
    price: 4,
    description: "All-purpose flour",
  },
  {
    id: "pasta",
    name: "Pasta",
    category: "grain",
    emoji: "🍝",
    price: 5,
    description: "Dried pasta",
  },
  
  // Dairy
  {
    id: "cheese",
    name: "Cheese",
    category: "dairy",
    emoji: "🧀",
    price: 7,
    description: "Aged cheese block",
  },
  {
    id: "milk",
    name: "Milk",
    category: "dairy",
    emoji: "🥛",
    price: 5,
    description: "Fresh milk",
  },
  {
    id: "butter",
    name: "Butter",
    category: "dairy",
    emoji: "🧈",
    price: 6,
    description: "Creamy butter",
  },
];

export const GROCERY_CATEGORIES: { id: GroceryCategory; label: string; emoji: string }[] = [
  { id: "fruit", label: "Fruits", emoji: "🍎" },
  { id: "vegetable", label: "Vegetables", emoji: "🥕" },
  { id: "protein", label: "Proteins", emoji: "🍗" },
  { id: "grain", label: "Grains", emoji: "🌾" },
  { id: "dairy", label: "Dairy", emoji: "🧀" },
  { id: "spice", label: "Spices", emoji: "🧄" },
];

export function getGroceryItem(id: string): GroceryItem | undefined {
  return GROCERY_ITEMS.find((item) => item.id === id);
}

export function getGroceryItemsByCategory(category: GroceryCategory): GroceryItem[] {
  return GROCERY_ITEMS.filter((item) => item.category === category);
}
