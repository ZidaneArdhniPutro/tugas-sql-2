const API_URL = "https://dummyjson.com/recipes?limit=50";
const STORAGE_KEY = "recipe-finder-favorites";

const recipeGrid = document.querySelector("#recipe-grid");
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#search-input");
const cuisineFilter = document.querySelector("#cuisine-filter");
const difficultyFilter = document.querySelector("#difficulty-filter");
const favoriteButton = document.querySelector("#favorite-button");
const favoriteCount = document.querySelector("#favorite-count");
const sectionTitle = document.querySelector("#section-title");
const recipeCount = document.querySelector("#recipe-count");
const resetFilterButton = document.querySelector("#reset-filter-button");
const loadingState = document.querySelector("#loading-state");
const errorState = document.querySelector("#error-state");
const emptyState = document.querySelector("#empty-state");
const recipeDialog = document.querySelector("#recipe-dialog");
const dialogContent = document.querySelector("#dialog-content");
const closeDialogButton = document.querySelector("#close-dialog");

let recipes = [];
let showingFavorites = false;
let favoriteIds = loadFavoriteIds();

function loadFavoriteIds() {
  try {
    const savedIds = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return new Set(savedIds.map(Number));
  } catch {
    return new Set();
  }
}

function saveFavoriteIds() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favoriteIds]));
  } catch {
    // The app remains usable when browser storage is unavailable.
  }
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showState(stateToShow) {
  loadingState.hidden = stateToShow === "loading" ? false : true;
  errorState.hidden = stateToShow === "error" ? false : true;
  emptyState.hidden = stateToShow === "empty" ? false : true;
  recipeGrid.hidden = stateToShow !== "recipes";
}

function populateFilters() {
  const cuisines = [...new Set(recipes.map((recipe) => recipe.cuisine))].sort();
  const difficulties = [...new Set(recipes.map((recipe) => recipe.difficulty))].sort();

  cuisines.forEach((cuisine) => {
    cuisineFilter.append(createElement("option", "", cuisine));
    cuisineFilter.lastElementChild.value = cuisine;
  });

  difficulties.forEach((difficulty) => {
    if ([...difficultyFilter.options].some((option) => option.value === difficulty)) return;
    const option = createElement("option", "", difficulty);
    option.value = difficulty;
    difficultyFilter.append(option);
  });
}

function getVisibleRecipes() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedCuisine = cuisineFilter.value;
  const selectedDifficulty = difficultyFilter.value;

  return recipes.filter((recipe) => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm);
    const matchesCuisine = !selectedCuisine || recipe.cuisine === selectedCuisine;
    const matchesDifficulty = !selectedDifficulty || recipe.difficulty === selectedDifficulty;
    const matchesFavorites = !showingFavorites || favoriteIds.has(recipe.id);
    return matchesSearch && matchesCuisine && matchesDifficulty && matchesFavorites;
  });
}

function makeRecipeCard(recipe) {
  const card = createElement("article", "recipe-card");
  const image = createElement("img", "recipe-image");
  image.src = recipe.image;
  image.alt = recipe.name;
  image.loading = "lazy";

  const body = createElement("div", "recipe-body");
  body.append(createElement("span", "recipe-cuisine", recipe.cuisine));
  body.append(createElement("h3", "recipe-title", recipe.name));

  const meta = createElement("div", "recipe-meta");
  meta.append(createElement("span", "", `${recipe.difficulty} · ${recipe.prepTimeMinutes + recipe.cookTimeMinutes} min`));
  meta.append(createElement("span", "", `⭐ ${recipe.rating}`));
  body.append(meta);

  const actions = createElement("div", "recipe-actions");
  const detailButton = createElement("button", "detail-button", "View recipe");
  detailButton.type = "button";
  detailButton.dataset.action = "details";
  detailButton.dataset.id = recipe.id;

  const likeButton = createElement("button", "like-button", favoriteIds.has(recipe.id) ? "♥" : "♡");
  likeButton.type = "button";
  likeButton.dataset.action = "favorite";
  likeButton.dataset.id = recipe.id;
  likeButton.setAttribute("aria-label", favoriteIds.has(recipe.id) ? "Remove from favorites" : "Add to favorites");
  likeButton.setAttribute("aria-pressed", favoriteIds.has(recipe.id));

  actions.append(detailButton, likeButton);
  body.append(actions);
  card.append(image, body);
  return card;
}

