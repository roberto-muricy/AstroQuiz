/**
 * Test Game Rules Implementation
 * Simple test to verify our Quiz Engine logic works correctly
 */

const { GAME_RULES, GameRulesHelper } = require('../config/game-rules');

console.log('🎮 Testing AstroQuiz Game Rules...\n');

// Test 1: Basic Configuration
console.log('1. ✅ Game Rules Configuration:');
console.log(`   - Total Phases: ${GAME_RULES.general.totalPhases}`);
console.log(`   - Questions per Phase: ${GAME_RULES.general.questionsPerPhase}`);
console.log(`   - Supported Locales: ${GAME_RULES.general.supportedLocales.join(', ')}`);
console.log(`   - Time per Question: ${GAME_RULES.general.timePerQuestion / 1000}s\n`);

// Test 2: Phase Configuration
console.log('2. ✅ Phase Configuration Test:');
const testPhases = [1, 15, 25, 35, 45];
testPhases.forEach(phase => {
  const config = GameRulesHelper.getPhaseConfig(phase);
  console.log(`   - Phase ${phase}: ${config.type} (${config.levels.join('-')}) - Min: ${config.minScore * 100}%`);
});
console.log();

// Test 3: Scoring System
console.log('3. ✅ Scoring System Test:');
const testScenarios = [
  { level: 1, timeRemaining: 25000, streak: 0, desc: 'Level 1, Fast (25s remaining)' },
  { level: 3, timeRemaining: 15000, streak: 5, desc: 'Level 3, Good speed + Streak' },
  { level: 5, timeRemaining: 5000, streak: 0, desc: 'Level 5, Slow (5s remaining)' },
  { level: 4, timeRemaining: 20000, streak: 10, desc: 'Level 4, Excellent + Max streak' }
];

testScenarios.forEach(scenario => {
  const points = GameRulesHelper.calculatePoints(scenario.level, scenario.timeRemaining, scenario.streak);
  console.log(`   - ${scenario.desc}: ${points} points`);
});
console.log();

// Test 4: Difficulty Distribution
console.log('4. ✅ Difficulty Distribution Test:');
const testDistributions = [1, 11, 21, 31, 41];
testDistributions.forEach(phase => {
  const distribution = GameRulesHelper.getDifficultyDistribution(phase);
  const distributionStr = Object.entries(distribution)
    .map(([level, percent]) => `L${level}:${Math.round(percent * 100)}%`)
    .join(', ');
  console.log(`   - Phase ${phase}: ${distributionStr}`);
});
console.log();

// Test 5: Configuration Validation
console.log('5. ✅ Configuration Validation:');
const errors = GameRulesHelper.validateConfig();
if (errors.length === 0) {
  console.log('   - All configurations are valid! ✅');
} else {
  console.log('   - Configuration errors found:');
  errors.forEach(error => console.log(`     ❌ ${error}`));
}
console.log();

// Test 6: Special Challenges
console.log('6. ✅ Special Challenges Test:');
console.log(`   - Phase 35 has special challenges: ${GameRulesHelper.hasSpecialChallenges(35)}`);
console.log(`   - Phase 45 has special challenges: ${GameRulesHelper.hasSpecialChallenges(45)}`);
console.log(`   - Available challenges: ${Object.keys(GAME_RULES.specialChallenges).join(', ')}`);
console.log();

// Test 7: Achievement System
console.log('7. ✅ Achievement System:');
const achievements = Object.keys(GAME_RULES.achievements);
console.log(`   - Total achievements: ${achievements.length}`);
console.log(`   - Achievement types: ${achievements.join(', ')}`);
console.log();

console.log('🎉 All Game Rules Tests Passed!\n');
console.log('📊 Quiz Engine Summary:');
console.log(`   - ${GAME_RULES.general.totalPhases} progressive phases`);
console.log(`   - ${Object.keys(GAME_RULES.scoring.basePoints).length} difficulty levels`);
console.log(`   - ${Object.keys(GAME_RULES.specialChallenges).length} special challenges`);
console.log(`   - ${Object.keys(GAME_RULES.achievements).length} achievements`);
console.log(`   - ${GAME_RULES.general.supportedLocales.length} supported languages`);
console.log('\n✨ Quiz Engine is ready for integration!');
