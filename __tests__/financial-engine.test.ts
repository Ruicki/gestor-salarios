import { calculateSalary } from '../lib/financial-engine';
import { PanamaTaxStrategy } from '../lib/strategies/tax/panama.tax.strategy';

describe('Financial Engine - calculateSalary', () => {
    const taxStrategy = new PanamaTaxStrategy();

    it('should calculate taxes correctly for a salary below the first bracket ($10,000/year -> $833/month)', () => {
        const result = calculateSalary(833, 0, 'monthly', 0, taxStrategy);

        expect(result.grossVal).toBe(833);
        expect(result.incomeTax).toBe(0); // No ISR below 11k
        expect(result.socialSec).toBeCloseTo(833 * 0.0975, 2);
        expect(result.eduIns).toBeCloseTo(833 * 0.0125, 2);

        const expectedNet = 833 - (833 * 0.0975) - (833 * 0.0125);
        expect(result.netVal).toBeCloseTo(expectedNet, 2);
    });

    it('should calculate taxes correctly for a salary in the second bracket ($1,500/month)', () => {
        const result = calculateSalary(1500, 0, 'monthly', 0, taxStrategy);

        // Annual: 18,000. ISR base = 18000 - 11000 = 7000. Tax = 7000 * 0.15 = 1050 / year = 87.5 / month
        expect(result.incomeTax).toBeCloseTo(87.5, 2);

        const ss = 1500 * 0.0975;
        const edu = 1500 * 0.0125;
        expect(result.socialSec).toBeCloseTo(ss, 2);
        expect(result.eduIns).toBeCloseTo(edu, 2);

        const expectedNet = 1500 - ss - edu - 87.5;
        expect(result.netVal).toBeCloseTo(expectedNet, 2);
    });

    it('should apply absent days deduction properly', () => {
        // $1500 / 30 = $50 per day. 2 absent days = -$100. Base = $1400.
        const result = calculateSalary(1500, 0, 'monthly', 2, taxStrategy);

        expect(result.grossAfterAbsence).toBe(1400);

        // Annual based on 1400: 16800. ISR base = 16800 - 11000 = 5800. Tax = 5800 * 0.15 = 870 / year = 72.5 / month
        expect(result.incomeTax).toBeCloseTo(72.5, 2);

        const ss = 1400 * 0.0975;
        expect(result.socialSec).toBeCloseTo(ss, 2);
    });

    it('should handle bonuses correctly without affecting tax base (in this simple model)', () => {
        // Note: Depending on local laws, bonuses might be taxed differently, but based on the previous implementation,
        // the bonus is added to the net AFTER calculating taxes over the base salary.
        const result = calculateSalary(1500, 500, 'monthly', 0, taxStrategy);

        const expectedTaxes = result.socialSec + result.eduIns + result.incomeTax; // based on 1500
        const expectedNet = (1500 - expectedTaxes) + 500;

        expect(result.bonus).toBe(500);
        expect(result.netVal).toBeCloseTo(expectedNet, 2);
    });
});