function renderRecipes() {
  const visibleRecipes = getVisibleRecipes();
  recipeGrid.replaceChildren(...visibleRecipes.map(makeRecipeCard));
  recipeCount.textContent = `${visibleRecipes.length} ${visibleRecipes.length === 1 ? "recipe" : "recipes"}`;
  favoriteCount.textContent = favoriteIds.size;
  sectionTitle.textContent = showingFavorites ? "Favorite Recipes" : "Explore Recipes";
  favoriteButton.setAttribute("aria-pressed", showingFavorites);

  const hasFilters = searchInput.value.trim() || cuisineFilter.value || difficultyFilter.value || showingFavorites;
  resetFilterButton.hidden = !hasFilters;
  showState(visibleRecipes.length ? "recipes" : "empty");
}

function addRecipeDetails(recipe) {
  dialogContent.replaceChildren();

  const image = createElement("img", "dialog-image");
  image.src = recipe.image;
  image.alt = recipe.name;

  const body = createElement("div", "dialog-body");
  body.append(createElement("span", "recipe-cuisine", recipe.cuisine));
  body.append(createElement("h2", "", recipe.name));

  const meta = createElement("div", "dialog-meta");
  [
    `${recipe.difficulty}`,
    `${recipe.prepTimeMinutes} min prep`,
    `${recipe.cookTimeMinutes} min cook`,
    `${recipe.servings} servings`,
    `${recipe.caloriesPerServing} kcal/serving`,
    `⭐ ${recipe.rating} (${recipe.reviewCount} reviews)`,
  ].forEach((item) => meta.append(createElement("span", "", item)));
  body.append(meta);

  body.append(createElement("h3", "", "Ingredients"));
  const ingredients = createElement("ul", "ingredients");
  recipe.ingredients.forEach((ingredient) => ingredients.append(createElement("li", "", ingredient)));
  body.append(ingredients);

  body.append(createElement("h3", "", "Instructions"));
  const instructions = createElement("div", "instructions");
  recipe.instructions.forEach((instruction, index) => {
    instructions.append(createElement("p", "", `${index + 1}. ${instruction}`));
  });
  body.append(instructions);

  dialogContent.append(image, body);
  recipeDialog.showModal();
}

function toggleFavorite(recipeId) {
  if (favoriteIds.has(recipeId)) {
    favoriteIds.delete(recipeId);
  } else {
    favoriteIds.add(recipeId);
  }
  saveFavoriteIds();
  renderRecipes();
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  renderRecipes();
});

searchInput.addEventListener("input", renderRecipes);
cuisineFilter.addEventListener("change", renderRecipes);
difficultyFilter.addEventListener("change", renderRecipes);

favoriteButton.addEventListener("click", () => {
  showingFavorites = !showingFavorites;
  renderRecipes();
});

resetFilterButton.addEventListener("click", () => {
  searchInput.value = "";
  cuisineFilter.value = "";
  difficultyFilter.value = "";
  showingFavorites = false;
  renderRecipes();
});

recipeGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const recipe = recipes.find((item) => item.id === Number(button.dataset.id));
  if (!recipe) return;

  if (button.dataset.action === "favorite") {
    toggleFavorite(recipe.id);
  } else if (button.dataset.action === "details") {
    addRecipeDetails(recipe);
  }
});

closeDialogButton.addEventListener("click", () => recipeDialog.close());
recipeDialog.addEventListener("click", (event) => {
  if (event.target === recipeDialog) recipeDialog.close();
});

async function loadRecipes() {
  showState("loading");

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);

    const data = await response.json();
    recipes = data.recipes;
    populateFilters();
    renderRecipes();
  } catch (error) {
    console.error("Could not load recipes:", error);
    showState("error");
  }
}

loadRecipes();
