const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

class RecipeImportService {
  constructor() {
    this.timeout = 30000; // 30 seconds
    this.maxSize = 1048576; // 1MB
    
    // Common recipe schema selectors
    this.selectors = {
      // JSON-LD structured data
      jsonLd: 'script[type="application/ld+json"]',
      
      // Common meta properties
      title: [
        'h1.recipe-title',
        'h1.entry-title', 
        '.recipe-header h1',
        '.recipe-title',
        'h1',
        '[property="og:title"]',
        'meta[property="og:title"]'
      ].join(', '),
      
      description: [
        '.recipe-description',
        '.recipe-summary',
        '.entry-summary',
        'meta[name="description"]',
        'meta[property="og:description"]'
      ].join(', '),
      
      ingredients: [
        '.recipe-ingredient',
        '.ingredients li',
        '.recipe-ingredients li',
        '[itemprop="recipeIngredient"]',
        '.ingredient'
      ].join(', '),
      
      instructions: [
        '.recipe-instruction',
        '.instructions li',
        '.recipe-instructions li', 
        '.recipe-method li',
        '[itemprop="recipeInstructions"]',
        '.instruction'
      ].join(', '),
      
      cookingTime: [
        '[itemprop="cookTime"]',
        '.recipe-cook-time',
        '.cook-time'
      ].join(', '),
      
      prepTime: [
        '[itemprop="prepTime"]', 
        '.recipe-prep-time',
        '.prep-time'
      ].join(', '),
      
      servings: [
        '[itemprop="recipeYield"]',
        '.recipe-servings',
        '.servings',
        '.yield'
      ].join(', '),
      
      image: [
        'meta[property="og:image"]',
        '.recipe-image img',
        '.recipe-photo img',
        'img.recipe'
      ].join(', ')
    };
  }

