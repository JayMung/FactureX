/**
 * Capitalise la première lettre de chaque mot
 * Exemple: "jean mukendi" => "Jean Mukendi"
 */
export const capitalizeWords = (text: string): string => {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Capitalise uniquement la première lettre
 * Exemple: "jean mukendi" => "Jean mukendi"
 */
export const capitalizeFirst = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};
