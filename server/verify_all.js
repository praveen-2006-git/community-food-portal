const { execSync } = require('child_process');
const path = require('path');

process.env.NODE_ENV = 'test';

console.log('================================================================');
console.log('       COMMUNITY FOOD PORTAL - FULL SUITE AUTOMATED TESTING     ');
console.log('================================================================\n');

const testScripts = [
  'verify_schemas.js',
  'verify_seed.js',
  'verify_auth.js',
  'verify_ingredients.js',
  'verify_admin.js',
  'verify_kitchen.js',
  'verify_security_fixes.js',
  'verify_map.js',
  'verify_stats.js',
  'verify_malpractice.js',
  'verify_pickup.js',
  'verify_issues.js',
  'verify_deactivation.js',
  'verify_robustness.js',
  'verify_geo_hook.js',
  'verify_geo_migration.js',
  'verify_pagination.js',
  'verify_cors.js',
  'verify_needs_and_inventory.js',
  'verify_pantry_fefo.js',
  'verify_server_routing.js',
  'verify_audit_log_and_rate_limit.js',
  'verify_corrections.js'
];

let allPassed = true;

testScripts.forEach((script) => {
  console.log(`\n----------------------------------------------------------------`);
  console.log(`RUNNING TEST SUITE: ${script}`);
  console.log(`----------------------------------------------------------------`);
  try {
    execSync(`node ${script}`, { stdio: 'inherit', cwd: __dirname });
    console.log(`\nRESULT: ${script} PASSED ✅`);
  } catch (error) {
    console.error(`\nRESULT: ${script} FAILED ❌`);
    allPassed = false;
  }
});

console.log('\n================================================================');
if (allPassed) {
  console.log('🎉 ALL AUTOMATED TEST SUITES COMPLETED AND PASSED SUCCESSFULLY! 🎉');
} else {
  console.error('❌ SOME TEST SUITES ENCOUNTERED ERRORS. PLEASE CHECK LOGS ABOVE. ❌');
  process.exit(1);
}
console.log('================================================================');
process.exit(0);
