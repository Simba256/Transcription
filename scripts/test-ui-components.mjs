/**
 * UI Component Validation Test
 * Validates that all Phase 4 UI components exist and are properly structured
 * Run with: node scripts/test-ui-components.mjs
 */

console.log('🎨 UI Component Validation Tests\n');
console.log('═'.repeat(60));

const results = [];

function logTest(name, status, message) {
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '○';
  const color = status === 'PASS' ? '\x1b[32m' : status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
  console.log(`${color}${icon}\x1b[0m ${name}`);
  if (message) console.log(`  ${message}`);
  results.push({ name, status, message });
}

async function runTests() {
  console.log('\n📦 Component Files Tests\n');

  const fs = await import('fs');
  const path = await import('path');
  const fileUrl = await import('url');

  const __dirname = path.dirname(fileUrl.fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(__dirname, '..');

  // Test 1: SubscriptionPlanSelector
  try {
    const filePath = path.join(projectRoot, 'src/components/billing/SubscriptionPlanSelector.tsx');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasProps = content.includes('SubscriptionPlanSelectorProps');
      const hasPlans = content.includes('SUBSCRIPTION_PLANS');
      const hasAI = content.includes('AI Transcription Plans');
      const hasHybrid = content.includes('Hybrid Transcription Plans');

      if (hasProps && hasPlans && hasAI && hasHybrid) {
        logTest('SubscriptionPlanSelector component', 'PASS', 'All required elements present');
      } else {
        logTest('SubscriptionPlanSelector component', 'FAIL', 'Missing required elements');
      }
    } else {
      logTest('SubscriptionPlanSelector component', 'FAIL', 'File not found');
    }
  } catch (error) {
    logTest('SubscriptionPlanSelector component', 'FAIL', error.message);
  }

  // Test 2: UsageMeter
  try {
    const filePath = path.join(projectRoot, 'src/components/billing/UsageMeter.tsx');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasProps = content.includes('UsageMeterProps');
      const hasProgress = content.includes('Progress');
      const hasStatusBadge = content.includes('StatusBadge');
      const hasOverage = content.includes('Over Limit');

      if (hasProps && hasProgress && hasStatusBadge && hasOverage) {
        logTest('UsageMeter component', 'PASS', 'All required elements present');
      } else {
        logTest('UsageMeter component', 'FAIL', 'Missing required elements');
      }
    } else {
      logTest('UsageMeter component', 'FAIL', 'File not found');
    }
  } catch (error) {
    logTest('UsageMeter component', 'FAIL', error.message);
  }

  // Test 3: SubscriptionStatus
  try {
    const filePath = path.join(projectRoot, 'src/components/billing/SubscriptionStatus.tsx');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasProps = content.includes('SubscriptionStatusProps');
      const hasStatusBadge = content.includes('StatusBadge');
      const hasTrial = content.includes('Free Trial');
      const hasCancel = content.includes('cancelAtPeriodEnd');

      if (hasProps && hasStatusBadge && hasTrial && hasCancel) {
        logTest('SubscriptionStatus component', 'PASS', 'All required elements present');
      } else {
        logTest('SubscriptionStatus component', 'FAIL', 'Missing required elements');
      }
    } else {
      logTest('SubscriptionStatus component', 'FAIL', 'File not found');
    }
  } catch (error) {
    logTest('SubscriptionStatus component', 'FAIL', error.message);
  }

  // Test 4: PaymentMethodManager
  try {
    const filePath = path.join(projectRoot, 'src/components/billing/PaymentMethodManager.tsx');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasProps = content.includes('PaymentMethodManagerProps');
      const hasPaymentMethod = content.includes('PaymentMethod');
      const hasBrandIcon = content.includes('getBrandIcon');
      const hasDefault = content.includes('Set Default');

      if (hasProps && hasPaymentMethod && hasBrandIcon && hasDefault) {
        logTest('PaymentMethodManager component', 'PASS', 'All required elements present');
      } else {
        logTest('PaymentMethodManager component', 'FAIL', 'Missing required elements');
      }
    } else {
      logTest('PaymentMethodManager component', 'FAIL', 'File not found');
    }
  } catch (error) {
    logTest('PaymentMethodManager component', 'FAIL', error.message);
  }

  // Test 5: Progress UI component
  try {
    const filePath = path.join(projectRoot, 'src/components/ui/progress.tsx');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasRadix = content.includes('@radix-ui/react-progress');
      const hasForwardRef = content.includes('forwardRef');
      const hasIndicator = content.includes('ProgressPrimitive.Indicator');

      if (hasRadix && hasForwardRef && hasIndicator) {
        logTest('Progress UI component', 'PASS', 'Radix UI properly integrated');
      } else {
        logTest('Progress UI component', 'FAIL', 'Missing required elements');
      }
    } else {
      logTest('Progress UI component', 'FAIL', 'File not found');
    }
  } catch (error) {
    logTest('Progress UI component', 'FAIL', error.message);
  }

  // Test 6: Tabs UI component
  try {
    const filePath = path.join(projectRoot, 'src/components/ui/tabs.tsx');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasRadix = content.includes('@radix-ui/react-tabs');
      const hasList = content.includes('TabsList');
      const hasTrigger = content.includes('TabsTrigger');
      const hasContent = content.includes('TabsContent');

      if (hasRadix && hasList && hasTrigger && hasContent) {
        logTest('Tabs UI component', 'PASS', 'All tab components exported');
      } else {
        logTest('Tabs UI component', 'FAIL', 'Missing required exports');
      }
    } else {
      logTest('Tabs UI component', 'FAIL', 'File not found');
    }
  } catch (error) {
    logTest('Tabs UI component', 'FAIL', error.message);
  }

  console.log('\n🔗 Integration Tests\n');

  // Test 7: Billing page integration
  try {
    const filePath = path.join(projectRoot, 'src/app/(protected)/billing/page.tsx');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasSubscriptionPlanSelector = content.includes('SubscriptionPlanSelector');
      const hasUsageMeter = content.includes('UsageMeter');
      const hasSubscriptionStatus = content.includes('SubscriptionStatus');
      const hasTabs = content.includes('Tabs');
      const hasTabsContent = content.includes('TabsContent');

      if (hasSubscriptionPlanSelector && hasUsageMeter && hasSubscriptionStatus && hasTabs && hasTabsContent) {
        logTest('Billing page integration', 'PASS', 'All components imported and used');
      } else {
        const missing = [];
        if (!hasSubscriptionPlanSelector) missing.push('SubscriptionPlanSelector');
        if (!hasUsageMeter) missing.push('UsageMeter');
        if (!hasSubscriptionStatus) missing.push('SubscriptionStatus');
        if (!hasTabs) missing.push('Tabs');
        logTest('Billing page integration', 'FAIL', `Missing: ${missing.join(', ')}`);
      }
    } else {
      logTest('Billing page integration', 'FAIL', 'File not found');
    }
  } catch (error) {
    logTest('Billing page integration', 'FAIL', error.message);
  }

  // Test 8: Subscription management functions
  try {
    const filePath = path.join(projectRoot, 'src/app/(protected)/billing/page.tsx');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasSelectPlan = content.includes('handleSelectPlan');
      const hasManageSubscription = content.includes('handleManageSubscription');
      const hasCancelSubscription = content.includes('handleCancelSubscription');
      const hasReactivateSubscription = content.includes('handleReactivateSubscription');

      if (hasSelectPlan && hasManageSubscription && hasCancelSubscription && hasReactivateSubscription) {
        logTest('Subscription management functions', 'PASS', 'All handlers implemented');
      } else {
        logTest('Subscription management functions', 'FAIL', 'Missing handlers');
      }
    } else {
      logTest('Subscription management functions', 'FAIL', 'File not found');
    }
  } catch (error) {
    logTest('Subscription management functions', 'FAIL', error.message);
  }

  console.log('\n📚 Type Safety Tests\n');

  // Test 9: Type imports
  try {
    const filePath = path.join(projectRoot, 'src/app/(protected)/billing/page.tsx');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasSubscriptionTypes = content.includes('SubscriptionPlanId') && content.includes('SubscriptionStatus');
      const hasTimestamp = content.includes('Timestamp');

      if (hasSubscriptionTypes && hasTimestamp) {
        logTest('Type imports', 'PASS', 'All subscription types imported');
      } else {
        logTest('Type imports', 'FAIL', 'Missing type imports');
      }
    } else {
      logTest('Type imports', 'FAIL', 'File not found');
    }
  } catch (error) {
    logTest('Type imports', 'FAIL', error.message);
  }

  // Test 10: Component prop types
  try {
    const components = [
      'SubscriptionPlanSelector',
      'UsageMeter',
      'SubscriptionStatus',
      'PaymentMethodManager'
    ];

    let allHaveProps = true;
    for (const component of components) {
      const filePath = path.join(projectRoot, `src/components/billing/${component}.tsx`);
      if (!fs.existsSync(filePath)) {
        allHaveProps = false;
        break;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.includes(`${component}Props`) || !content.includes('interface')) {
        allHaveProps = false;
        break;
      }
    }

    if (allHaveProps) {
      logTest('Component prop types', 'PASS', 'All components have TypeScript interfaces');
    } else {
      logTest('Component prop types', 'FAIL', 'Some components missing prop types');
    }
  } catch (error) {
    logTest('Component prop types', 'FAIL', error.message);
  }

  console.log('\n🎨 Styling Tests\n');

  // Test 11: Brand colors
  try {
    const components = [
      'src/components/billing/SubscriptionPlanSelector.tsx',
      'src/components/billing/UsageMeter.tsx',
      'src/components/billing/SubscriptionStatus.tsx'
    ];

    let allHaveBrandColors = true;
    for (const componentPath of components) {
      const filePath = path.join(projectRoot, componentPath);
      if (!fs.existsSync(filePath)) {
        allHaveBrandColors = false;
        break;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      // Check for brand colors #003366 and #b29dd9
      if (!content.includes('#003366') && !content.includes('#b29dd9')) {
        allHaveBrandColors = false;
        break;
      }
    }

    if (allHaveBrandColors) {
      logTest('Brand color consistency', 'PASS', 'Components use brand colors (#003366, #b29dd9)');
    } else {
      logTest('Brand color consistency', 'FAIL', 'Missing brand colors');
    }
  } catch (error) {
    logTest('Brand color consistency', 'FAIL', error.message);
  }

  // Test 12: Responsive design
  try {
    const components = [
      'src/components/billing/SubscriptionPlanSelector.tsx',
      'src/app/(protected)/billing/page.tsx'
    ];

    let allHaveResponsive = true;
    for (const componentPath of components) {
      const filePath = path.join(projectRoot, componentPath);
      if (!fs.existsSync(filePath)) {
        allHaveResponsive = false;
        break;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      // Check for responsive grid classes
      if (!content.includes('md:grid-cols') && !content.includes('lg:')) {
        allHaveResponsive = false;
        break;
      }
    }

    if (allHaveResponsive) {
      logTest('Responsive design', 'PASS', 'Components use responsive classes');
    } else {
      logTest('Responsive design', 'FAIL', 'Missing responsive classes');
    }
  } catch (error) {
    logTest('Responsive design', 'FAIL', error.message);
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 UI Component Test Summary\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`\x1b[32m✓ Passed: ${passed}\x1b[0m`);
  if (failed > 0) console.log(`\x1b[31m✗ Failed: ${failed}\x1b[0m`);

  const percentage = ((passed / total) * 100).toFixed(1);
  console.log(`\nSuccess Rate: ${percentage}%`);

  if (failed === 0) {
    console.log('\n\x1b[32m🎉 All UI component tests passed!\x1b[0m');
  } else {
    console.log('\n\x1b[31m❌ Some UI component tests failed\x1b[0m');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
