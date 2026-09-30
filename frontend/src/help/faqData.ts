export interface FaqEntry {
  id: string;
  category: string;
  question: string;
  answer: string;
  /** Extra search terms beyond what's already in the question/answer text. */
  keywords: string[];
}

/**
 * A static, hand-written FAQ — no AI call, no backend, just a curated list
 * searched client-side (see HelpPanel). Kept separate from
 * pos/PosHelpDialog.tsx, which is a keyboard-shortcuts/scanning cheatsheet,
 * not a "how do I..." reference — the two answer different questions and
 * are reachable from different icons on purpose.
 */
export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'void-item',
    category: 'Checkout',
    question: 'How do I void an item from a sale?',
    answer:
      'With items in the cart, click "Void Item" (F7). Find the line by scanning/typing its SKU, barcode or name — or tap it directly in the list — then set the "Quantity to void" (it defaults to the full line quantity, but you can void just part of it) and click "Continue". If your company requires supervisor approval for item voids, a supervisor enters their username and password to confirm; otherwise it\'s recorded straight to the audit trail against your own name.',
    keywords: ['remove item', 'delete item', 'cancel item', 'f7'],
  },
  {
    id: 'return-refund',
    category: 'Checkout',
    question: 'How do I process a return or refund?',
    answer:
      'Returns and refunds are the same flow — there isn\'t a separate refund screen. From the POS, with an empty cart, click "Return" (F8) to go to the Returns screen (Back Office → Customers → Returns also gets you there). Click "New Return", enter the sale\'s Invoice Number and "Search", pick the sale, then enter a "Return Qty" for each item being returned. Click "Submit Return". A pending return then needs someone with return-approval rights to open it and click "Approve & Refund" (or "Reject").',
    keywords: ['refund', 'return item', 'money back', 'f8'],
  },
  {
    id: 'discount',
    category: 'Checkout',
    question: 'How do I apply a discount (including Senior Citizen / PWD)?',
    answer:
      'With items in the cart, click "Discount" (F5). Pick a type: Government (Senior Citizen, PWD, or SC/PWD 5% BNPC), Store & Promotional (Regular, Promo, Employee, Member, Wholesale), or Other (Manual). For Senior Citizen/PWD, you\'ll be asked for the customer\'s name and their SC/PWD ID number — check the ID before entering it. For the percentage/fixed-amount types, use the quick-percent buttons or the keypad, then click "Apply Discount". A Manual discount also asks for a Reason, and may require supervisor approval depending on your company\'s settings. Only items that actually qualify for the chosen discount type are affected — the dialog shows you which ones do.',
    keywords: ['senior citizen', 'pwd', 'senior discount', 'promo', 'f5'],
  },
  {
    id: 'open-shift',
    category: 'Cash Drawer',
    question: 'How do I open my shift / start the cash drawer?',
    answer:
      'This depends on how your terminal is set up. If it asks for an amount, type in the "Opening Cash" you\'re starting with and click "Open POS Terminal". If the terminal has a fixed float, it may open automatically with no entry needed, or just ask you to confirm the pre-set amount by clicking "Start Shift".',
    keywords: ['start shift', 'opening cash', 'open register', 'open terminal'],
  },
  {
    id: 'close-shift',
    category: 'Cash Drawer',
    question: 'How do I close my shift / count out the drawer at the end of the day?',
    answer:
      'Open the account menu (your avatar, top right) and click "Close POS Terminal". You\'ll see your Opening Cash, Cash Sales, Cash In/Out, and the system\'s "Expected Cash" — count your actual drawer, enter it under "Actual Cash (count the drawer)", check the "Difference" it shows you, then click "Close POS Terminal" to finish.',
    keywords: ['end shift', 'close register', 'close terminal', 'cash count', 'reconcile'],
  },
  {
    id: 'x-z-reading',
    category: 'Cash Drawer',
    question: 'What\'s the difference between an X-Reading and a Z-Reading?',
    answer:
      'Both are in Back Office → Cash Drawers → "X/Z Readings" tab, not on the cashier\'s own screen. An X-Reading is a read-only snapshot — pull it anytime, it changes nothing. A Z-Reading permanently closes out the period and resets the counters, so it needs the right permission and a confirmation before it runs. Either one gives you a printable slip.',
    keywords: ['reading', 'z reading', 'x reading', 'close period'],
  },
  {
    id: 'print-receipt',
    category: 'Printing',
    question: 'How do I print or reprint a receipt?',
    answer:
      'A receipt prints automatically the moment a sale finishes. If you need it again right after, the receipt screen still has its own "Print" button. To reprint an OLDER sale\'s receipt, use the reprint/receipt lookup (search by invoice or however your terminal has it set up) — that one prints only when you click Print, it won\'t print itself automatically.',
    keywords: ['reprint', 'print again', 'receipt printer'],
  },
  {
    id: 'bir-receipt-details',
    category: 'Settings',
    question: 'What does "Print these on this branch\'s receipts" do?',
    answer:
      'It\'s in Back Office → Settings → Stores, under a branch\'s MIN/PTU numbers. Turning it off just hides those numbers, and the VAT sales breakdown, from that branch\'s printed receipts — the numbers themselves stay saved, nothing is deleted, it only changes what shows up on paper.',
    keywords: ['min', 'ptu', 'vat breakdown', 'bir details', 'show_bir_details'],
  },
  {
    id: 'reset-password',
    category: 'Team & Access',
    question: 'How do I reset a cashier\'s forgotten password?',
    answer:
      'In Back Office → Team → Users, find their row and click the "Password" icon. In the dialog, click "Reset Password" and confirm — this signs them out of every device they\'re currently logged into. You\'ll be shown a one-time temporary password; copy it and share it with them directly (in person, by phone, etc.), since it can\'t be shown again after you close that dialog.',
    keywords: ['forgot password', 'change password', 'temporary password', 'locked out'],
  },
  {
    id: 'invoice-series',
    category: 'Settings',
    question: 'What is Sales Invoice Configuration for?',
    answer:
      'It\'s in Back Office → Settings → Sales Invoicing. This is where you set up the official invoice-numbering rules for a branch: the prefix (like "SI-"), the starting and current number, how many digits to pad to, and a maximum number before that series is considered "exhausted". It also lets you pick the BIR invoice type (Sales Invoice, VAT Invoice, Non-VAT Invoice, Service Invoice) and warns you before a branch is about to run out of numbers, so you can set up the next series ahead of time.',
    keywords: ['invoice number', 'invoice series', 'bir', 'numbering'],
  },
  {
    id: 'chat-dm',
    category: 'Messaging',
    question: 'How do I send a direct message to a teammate?',
    answer:
      'Click the "Messages" icon in the Back Office top bar, then the "New direct message" icon. Pick someone from the list (you can filter by typing their name) and you\'re straight into a conversation with them — type and send. Messages are kept for 3 months, then deleted automatically.',
    keywords: ['dm', 'direct message', 'chat', 'text a coworker'],
  },
  {
    id: 'chat-group',
    category: 'Messaging',
    question: 'How do I start a group chat?',
    answer:
      'Click the "Messages" icon, then "New group". Give it a name, pick who to add, and click "Create group". Afterwards, any member can add people or leave — but only whoever created the group can rename it, remove someone else, or delete the whole conversation.',
    keywords: ['group chat', 'group message', 'team chat'],
  },
  {
    id: 'chat-who-sees-it',
    category: 'Messaging',
    question: 'Why don\'t I see the Messages icon?',
    answer:
      'Messaging is a Back Office feature — it\'s never shown on the cashier POS screen, and a Cashier or Cashier Supervisor account won\'t see it even if they open Back Office, since it\'s limited to Store Manager, Store Admin, Company Admin and Super Admin roles.',
    keywords: ['no messages icon', 'cant see chat', 'missing chat'],
  },
];
