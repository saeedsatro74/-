import { Transaction } from '../types';

export interface PartyInfo {
  name: string;
  isCompany: boolean;
  label: string; // e.g. "شرکت (انبار مرکزی)", "شخص بیرونی", "مشتری"
}

export interface TransactionParties {
  buyer: PartyInfo;
  seller: PartyInfo;
  isExternalSale: boolean;
  otherParty: PartyInfo; // The party dealing with the wallet owner
  displaySummary: string; // e.g. "فروشنده: علی اکبری • خریدار: آقای سهرابی"
}

const DEFAULT_COMPANY_NAME = 'شرکت مس واته';

/**
 * Extract or compute the buyer, seller, and counterparty for any transaction
 */
export function getTransactionParties(
  tx: Transaction,
  personName?: string,
  companyName: string = DEFAULT_COMPANY_NAME
): TransactionParties {
  const customerName = (personName || 'مشتری').trim();

  // Helper to extract party name from notes if previously written in text
  const extractFromNotes = (prefix: string): string | null => {
    if (!tx.notes) return null;
    const match = tx.notes.match(new RegExp(`${prefix}[:\\s]+([^\\n,;|]+)`));
    return match && match[1] ? match[1].trim() : null;
  };

  const isCompany = (name: string): boolean => {
    if (!name) return false;
    const lower = name.toLowerCase();
    return (
      name.includes('شرکت') ||
      name.includes('واته') ||
      name.includes('انبار') ||
      lower.includes('company') ||
      name === companyName
    );
  };

  if (tx.type === 'sell') {
    // Copper Sale: Customer is the Seller
    const isExternal = tx.saleCategory === 'external';
    let buyerName = (tx.buyerName || '').trim();

    if (!buyerName) {
      const fromNotes = extractFromNotes('خریدار');
      if (fromNotes) {
        buyerName = fromNotes;
      } else if (isExternal) {
        buyerName = 'خریدار بیرونی (خارج شرکت)';
      } else {
        buyerName = companyName;
      }
    }

    const buyerIsCompany = isCompany(buyerName);
    const sellerIsCompany = false;

    const buyerInfo: PartyInfo = {
      name: buyerName,
      isCompany: buyerIsCompany,
      label: buyerIsCompany ? 'شرکت (خریدار)' : isExternal ? 'خریدار بیرونی (خارج شرکت)' : 'خریدار',
    };

    const sellerInfo: PartyInfo = {
      name: customerName,
      isCompany: sellerIsCompany,
      label: 'مشتری (فروشنده مس)',
    };

    return {
      buyer: buyerInfo,
      seller: sellerInfo,
      isExternalSale: isExternal,
      otherParty: buyerInfo,
      displaySummary: `فروشنده: ${sellerInfo.name} • خریدار: ${buyerInfo.name}`,
    };
  }

  if (tx.type === 'buy') {
    // Copper Buy: Customer is the Buyer, Company (or external supplier) is Seller
    let sellerName = (tx.sellerName || '').trim();
    if (!sellerName) {
      const fromNotes = extractFromNotes('فروشنده');
      if (fromNotes) {
        sellerName = fromNotes;
      } else {
        sellerName = companyName;
      }
    }

    const sellerIsCompany = isCompany(sellerName);
    const buyerIsCompany = false;

    const sellerInfo: PartyInfo = {
      name: sellerName,
      isCompany: sellerIsCompany,
      label: sellerIsCompany ? 'شرکت (تأمین‌کننده / فروشنده)' : 'فروشنده بیرونی',
    };

    const buyerInfo: PartyInfo = {
      name: customerName,
      isCompany: buyerIsCompany,
      label: 'مشتری (خریدار مس)',
    };

    return {
      buyer: buyerInfo,
      seller: sellerInfo,
      isExternalSale: false,
      otherParty: sellerInfo,
      displaySummary: `فروشنده: ${sellerInfo.name} • خریدار: ${buyerInfo.name}`,
    };
  }

  if (tx.type === 'deposit') {
    // Deposit / Top-up: Customer pays Company
    const buyerInfo: PartyInfo = {
      name: companyName,
      isCompany: true,
      label: 'شرکت (دریافت‌کننده وجه)',
    };
    const sellerInfo: PartyInfo = {
      name: customerName,
      isCompany: false,
      label: 'مشتری (واریزکننده)',
    };
    return {
      buyer: buyerInfo,
      seller: sellerInfo,
      isExternalSale: false,
      otherParty: buyerInfo,
      displaySummary: `واریزکننده: ${customerName} • طرف حساب: ${companyName}`,
    };
  }

  if (tx.type === 'withdrawal') {
    // Withdrawal: Company pays to Customer
    const buyerInfo: PartyInfo = {
      name: customerName,
      isCompany: false,
      label: 'مشتری (دریافت‌کننده وجه)',
    };
    const sellerInfo: PartyInfo = {
      name: companyName,
      isCompany: true,
      label: 'شرکت (پرداخت‌کننده)',
    };
    return {
      buyer: buyerInfo,
      seller: sellerInfo,
      isExternalSale: false,
      otherParty: sellerInfo,
      displaySummary: `پرداخت‌کننده: ${companyName} • دریافت‌کننده: ${customerName}`,
    };
  }

  // Adjustment
  const companyInfo: PartyInfo = {
    name: companyName,
    isCompany: true,
    label: 'شرکت مس واته',
  };
  const custInfo: PartyInfo = {
    name: customerName,
    isCompany: false,
    label: 'مشتری',
  };
  return {
    buyer: custInfo,
    seller: companyInfo,
    isExternalSale: false,
    otherParty: companyInfo,
    displaySummary: `طرفین: ${companyName} و ${customerName}`,
  };
}