  async importFromUrl(url) {
    try {
      // Validate URL
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid URL protocol. Only HTTP and HTTPS are supported.');
      }

      // Fetch the webpage
      const response = await axios.get(url, {
        timeout: this.timeout,
        maxContentLength: this.maxSize,
        headers: {
          'User-Agent': 'ProChef Recipe Importer 1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // First, try to extract from JSON-LD structured data
      let recipe = this.extractFromJsonLd($);
      
      // If no JSON-LD data found, try microdata and standard selectors
      if (!recipe || !recipe.title) {
        recipe = this.extractFromHtml($);
      }

      // Enhance with source URL
      recipe.sourceUrl = url;
      
      // Clean and validate the extracted data
      return this.cleanRecipeData(recipe);

    } catch (error) {
      console.error('Recipe import error:', error);
      
      if (error.code === 'ENOTFOUND') {
        throw new Error('Website not found. Please check the URL.');
      } else if (error.code === 'TIMEOUT') {
        throw new Error('Request timeout. The website took too long to respond.');
      } else if (error.response && error.response.status === 404) {
        throw new Error('Recipe page not found (404).');
      } else if (error.response && error.response.status >= 400) {
        throw new Error(`Website returned error: ${error.response.status}`);
      }
      
      throw new Error(`Failed to import recipe: ${error.message}`);
    }
  }

  extractFromJsonLd($) {
    const scripts = $(this.selectors.jsonLd);
    
    for (let i = 0; i < scripts.length; i++) {
      try {
        const jsonData = JSON.parse($(scripts[i]).html());
        const recipes = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        for (const data of recipes) {
          if (data['@type'] === 'Recipe' || 
              (Array.isArray(data['@type']) && data['@type'].includes('Recipe'))) {
            
            return {
              title: data.name,
              description: data.description,
              ingredients: this.extractIngredients(data.recipeIngredient || []),
              instructions: this.extractInstructions(data.recipeInstructions || []),
              cookingTime: this.parseTime(data.cookTime),
              prepTime: this.parseTime(data.prepTime),
              servings: this.parseServings(data.recipeYield),
              difficulty: this.mapDifficulty(data.difficulty),
              imageUrl: this.extractImageUrl(data.image)
            };
          }
        }
      } catch (e) {
        // Skip invalid JSON-LD blocks
        continue;
      }
    }
    
    return null;
  }

  extractFromHtml($) {
    // Extract title
    const title = this.getTextContent($, this.selectors.title) ||
                  $('title').text().replace(/\s*\|\s*.*$/, '').trim();

    // Extract description  
    const description = this.getTextContent($, this.selectors.description) ||
                       this.getAttrContent($, 'meta[name="description"]', 'content') ||
                       this.getAttrContent($, 'meta[property="og:description"]', 'content');

    // Extract ingredients
    const ingredients = this.extractMultipleTexts($, this.selectors.ingredients);

    // Extract instructions
    const instructions = this.extractMultipleTexts($, this.selectors.instructions);

    // Extract times and servings
    const cookingTime = this.parseTime(this.getTextContent($, this.selectors.cookingTime));
    const prepTime = this.parseTime(this.getTextContent($, this.selectors.prepTime));  
    const servings = this.parseServings(this.getTextContent($, this.selectors.servings));

    // Extract image
    const imageUrl = this.getAttrContent($, this.selectors.image, 'content') ||
                    this.getAttrContent($, this.selectors.image, 'src');

    return {
      title,
      description,
      ingredients: ingredients.join('\n'),
      instructions: instructions.join('\n'), 
      cookingTime,
      prepTime,
      servings,
      imageUrl
    };
  }

  getTextContent($, selector) {
    const element = $(selector).first();
    return element.length ? element.text().trim() : '';
  }

  getAttrContent($, selector, attr) {
    const element = $(selector).first();
    return element.length ? element.attr(attr) : '';
  }

  extractMultipleTexts($, selector) {
    const texts = [];
    $(selector).each((i, el) => {
      const text = $(el).text().trim();
      if (text && !texts.includes(text)) {
        texts.push(text);
      }
    });
    return texts;
  }

  extractIngredients(ingredients) {
    if (Array.isArray(ingredients)) {
      return ingredients.map(ing => 
        typeof ing === 'string' ? ing : (ing.text || ing.name || '')
      ).join('\n');
    }
    return typeof ingredients === 'string' ? ingredients : '';
  }

  extractInstructions(instructions) {
    if (Array.isArray(instructions)) {
      return instructions.map((inst, index) => {
        let text = '';
        if (typeof inst === 'string') {
          text = inst;
        } else if (inst.text) {
          text = inst.text;
        } else if (inst.name) {
          text = inst.name;
        }
        return text ? `${index + 1}. ${text}` : '';
      }).filter(Boolean).join('\n');
    }
    return typeof instructions === 'string' ? instructions : '';
  }

  parseTime(timeString) {
    if (!timeString) return null;
    
    // Handle ISO 8601 duration format (PT15M, PT1H30M)
    const iso8601Match = timeString.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (iso8601Match) {
      const hours = parseInt(iso8601Match[1] || '0');
      const minutes = parseInt(iso8601Match[2] || '0');
      return hours * 60 + minutes;
    }
    
    // Handle common time formats
    const timeMatch = timeString.match(/(\d+)\s*(hour|hr|h|minute|min|m)/gi);
    if (timeMatch) {
      let totalMinutes = 0;
      timeMatch.forEach(match => {
        const [, num, unit] = match.match(/(\d+)\s*(hour|hr|h|minute|min|m)/i);
        const value = parseInt(num);
        if (unit.toLowerCase().startsWith('h')) {
          totalMinutes += value * 60;
        } else {
          totalMinutes += value;
        }
      });
      return totalMinutes;
    }
    
    // Extract just numbers as minutes
    const numberMatch = timeString.match(/(\d+)/);
    return numberMatch ? parseInt(numberMatch[1]) : null;
  }

  parseServings(servingsString) {
    if (!servingsString) return null;
    
    const match = servingsString.toString().match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  mapDifficulty(difficulty) {
    if (!difficulty) return 'medium';
    
    const diffLower = difficulty.toLowerCase();
    if (diffLower.includes('easy') || diffLower.includes('beginner')) return 'easy';
    if (diffLower.includes('hard') || diffLower.includes('difficult') || diffLower.includes('expert')) return 'hard';
    return 'medium';
  }

  extractImageUrl(image) {
    if (!image) return null;
    
    if (typeof image === 'string') return image;
    if (Array.isArray(image)) return image[0];
    if (image.url) return image.url;
    
    return null;
  }

  cleanRecipeData(recipe) {
    // Clean and validate the extracted data
    const cleaned = {
      title: this.cleanText(recipe.title) || 'Imported Recipe',
      description: this.cleanText(recipe.description) || '',
      ingredients: this.cleanText(recipe.ingredients) || '',
      instructions: this.cleanText(recipe.instructions) || '',
      cookingTime: recipe.cookingTime || null,
      prepTime: recipe.prepTime || null, 
      servings: recipe.servings || null,
      difficulty: recipe.difficulty || 'medium',
      sourceUrl: recipe.sourceUrl || '',
      imageUrl: recipe.imageUrl || null
    };

    // Ensure we have at least a title
    if (!cleaned.title || cleaned.title.length < 2) {
      throw new Error('Could not extract recipe title from the page');
    }

    return cleaned;
  }

  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ')  // Multiple spaces to single space
      .replace(/\n\s*\n/g, '\n')  // Multiple newlines to single newline  
      .trim();
  }

  // Get supported domains (for UI hints)
  getSupportedDomains() {
    return [
      'allrecipes.com',
      'foodnetwork.com', 
      'epicurious.com',
      'bonappetit.com',
      'seriouseats.com',
      'tasteofhome.com',
      'delish.com',
      'food.com',
      'myrecipes.com',
      'cookinglight.com'
    ];
  }
}

module.exports = RecipeImportService;