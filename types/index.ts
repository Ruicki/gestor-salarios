import { Profile, Expense, Goal, AdditionalIncome, Salary, CreditCard, Loan, Account, Category } from '@prisma/client';

export type ProfileWithData = Profile & {
    expenses: (Expense & { categoryRel?: Category | null })[];
    goals: Goal[];
    incomes: AdditionalIncome[];
    salaries: Salary[];
    creditCards: CreditCard[];
    loans: Loan[];
    accounts: Account[];
    categories: Category[];
};
