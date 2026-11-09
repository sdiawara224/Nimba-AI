#!/usr/bin/env node
/**
 * Vérifications rapides de la devise GNF / $ (aucun serveur requis).
 * Lancer : npm run check:currency
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { PLANS, GNF_PER_USD, FCFA_PER_USD, GNF_PER_FCFA, formatGnf, formatUsd, formatPrice } =
  await import(join(root, 'src/lib/plans.ts'));

assert.equal(GNF_PER_USD, 8650, 'taux indicatif 1 $ = 8 650 GNF');
assert.equal(FCFA_PER_USD, 575, 'ancien taux de conversion 1 $ = 575 FCFA');
assert.ok(Math.abs(GNF_PER_FCFA - 15.04) < 0.01, '1 FCFA ≈ 15,04 GNF');

const expected = [
  ['decouverte', 10, 75000, '75 000 GNF', '8,67 $'],
  ['createur', 40, 225000, '225 000 GNF', '26,01 $'],
  ['studio', 120, 525000, '525 000 GNF', '60,69 $'],
];
assert.equal(PLANS.length, expected.length);
for (const [id, credits, priceGnf, gnf, usd] of expected) {
  const plan = PLANS.find((p) => p.id === id);
  assert.ok(plan, `pack ${id} absent`);
  assert.equal(plan.credits, credits);
  assert.equal(plan.priceGnf, priceGnf);
  assert.equal(plan.priceGnf % 5000, 0, 'montant arrondi au multiple de 5 000 GNF');
  assert.equal(formatGnf(plan.priceGnf), gnf);
  assert.equal(formatUsd(plan.priceGnf), usd);
  assert.equal(formatPrice(plan.priceGnf), `${gnf} · ${usd}`);
}

// Le FCFA ne doit plus apparaître dans l'interface ni dans le schéma SQL.
for (const file of [
  'src/app/page.tsx',
  'src/components/PricingCards.tsx',
  'src/app/checkout/simulate/page.tsx',
  'src/app/admin/page.tsx',
  'src/app/api/checkout/route.ts',
  'src/app/api/admin/route.ts',
  'supabase/schema.sql',
]) {
  const text = readFileSync(join(root, file), 'utf8');
  assert.ok(!/FCFA|fcfa|F<\/strong>/.test(text), `référence FCFA résiduelle dans ${file}`);
}

console.log('Devise OK : GNF + $ affichés ensemble, FCFA absent, 1 $ ≈ 8 650 GNF.');
for (const plan of PLANS) console.log(`  ${plan.name} : ${formatPrice(plan.priceGnf)} · ${plan.credits} crédits`);
