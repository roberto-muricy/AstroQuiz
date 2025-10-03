/**
 * Assets Index
 * Centraliza todos os assets do app
 */

// ===== IMAGES =====
export const Images = {
  // Tab bar icons
  home: require('./images/home.png'),
  quiz: require('./images/quiz.png'),
  stats: require('./images/stats.png'),
  profile: require('./images/profile.png'),
  
  // Misc
  target: require('./images/target.png'),
  play: require('./images/play.png'),
  achievements: require('./images/achivements.png'),
};

// ===== ICONS (SVG) =====
// Para usar SVG no React Native, precisa do react-native-svg
// Por enquanto, vamos usar as versões PNG
export const Icons = {
  home: require('./images/home.png'),
  quiz: require('./images/quiz.png'),
  stats: require('./images/stats.png'),
  profile: require('./images/profile.png'),
  target: require('./images/target.png'),
};

// ===== EMOJIS =====
// Emojis para usar como fallback
export const Emojis = {
  home: '🏠',
  quiz: '🎯',
  stats: '📊',
  profile: '👤',
  target: '🎯',
  rocket: '🚀',
  fire: '🔥',
  star: '⭐',
  trophy: '🏆',
  play: '▶️',
};

export default {
  Images,
  Icons,
  Emojis,
};


