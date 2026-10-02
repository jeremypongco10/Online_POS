export const FAQ_CATEGORIES = [
  'Checkout',
  'Cash Drawer',
  'Product Lifecycle',
  'Dashboard',
  'Products',
  'Inventory',
  'Purchasing',
  'Returns',
  'Customers',
  'Reports',
  'Team & Access',
  'Settings',
  'Printing',
  'Messaging',
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export const FAQ_CATEGORY_INFO: Record<FaqCategory, { blurb: string; sequential?: boolean; permissions?: string[] }> = {
  Checkout: { blurb: 'Ringing up sales, voids and discounts' },
  'Cash Drawer': { blurb: 'Opening, closing, cash movements and X/Z readings' },
  // Entries in this category are one continuous walkthrough, so HelpPanel
  // numbers them in array order rather than presenting them as loose topics.
  // Gated as a whole: hiding single steps would leave a broken sequence.
  'Product Lifecycle': {
    blurb: 'From a new product to stock, sale and return',
    sequential: true,
    permissions: ['products.view', 'inventory.view', 'purchases.view'],
  },
  Dashboard: { blurb: "Today's numbers and shortcuts", permissions: ['dashboard.view'] },
  Products: { blurb: 'The catalog, prices, categories and exports', permissions: ['products.view'] },
  Inventory: { blurb: 'Stock levels, counts, adjustments and transfers', permissions: ['inventory.view'] },
  Purchasing: { blurb: 'Purchase orders and suppliers', permissions: ['purchases.view'] },
  Returns: { blurb: 'Returns and refunds at the POS, and their history', permissions: ['returns.create', 'returns.view'] },
  Customers: { blurb: 'Customer records and loyalty points', permissions: ['customers.view'] },
  Reports: { blurb: 'Sales, discount, inventory and audit reports', permissions: ['reports.view'] },
  'Team & Access': { blurb: 'Users, roles, passwords and permissions', permissions: ['users.view'] },
  Settings: { blurb: 'Branches, terminals, invoicing, tax and security' },
  Printing: { blurb: 'Receipts and reprints' },
  Messaging: { blurb: 'Back Office chat', permissions: ['chat.access'] },
};

export interface FaqEntry {
  id: string;
  category: FaqCategory;
  question: string;
  /** One or two sentences: the short answer, readable without the rest. */
  answer: string;
  /** Where in the app this happens, as the user would navigate to it. */
  path?: string;
  steps?: string[];
  tip?: string;
  warning?: string;
  /** Extra search terms beyond what's already in the visible text. */
  keywords: string[];
  /**
   * Any one of these lets the user see the entry. Overrides the category's
   * own list; [] shows it to everyone (e.g. "why can't I see X?" answers,
   * which exist precisely for people without access).
   */
  permissions?: string[];
}

/**
 * Whether the user can see an entry — the same permissions that show or
 * hide the screen it describes, so help never walks someone through a page
 * they can't open. A convenience, not a security boundary: the text ships
 * in the bundle either way.
 */
export function canSeeFaq(entry: FaqEntry, hasPermission: (slug: string) => boolean): boolean {
  const required = entry.permissions ?? FAQ_CATEGORY_INFO[entry.category].permissions ?? [];
  return required.length === 0 || required.some(hasPermission);
}

/** Topics shown up front before the user searches or picks a category. */
export const POPULAR_FAQ_IDS = ['void-item', 'discount', 'return-refund', 'close-shift', 'product-no-price', 'reset-password'];

/**
 * A static, hand-written FAQ — no AI call, no backend, just a curated list
 * searched client-side (see HelpPanel). Kept separate from
 * pos/PosHelpDialog.tsx, which is a keyboard-shortcuts/scanning cheatsheet,
 * not a "how do I..." reference — the two answer different questions and
 * are reachable from different icons on purpose.
 */
export const FAQ_ENTRIES: FaqEntry[] = [
  // ── Checkout ──────────────────────────────────────────────────────────
  {
    id: 'void-item',
    category: 'Checkout',
    question: 'How do I void an item from a sale?',
    answer: 'You can remove a whole line from the current sale, or just part of its quantity.',
    path: 'POS → Void Item (F7)',
    steps: [
      'With items in the cart, click "Void Item" (F7).',
      'Find the line: scan or type its SKU, barcode or name, or tap it directly in the list.',
      'Set "Quantity to void". It starts at the full line quantity, but you can lower it to void only part.',
      'Click "Continue".',
    ],
    tip: 'If your company requires supervisor approval for voids, a supervisor enters their username and password to confirm. Otherwise the void is recorded in the audit trail under your own name.',
    keywords: ['remove item', 'delete item', 'cancel item', 'f7'],
  },
  {
    id: 'discount',
    category: 'Checkout',
    question: 'How do I apply a discount, including Senior Citizen or PWD?',
    answer: 'Pick one discount type for the sale. The POS works out which items qualify.',
    path: 'POS → Discount (F5)',
    steps: [
      'With items in the cart, click "Discount" (F5).',
      'Pick a type: Government (Senior Citizen, PWD, or SC/PWD 5% BNPC), Store & Promotional (Regular, Promo, Employee, Member, Wholesale), or Other (Manual).',
      'For Senior Citizen or PWD, enter the customer\'s name and their SC/PWD ID number.',
      'For percentage or fixed-amount types, use the quick-percent buttons or the keypad.',
      'Click "Apply Discount".',
    ],
    tip: 'Only items that qualify for the chosen type get discounted. The dialog shows you which ones do.',
    warning: 'Check the SC/PWD ID card before entering the number. A Manual discount also asks for a reason, and may need supervisor approval depending on your company\'s settings.',
    keywords: ['senior citizen', 'pwd', 'senior discount', 'promo', 'f5'],
  },
  {
    id: 'return-refund',
    category: 'Returns',
    question: 'How do I process a return or refund?',
    answer: 'At the POS with Return (F8). The customer is refunded on the spot — after a supervisor approves, when approval is on.',
    path: 'POS → Return (F8)',
    steps: [
      'With an empty cart, click "Return" (F8).',
      'Type the Invoice Number from the customer\'s receipt, click "Search", and pick the sale.',
      'Enter how many of each item is coming back, or tap "All".',
      'Pick a Reason and how to refund: Cash, or a method the sale was paid with (like GCash).',
      'If approval is on (Settings → Security), a supervisor types their own username and password. Then click "Refund".',
      'Hand the customer the amount shown. Stock goes back automatically.',
    ],
    tip: 'Any sale can be returned, with or without a customer on it. The sale must be from this branch.',
    warning: 'A cash refund comes out of your drawer, so your Expected Cash at closing goes down by the same amount. Refund exactly what the screen shows.',
    keywords: ['refund', 'return item', 'money back', 'f8', 'supervisor'],
  },
  {
    id: 'return-replace',
    category: 'Returns',
    question: 'How do I replace an item (exchange)?',
    answer: 'Return it with "Replace with other items". Its value becomes a credit on the sale, then ring up the replacements as usual.',
    path: 'POS → Return (F8)',
    steps: [
      'Click "Return" (F8), find the sale, and pick what is coming back.',
      'Under "What does the customer want?", choose "Replace with other items", and pick a reason.',
      'Click "Give ₱… credit" (with supervisor approval if it is on), then "Add replacement items".',
      'Scan the replacements. The cart shows the credit and what the customer still pays.',
      'Pay as usual — or, if the credit covers it all, click "Complete exchange" and hand back any change.',
    ],
    tip: 'Changed their mind? Click the credit line in the cart to refund it in cash, or keep it for later under Return → Unused exchange credits.',
    keywords: ['exchange', 'replace', 'swap', 'replacement', 'exchange credit', 'store credit'],
  },

  // ── Cash Drawer ───────────────────────────────────────────────────────
  {
    id: 'open-shift',
    category: 'Cash Drawer',
    question: 'How do I open my shift?',
    answer: 'What you see depends on how your terminal is set up.',
    steps: [
      'If it asks for an amount, type the "Opening Cash" in your drawer and click "Open POS Terminal".',
      'If the terminal uses a fixed float, it may open on its own, or ask you to confirm the preset amount with "Start Shift".',
    ],
    keywords: ['start shift', 'opening cash', 'open register', 'open terminal'],
  },
  {
    id: 'close-shift',
    category: 'Cash Drawer',
    question: 'How do I close my shift and count the drawer?',
    answer: 'Count the cash you actually have and compare it with what the system expects.',
    path: 'Your avatar (top right) → Close POS Terminal',
    steps: [
      'Open the account menu and click "Close POS Terminal".',
      'Review Opening Cash, Cash Sales, Cash In/Out and the "Expected Cash".',
      'Count your drawer and enter the total under "Actual Cash (count the drawer)".',
      'Check the "Difference", then click "Close POS Terminal" to finish.',
    ],
    keywords: ['end shift', 'close register', 'close terminal', 'cash count', 'reconcile'],
  },
  {
    id: 'x-z-reading',
    category: 'Cash Drawer',
    permissions: ['readings.view'],
    question: 'What is the difference between an X-Reading and a Z-Reading?',
    answer: 'An X-Reading is a snapshot that changes nothing. A Z-Reading closes out the period for good.',
    path: 'Back Office → Cash Drawers → X/Z Readings',
    steps: [
      'X-Reading: pull it anytime, as often as you like.',
      'Z-Reading: closes the period and resets the counters. It needs the right permission and a confirmation.',
      'Both give you a printable slip.',
    ],
    warning: 'A Z-Reading is permanent. Take it only when the period is really over.',
    keywords: ['reading', 'z reading', 'x reading', 'close period', 'end of day'],
  },

  // ── Product Lifecycle (numbered in this order) ────────────────────────
  {
    id: 'add-product',
    category: 'Product Lifecycle',
    question: 'Add a new product',
    answer: 'Every product starts with a SKU and a name. Everything else can come later.',
    path: 'Back Office → Products → Add New Products',
    steps: [
      'Choose Single Product, Bulk Add (a spreadsheet grid), or Import from File (CSV).',
      'Enter the SKU and Name. Both are required.',
      'Optionally fill in Barcode, Description, Category, Unit, Tax Rate and Minimum Stock.',
      'Leave "Active" and "Track Inventory" on, unless the item is a service you never count.',
      'Save, then add a photo if you have one.',
    ],
    tip: 'Minimum Stock becomes the reorder level that the Low Stock report and Dashboard alert use.',
    keywords: ['new product', 'create product', 'add sku', 'bulk add', 'import products'],
  },
  {
    id: 'set-product-price',
    category: 'Product Lifecycle',
    question: 'Set its price at each branch',
    answer: 'A product has no price of its own. Cost and selling price are set per branch.',
    path: 'Back Office → Products → row → Prices',
    steps: [
      'Find the product and click its "Prices" icon.',
      'Enter Cost and Price for each branch that sells it. Profit is worked out for you.',
      'Click "Save Prices".',
    ],
    tip: 'To price many products at once, use Products → "Bulk Update Prices". A branch you leave untouched keeps its current price.',
    keywords: ['change price', 'update price', 'cost price', 'selling price', 'bulk prices'],
  },
  {
    id: 'product-no-price',
    category: 'Product Lifecycle',
    question: 'Why a product shows "No price" at the register',
    answer: 'It has no price at that branch yet, so the POS will not let it be sold there.',
    steps: [
      'Go to Back Office → Products and find the item.',
      'Click "Prices" and enter a price for the branch where it would not sell.',
    ],
    warning: 'An active product always appears in the POS grid, even without a price. Its card just reads "No price" and cannot be tapped, long-pressed, or scanned in.',
    keywords: ['no price', 'cant sell product', 'disabled product card', 'price missing', 'grayed out'],
  },
  {
    id: 'receive-purchase-order',
    category: 'Product Lifecycle',
    question: 'Bring stock in with a purchase order',
    answer: 'A purchase order only adds stock at its last step, when it is received.',
    path: 'Back Office → Purchasing → Purchase Orders',
    steps: [
      'Click "New purchase order". Pick the Supplier (type to search, or add a new one right there) and the branch under "Deliver to".',
      'Search for each product and enter its quantity and unit cost.',
      'Click "Save as draft". The order starts as "Draft".',
      'Open it and click "Approve".',
      'When the goods arrive, open it again and click "Receive into inventory". This is the step that adds stock.',
    ],
    tip: 'A draft or approved order can still be cancelled. A received one cannot.',
    keywords: ['purchase order', 'po', 'receive stock', 'restock', 'supplier order', 'delivery'],
  },
  {
    id: 'partial-receive-po',
    category: 'Product Lifecycle',
    question: 'Handle a delivery that arrived short',
    answer: 'Receiving an order always adds the full ordered quantity, so fix the difference afterward.',
    steps: [
      'Receive the purchase order as normal.',
      'Go to Inventory → Stock levels → "Adjust stock".',
      'Choose "Remove", pick the product, enter what did not arrive, and pick a reason such as "Returned to supplier" or "Other".',
    ],
    warning: 'There is no partial-receive option. If you skip the adjustment, the system will believe you have stock that never arrived.',
    keywords: ['partial delivery', 'short shipment', 'partial receive', 'incomplete order', 'missing items'],
  },
  {
    id: 'adjust-stock',
    category: 'Product Lifecycle',
    question: 'Correct a stock count by hand',
    answer: 'Use an adjustment for opening counts, spoilage, breakage, or any count that is off.',
    path: 'Back Office → Inventory → Stock levels → Adjust stock',
    steps: [
      'Click "Adjust stock", or open a product and click "Adjust".',
      'Pick the Branch and the Product.',
      'Choose "Add", "Remove", or "Set counted" (type what you physically counted and the system works out the difference).',
      'Pick a reason, add notes if needed, and click "Save adjustment".',
    ],
    tip: 'This is also how you enter the opening count for a new product that has no purchase order. Use the "Opening stock" reason.',
    keywords: ['stock count', 'correct inventory', 'adjust stock', 'inventory correction', 'opening count', 'damaged', 'expired'],
  },
  {
    id: 'transfer-stock',
    category: 'Product Lifecycle',
    question: 'Move stock between branches',
    answer: 'A transfer takes stock out of one branch and puts it into another in one step.',
    path: 'Back Office → Inventory → Stock levels → Transfer',
    steps: [
      'Click "Transfer".',
      'Pick the "From" and "To" branches, then the product.',
      'Enter the "Quantity to move". The Sending and Receiving cards show both branches before and after.',
      'Save.',
    ],
    tip: 'The source branch must have that much on hand, or the transfer is refused.',
    keywords: ['move stock', 'transfer between stores', 'branch transfer', 'stock transfer'],
  },
  {
    id: 'sale-stock',
    category: 'Product Lifecycle',
    question: 'What happens to stock when it sells',
    answer: 'For tracked products, each completed sale takes stock off that branch automatically.',
    tip: 'Products with "Track Inventory" off skip this entirely. They can be sold in any quantity and never show up in stock movements.',
    warning: 'If a sale asks for more of a tracked product than the branch has, the whole sale is blocked until the quantity is fixed. Stock can never go below zero.',
    keywords: ['sell', 'stock deducted', 'insufficient stock', 'out of stock', 'checkout inventory'],
  },
  {
    id: 'untracked-inventory-trap',
    category: 'Product Lifecycle',
    question: 'Why a product you never sell still shows stock',
    answer: 'It probably has "Track Inventory" turned off, but still received stock.',
    steps: [
      'Open the product in Back Office → Products and check "Track Inventory".',
      'If it should be counted, turn Track Inventory on.',
      'If it is a true service item, correct its count to zero with "Adjust Stock".',
    ],
    warning: 'Receiving a purchase order or adjusting stock never checks this setting. An untracked product can pile up stock that no sale will ever take away.',
    keywords: ['track inventory off', 'wrong stock count', 'untracked product', 'service item stock'],
  },
  {
    id: 'return-stock-timing',
    category: 'Product Lifecycle',
    question: 'When a return puts stock back',
    answer: 'The moment the supervisor approves it at the POS. The refund and the restock happen together.',
    path: 'POS → Return (F8)',
    steps: [
      'Tracked products go back on the shelf count of the branch that sold them.',
      'Each one shows in Inventory → Movements as a "Return".',
    ],
    tip: 'If the item can\'t be resold (damaged or expired), remove it afterwards with Inventory → Adjust stock → Remove, using the "Damaged" or "Expired" reason.',
    keywords: ['return stock', 'restock return', 'returned items', 'damaged return'],
  },
  {
    id: 'who-made-change',
    category: 'Product Lifecycle',
    question: 'See who changed the stock',
    answer: 'Inventory → Movements shows every change, who made it, and the balance after.',
    path: 'Back Office → Inventory → Movements',
    steps: [
      'Open Inventory → Movements. It lists every purchase, sale, return, adjustment and transfer, with the person in the "By" column.',
      'Filter by branch, type, or date range, or search for the product.',
      'For changes outside stock, like price or product edits, open Reports → Audit Trail.',
    ],
    tip: 'Reports → Inventory also has Current Stock, Low Stock, Stock Adjustments and Stock Transfers views for a wider picture.',
    keywords: ['who adjusted stock', 'audit trail', 'inventory history', 'track changes', 'movements'],
  },

  // ── Printing ──────────────────────────────────────────────────────────
  {
    id: 'print-receipt',
    category: 'Printing',
    question: 'How do I print or reprint a receipt?',
    answer: 'A receipt prints automatically the moment a sale finishes.',
    steps: [
      'Need another copy right away? Use the "Print" button on the receipt screen.',
      'For an older sale, click "Reprint" on the POS (F7 while the cart is empty) and look it up by invoice number.',
      'Click "Print". A reprint never prints by itself.',
    ],
    keywords: ['reprint', 'print again', 'receipt printer', 'copy of receipt'],
  },

  // ── Team & Access ─────────────────────────────────────────────────────
  {
    id: 'reset-password',
    category: 'Team & Access',
    question: 'How do I reset a cashier\'s forgotten password?',
    answer: 'You give them a one-time temporary password, and they are signed out everywhere.',
    path: 'Back Office → Team → Users → Password icon',
    steps: [
      'Find their row and click the "Password" icon.',
      'Click "Reset Password" and confirm.',
      'Copy the temporary password that appears.',
      'Give it to them directly, in person or by phone.',
    ],
    warning: 'The temporary password is shown only once. Copy it before you close the dialog.',
    keywords: ['forgot password', 'change password', 'temporary password', 'locked out'],
  },

  // ── Settings ──────────────────────────────────────────────────────────
  {
    id: 'bir-receipt-details',
    category: 'Settings',
    permissions: ['stores.view'],
    question: 'What does "Print these on this branch\'s receipts" do?',
    answer: 'It hides the branch\'s MIN and PTU numbers, and the VAT breakdown, from printed receipts.',
    path: 'Back Office → Settings → Stores',
    tip: 'The numbers stay saved. Turning it off only changes what shows up on paper.',
    keywords: ['min', 'ptu', 'vat breakdown', 'bir details', 'show_bir_details'],
  },
  {
    id: 'invoice-series',
    category: 'Settings',
    permissions: ['invoice-series.view'],
    question: 'What is Sales Invoice Configuration for?',
    answer: 'It sets each branch\'s official invoice-numbering rules.',
    path: 'Back Office → Settings → Sales Invoicing',
    steps: [
      'Set the prefix (like "SI-"), the starting and current number, and how many digits to pad to.',
      'Set a maximum number. Past it, the series counts as used up.',
      'Pick the BIR invoice type: Sales Invoice, VAT Invoice, Non-VAT Invoice or Service Invoice.',
    ],
    tip: 'You are warned before a branch runs out of numbers, so you can set up the next series ahead of time.',
    keywords: ['invoice number', 'invoice series', 'bir', 'numbering'],
  },

  // ── Messaging ─────────────────────────────────────────────────────────
  {
    id: 'chat-dm',
    category: 'Messaging',
    question: 'How do I message a teammate?',
    answer: 'Start a direct conversation from the Messages icon in the Back Office top bar.',
    path: 'Back Office top bar → Messages',
    steps: [
      'Click "Messages", then "New direct message".',
      'Pick someone from the list. Type to filter by name.',
      'Write your message and send.',
    ],
    tip: 'Messages are kept for 3 months, then deleted automatically.',
    keywords: ['dm', 'direct message', 'chat', 'text a coworker'],
  },
  {
    id: 'chat-group',
    category: 'Messaging',
    question: 'How do I start a group chat?',
    answer: 'Name the group and pick who is in it.',
    path: 'Back Office top bar → Messages',
    steps: ['Click "Messages", then "New group".', 'Give it a name and pick the members.', 'Click "Create group".'],
    tip: 'Any member can add people or leave. Only the person who created the group can rename it, remove someone, or delete it.',
    keywords: ['group chat', 'group message', 'team chat'],
  },
  {
    id: 'chat-who-sees-it',
    category: 'Messaging',
    permissions: [],
    question: 'Why don\'t I see the Messages icon?',
    answer: 'Messaging is a Back Office feature for managers and admins.',
    tip: 'It never appears on the cashier POS screen. Cashier and Cashier Supervisor accounts do not see it, even in Back Office.',
    keywords: ['no messages icon', 'cant see chat', 'missing chat'],
  },

  // ── Dashboard ─────────────────────────────────────────────────────────
  {
    id: 'dashboard-overview',
    category: 'Dashboard',
    question: 'What do the Dashboard numbers mean?',
    answer: 'A quick read on sales and stock for the period and branch you pick at the top.',
    path: 'Back Office → Dashboard',
    steps: [
      'Total Sales, Total Transactions and Products Sold are for completed sales only.',
      'Low Stock Items counts tracked products at or below their reorder level.',
      'Sales Overview, Sales by Payment Method, Top Selling Products and Sales by Store break the same sales down.',
      'Use the store filter ("All Stores") to see one branch on its own.',
    ],
    tip: 'Stock Alerts lists exactly which products are low. Click "View all" to jump to them.',
    keywords: ['dashboard', 'home', 'overview', 'kpi', 'widgets', 'today sales'],
  },
  {
    id: 'dashboard-quick-actions',
    category: 'Dashboard',
    question: 'What are the Quick Actions for?',
    answer: 'One-click shortcuts to the jobs people do most from the Dashboard.',
    steps: [
      '"New Sale" opens the POS register.',
      '"Add Product" goes straight to adding products.',
      '"View Reports" opens Reports.',
      '"Manage Stock" opens Inventory.',
    ],
    tip: 'You only see the shortcuts your role has permission to use.',
    keywords: ['shortcut', 'quick actions', 'new sale', 'manage stock'],
  },

  // ── Products ──────────────────────────────────────────────────────────
  {
    id: 'products-find',
    category: 'Products',
    question: 'How do I find a product quickly?',
    answer: 'Search by name, SKU or barcode, or click one of the cards at the top to filter.',
    path: 'Back Office → Products → Products',
    steps: [
      'Type in the search box. A scanned barcode works too.',
      'Click a card to filter: All products, Active, Inactive, No price here, Out of stock, or No photo.',
      'Narrow it further with Category, including "Uncategorized".',
      'Switch between the table and card layouts with the toggle beside Export.',
    ],
    tip: 'Click any column heading to sort, for example by Margin to find your thinnest-profit items.',
    keywords: ['search product', 'filter products', 'find item', 'catalog'],
  },
  {
    id: 'products-branch',
    category: 'Products',
    question: 'Why do price, margin and stock change when I switch branch?',
    answer: 'Prices and stock are kept per branch, so the list shows the figures of the branch you picked.',
    steps: [
      'Pick the Branch at the top of Products.',
      'Price, Margin, Stock and the "No price here" and "Out of stock" cards all follow that branch.',
    ],
    tip: 'Margin turns amber under 10% and red when you sell below cost.',
    keywords: ['branch', 'store price', 'margin color', 'red margin', 'per store'],
  },
  {
    id: 'products-export',
    category: 'Products',
    question: 'How do I export or print the product list?',
    answer: 'Use Export. It covers whatever you have filtered, for the branch you picked.',
    path: 'Back Office → Products → Export',
    steps: [
      'Filter or search first, if you only want part of the catalog.',
      'Click "Export".',
      'Spreadsheet: "Excel (.xlsx)" or "CSV".',
      'Print / PDF: "Product list" (with cost and margin, for internal use), "Price list" (selling prices only, safe for customers), or "Photo catalog".',
      'For a PDF, choose "Save as PDF" as the printer in the print window.',
    ],
    warning: 'The Product list and the Excel/CSV files include your cost prices. Send customers the Price list or Photo catalog instead.',
    keywords: ['export', 'excel', 'csv', 'pdf', 'print products', 'price list', 'catalog pdf'],
  },
  {
    id: 'products-details',
    category: 'Products',
    question: 'How do I see or edit a product\'s details?',
    answer: 'Click the product to open its details, with prices and stock at every branch.',
    steps: [
      'Click the row or card, or its "Open" icon.',
      'Use "Edit" to change the name, barcode, category, unit or photo.',
      'Turn "Active" off to hide it from the POS without losing its history.',
    ],
    tip: 'Deactivating is the safe way to retire a product. It keeps past sales and stock movements intact.',
    keywords: ['edit product', 'product details', 'deactivate', 'hide product', 'inactive'],
  },
  {
    id: 'products-lookup',
    category: 'Products',
    question: 'What is the Search Product tab for?',
    answer: 'A fast lookup for one product: scan or type it to see its details, prices and stock.',
    path: 'Back Office → Products → Search Product',
    keywords: ['lookup', 'price check', 'scan product', 'search product'],
  },
  {
    id: 'products-bulk-prices',
    category: 'Products',
    permissions: ['products.update'],
    question: 'How do I change many prices at once?',
    answer: 'Use Bulk Update Prices, either on screen or from a CSV file.',
    path: 'Back Office → Products → Bulk Update Prices',
    steps: [
      'Pick the branch and enter the new cost and selling prices on screen.',
      'Tick "Apply new prices to all stores" to use the same prices at every branch.',
      'Or click "Import Prices from CSV", download the template (columns sku, cost_price, selling_price), fill it in, and upload it.',
    ],
    tip: 'Any branch or product you leave untouched keeps its current price.',
    keywords: ['bulk price', 'mass update', 'import prices', 'price csv', 'price increase'],
  },
  {
    id: 'products-categories',
    category: 'Products',
    permissions: ['categories.view'],
    question: 'How do I manage categories?',
    answer: 'Categories group products on the POS, in reports and in exports.',
    path: 'Back Office → Products → Categories',
    steps: [
      'Add, rename or deactivate categories on the Categories tab.',
      'Assign a product\'s category when you add or edit it.',
    ],
    tip: 'Products with no category show as "Uncategorized". Filter for them on the Products tab to tidy up.',
    keywords: ['category', 'categories', 'group products', 'uncategorized'],
  },

  // ── Inventory ─────────────────────────────────────────────────────────
  {
    id: 'inventory-overview',
    category: 'Inventory',
    question: 'What does the Inventory page show?',
    answer: 'Stock on hand for one branch, with its value, plus every product\'s status.',
    path: 'Back Office → Inventory → Stock levels',
    steps: [
      'Pick the Branch at the top.',
      'Products tracked, Units on hand and Stock value (at cost, with selling-price value underneath) sum up that branch.',
      'Click "In stock", "Low stock" or "Out of stock" to list just those products. Click it again to clear.',
      'Click any product for its stock at every branch, its reorder level, and its recent movements.',
    ],
    tip: 'Only products with "Track Inventory" on appear here.',
    keywords: ['stock levels', 'stock on hand', 'inventory value', 'soh'],
  },
  {
    id: 'inventory-status',
    category: 'Inventory',
    question: 'When is a product "Low stock" or "Out of stock"?',
    answer: 'Out of stock means nothing on hand. Low stock means at or below its reorder level.',
    steps: [
      'In stock: above the reorder level.',
      'Low stock: at or below the reorder level.',
      'Out of stock: zero on hand.',
    ],
    keywords: ['low stock', 'out of stock', 'status', 'reorder'],
  },
  {
    id: 'inventory-reorder-level',
    category: 'Inventory',
    question: 'How do I set a reorder level?',
    answer: 'Set it per product and branch, from the product\'s stock panel.',
    path: 'Inventory → Stock levels → click a product',
    steps: ['Click the product.', 'Type the number under "Reorder level".', 'Click "Save".'],
    tip: 'Each branch can have its own level. A busy branch usually needs a higher one.',
    keywords: ['reorder level', 'minimum stock', 'reorder point', 'alert level'],
  },
  {
    id: 'inventory-count',
    category: 'Inventory',
    question: 'How do I do a stock count?',
    answer: 'Print a count sheet, count the shelf, then enter each result with "Set counted".',
    path: 'Inventory → Print / PDF → Count sheet',
    steps: [
      'Click "Print / PDF" and choose "Count sheet", or "Blind count sheet" to hide the system quantity from the counter.',
      'Count each product and write the number in the blank.',
      'Back in Inventory, click "Adjust stock" and choose "Set counted".',
      'Pick the product, type the counted quantity, choose the "Stock count" reason, and click "Save adjustment". The difference is worked out for you.',
    ],
    tip: 'A blind count gives a more honest number, because the counter cannot just copy what the system expects.',
    keywords: ['stock take', 'physical count', 'cycle count', 'count sheet', 'blind count', 'inventory count'],
  },
  {
    id: 'inventory-cannot-remove',
    category: 'Inventory',
    question: 'Why does it say "Can\'t remove more than is on hand"?',
    answer: 'Stock can never go below zero, so a removal larger than what is on hand is refused.',
    steps: [
      'Check whether a delivery or transfer that should have come in was never recorded.',
      'Record that first, or use "Set counted" with the real count instead.',
    ],
    keywords: ['negative stock', 'cannot remove', 'error adjust', 'below zero'],
  },
  {
    id: 'inventory-print',
    category: 'Inventory',
    question: 'How do I print or save an inventory report as PDF?',
    answer: 'Use "Print / PDF" on the Stock levels tab, then choose "Save as PDF" in the print window.',
    steps: [
      '"Stock report": on hand, status and value at cost.',
      '"Count sheet": system quantity with blanks to fill in.',
      '"Blind count sheet": the same, without the system quantity.',
    ],
    tip: 'The printout follows your current filters, so filter to "Low stock" first for a quick reorder list.',
    keywords: ['print inventory', 'pdf', 'stock report', 'inventory report'],
  },
  {
    id: 'inventory-movements',
    category: 'Inventory',
    question: 'How do I see the stock history?',
    answer: 'The Movements tab lists every change to stock, newest first.',
    path: 'Back Office → Inventory → Movements',
    steps: [
      'It opens on the last 30 days. Change "From" and "To" for another period.',
      'Filter by Branch or Type: Purchase, Sale, Return, Transfer in, Transfer out, or Adjustment.',
      'Each row shows the change, the balance after, the reference (like a PO or invoice) and who did it.',
    ],
    keywords: ['movements', 'stock history', 'ledger', 'stock card'],
  },
  {
    id: 'inventory-scan',
    category: 'Inventory',
    question: 'Can I use a barcode scanner on the Inventory page?',
    answer: 'Yes. Scan a product barcode anywhere on Stock levels to open that product.',
    keywords: ['scanner', 'barcode', 'scan product'],
  },

  // ── Purchasing ────────────────────────────────────────────────────────
  {
    id: 'po-statuses',
    category: 'Purchasing',
    question: 'What do the purchase order statuses mean?',
    answer: 'Draft, then Approved, then Received. Cancelled stops it.',
    path: 'Back Office → Purchasing → Purchase Orders',
    steps: [
      'Draft: still being prepared, and the only status you can edit or delete.',
      'Approved: confirmed and waiting for the goods.',
      'Received: the stock has been added to inventory. This cannot be undone.',
      'Cancelled: stopped before receiving. Stock never changed.',
    ],
    tip: 'Click a status card at the top to list only those orders.',
    keywords: ['po status', 'draft', 'approved', 'received', 'cancelled'],
  },
  {
    id: 'po-edit',
    category: 'Purchasing',
    question: 'How do I edit, duplicate or delete a purchase order?',
    answer: 'Only a draft can be edited or deleted. Any order can be duplicated.',
    steps: [
      'Open the order.',
      'Draft: click "Edit" to change it, or "Delete draft" to remove it.',
      '"Duplicate" starts a new draft with the same supplier and items. It is handy for repeat orders.',
    ],
    tip: 'Need to change an approved order? Cancel it, duplicate it, and edit the copy.',
    keywords: ['edit po', 'delete po', 'copy po', 'repeat order', 'duplicate'],
  },
  {
    id: 'po-print',
    category: 'Purchasing',
    question: 'How do I print a purchase order or save it as PDF?',
    answer: 'Open the order and click "Print / Save PDF", or use the printer icon on its row.',
    steps: ['In the print window, pick your printer, or "Save as PDF" to email it to the supplier.'],
    tip: 'The printout carries the PO number as a barcode, so receiving staff can scan it to pull the order up.',
    keywords: ['print po', 'po pdf', 'send po to supplier'],
  },
  {
    id: 'po-scan',
    category: 'Purchasing',
    question: 'How do I find a purchase order by scanning it?',
    answer: 'Scan the barcode on a printed PO anywhere on the Purchase Orders page, and it opens.',
    steps: [
      'Scan the barcode with no box selected.',
      'Or type the full PO number in the search box and press Enter.',
    ],
    keywords: ['scan po', 'po barcode', 'find po', 'lookup purchase order'],
  },
  {
    id: 'po-supplier-picker',
    category: 'Purchasing',
    question: 'How do I pick or add a supplier on an order?',
    answer: 'Type in the Supplier box to search by name, contact person, phone or email.',
    steps: [
      'With the box empty, the suppliers you ordered from recently are listed first.',
      'Not found? Choose "Add a new supplier" at the bottom of the list. You only need the name to start.',
    ],
    tip: 'Fill in the address and TIN later under Purchasing → Suppliers. Adding suppliers needs the suppliers-manage permission.',
    keywords: ['supplier', 'vendor', 'add supplier', 'search supplier'],
  },
  {
    id: 'po-late',
    category: 'Purchasing',
    question: 'What does the red "Late" tag mean?',
    answer: 'The expected delivery date has passed and the order still has not been received.',
    tip: 'Call the supplier, then either receive the order when it comes or cancel it.',
    keywords: ['late', 'overdue', 'expected delivery', 'delayed'],
  },
  {
    id: 'po-no-tax',
    category: 'Purchasing',
    question: 'Why is there no tax on purchase orders?',
    answer: 'A purchase order totals quantity times unit cost. Enter the unit cost exactly as the supplier bills it.',
    keywords: ['tax', 'vat', 'po total', 'input vat'],
  },
  {
    id: 'suppliers-manage',
    category: 'Purchasing',
    permissions: ['suppliers.view'],
    question: 'How do I add or update a supplier?',
    answer: 'Keep the full supplier record on the Suppliers tab.',
    path: 'Back Office → Purchasing → Suppliers',
    steps: [
      'Click "Add supplier" (top right), or the edit icon on an existing row.',
      'Fill in the name, contact person, phone, email, TIN and address.',
      'Stopped ordering from them? Open the supplier and click "Deactivate". They stop showing when picking a supplier, and past orders stay.',
    ],
    warning: 'A supplier with purchase orders can\'t be deleted, only deactivated, so their order history is never lost. Delete only appears for a supplier nothing was ever ordered from.',
    keywords: ['supplier list', 'vendor', 'edit supplier', 'delete supplier', 'deactivate supplier'],
  },
  {
    id: 'suppliers-overview',
    category: 'Purchasing',
    permissions: ['suppliers.view'],
    question: 'What do the cards on the Suppliers page mean?',
    answer: 'They show who you\'re waiting on and who you buy from. Click one to list just those suppliers.',
    path: 'Back Office → Purchasing → Suppliers',
    steps: [
      'Open orders: suppliers with a draft or approved order not yet received, and what those orders are worth.',
      'Ordered recently: ordered from in the last 90 days.',
      'Dormant: ordered from before, but not in 90 days.',
      'Never ordered: no purchase order yet.',
      'Received this month: the value of orders received since the 1st.',
    ],
    tip: 'Sort by Received to see your biggest suppliers. Export gives Excel, CSV, or a printable Supplier list.',
    keywords: ['supplier cards', 'open orders', 'dormant supplier', 'top suppliers', 'export suppliers'],
  },
  {
    id: 'suppliers-order',
    category: 'Purchasing',
    permissions: ['purchases.view'],
    question: 'How do I order from a supplier, or see everything I\'ve ordered from them?',
    answer: 'Open the supplier. It shows their recent orders, with buttons to start a new one or see them all.',
    steps: [
      'Click the supplier on the Suppliers tab.',
      '"New purchase order" opens the order form with this supplier already picked.',
      '"View all orders" switches to Purchase Orders, filtered to this supplier.',
    ],
    keywords: ['order from supplier', 'supplier orders', 'supplier history', 'new po'],
  },

  // ── Customers ─────────────────────────────────────────────────────────
  {
    id: 'customer-add',
    category: 'Customers',
    question: 'How do I add a customer?',
    answer: 'Customer records let you see who buys, how often they come back, and their loyalty points.',
    path: 'Back Office → Customers',
    steps: [
      'Click "Add customer" (top right).',
      'Enter First Name and Last Name, plus Mobile, Email and Address if you have them. The Customer No is made for you.',
      'Click "Add customer" to save.',
    ],
    tip: 'Attach the customer to sales at the POS, so their visits, spend and last visit fill in.',
    keywords: ['new customer', 'member', 'loyalty member', 'customer record'],
  },
  {
    id: 'customer-cards',
    category: 'Customers',
    question: 'What do the cards on the Customers page mean?',
    answer: 'They count your customers by how they buy. Click one to list just those customers.',
    path: 'Back Office → Customers',
    steps: [
      'New this month: added since the 1st.',
      'Lapsed: bought before, but no visit in 90 days. Good people to follow up with.',
      'Never bought: no sale has been linked to them yet.',
      'With points: they have loyalty points to spend (only when loyalty is on).',
    ],
    tip: 'Export the Lapsed list to CSV or Excel for a text or email campaign.',
    keywords: ['lapsed', 'segments', 'new customers', 'inactive customers', 'follow up', 'cards'],
  },
  {
    id: 'customer-details',
    category: 'Customers',
    question: 'How do I see a customer\'s history?',
    answer: 'Click the customer to open their details: contact, visits, total spent, recent purchases and points.',
    steps: [
      'Click the row, or scan their loyalty card anywhere on the page.',
      'Use "Edit details" to update them, or "Deactivate" to retire the record.',
    ],
    tip: 'Spent is after refunds: what they bought, minus anything returned. The details show both figures.',
    keywords: ['customer history', 'purchases', 'visits', 'spent', 'customer profile'],
  },
  {
    id: 'customer-export',
    category: 'Customers',
    question: 'How do I export or print the customer list?',
    answer: 'Use Export: Excel, CSV, or a printable Customer list (Save as PDF).',
    steps: ['Filter first (a card, the Status, or a search) to export just those customers.', 'Click "Export" and pick a format.'],
    keywords: ['export customers', 'customer csv', 'customer excel', 'print customers', 'pdf'],
  },
  {
    id: 'customer-points',
    category: 'Customers',
    question: 'How do I add or remove loyalty points?',
    answer: 'Open the customer and use the Loyalty points section. Every change is kept in their history.',
    steps: [
      'Click the customer to open their details.',
      'Under Loyalty points, enter the amount in "Add or remove". Use a minus sign to remove, e.g. -20.',
      'Add a note explaining why, and click "Update points".',
    ],
    keywords: ['points', 'loyalty', 'rewards', 'points history'],
  },
  {
    id: 'returns-history',
    category: 'Returns',
    permissions: ['returns.view'],
    question: 'Where do I see past returns and refunds?',
    answer: 'Back Office → Returns is the history of every return, from any sale. Returns themselves are done at the POS.',
    path: 'Back Office → Returns',
    steps: [
      'The cards at the top total what was refunded, split into cash and non-cash, and the units that went back to stock. They follow the dates and branch you pick.',
      'Click a Top reason to list just those returns. Filter by Refund by, or search a return number, invoice or reason.',
      'Scan a customer\'s receipt to find its returns.',
      'Click a return for its items, who processed and approved it, and "Print / Save PDF" for a signed slip.',
      'Use "Export" for Excel, CSV, or a printable Returns report.',
    ],
    tip: 'Cash refunds also appear as "Cash Refunds" on that cashier\'s drawer session in Cash Drawers.',
    keywords: ['return history', 'refund history', 'returns list', 'who approved return'],
  },
  {
    id: 'return-blocked',
    category: 'Returns',
    question: 'Why can\'t I return this sale?',
    answer: 'The POS checks a few things before it lets a return through.',
    steps: [
      'The sale must be from this branch. Return it at the branch that sold it.',
      'Items already fully returned show as "Returned" and can\'t be returned again.',
      'Your POS terminal must be open, since a cash refund comes out of your drawer.',
      'The approver must have return-approval rights and work at this branch. A cashier can\'t approve their own return.',
      'A non-cash refund must go back by a method the sale was actually paid with.',
    ],
    keywords: ['cannot return', 'return error', 'other branch', 'not authorized return', 'already returned'],
  },
  {
    id: 'return-drawer-reading',
    category: 'Returns',
    question: 'How do refunds show in my drawer and the Z-Reading?',
    answer: 'A cash refund lowers your Expected Cash. Every refund appears on the terminal\'s X/Z Reading under "Returns".',
    steps: [
      'Close POS Terminal shows a "Cash Refunds" line, already taken out of Expected Cash.',
      'A GCash, card or other non-cash refund doesn\'t touch the drawer.',
      'The X/Z Reading counts the refund on the terminal that handed it out, even if another counter made the sale.',
    ],
    tip: 'Back Office → Cash Drawers shows the same "Cash Refunds" line for each session.',
    keywords: ['cash refunds', 'expected cash', 'z reading returns', 'drawer short', 'refund drawer'],
  },

  // ── Cash Drawer (Back Office) ─────────────────────────────────────────
  {
    id: 'drawer-sessions',
    category: 'Cash Drawer',
    permissions: ['cash-sessions.view'],
    question: 'How do I check a cashier\'s drawer after a shift?',
    answer: 'Cash Drawers lists every session with its opening, counted cash and difference.',
    path: 'Back Office → Cash Drawers',
    steps: [
      'Use "View" to show Open or Closed sessions, and filter by terminal.',
      'Compare "Counted" with what was expected. "Difference" shows any over or short.',
      'Open a session for the breakdown: Opening Cash, Cash Sales, Cash In, Cash Out, Expected Cash and Counted Cash.',
    ],
    keywords: ['drawer session', 'over short', 'cash difference', 'shift report'],
  },
  {
    id: 'cash-in-out',
    category: 'Cash Drawer',
    permissions: ['cash-sessions.view'],
    question: 'How do I record cash taken out or put in the drawer?',
    answer: 'Record it as a movement, so the expected cash at closing stays right.',
    steps: [
      'Open the drawer session and click "Record a Movement".',
      'Pick "Cash In" (like extra change) or "Cash Out" (like a pickup or a payout), enter the amount and the reason, and save.',
    ],
    warning: 'Cash moved without being recorded shows up as a difference when the shift closes.',
    keywords: ['cash in', 'cash out', 'pickup', 'payout', 'petty cash', 'change fund'],
  },
  {
    id: 'past-z-readings',
    category: 'Cash Drawer',
    permissions: ['readings.view'],
    question: 'Where do I find past Z-Readings?',
    answer: 'Every issued Z-Reading is kept under "Issued Z-Readings" and can be reopened and reprinted.',
    path: 'Back Office → Cash Drawers → X/Z Readings',
    steps: ['Filter by Terminal if you need one register.', 'Click a reading to view or print it again.'],
    keywords: ['z reading history', 'reprint z reading', 'old reading', 'bir reading'],
  },

  // ── Reports ───────────────────────────────────────────────────────────
  {
    id: 'reports-overview',
    category: 'Reports',
    question: 'Which report should I use?',
    answer: 'Reports has four tabs: Sales, Discounts, Inventory and Audit Trail.',
    path: 'Back Office → Reports',
    steps: [
      'Sales: Summary, Daily trend, Monthly trend, By branch, By cashier, By bagger, Top products, By category, Payment methods, VAT summary and Sales Book (BIR).',
      'Discounts: By discount type, By cashier, SC / PWD register, and Manual discounts.',
      'Inventory: Valuation, Current stock, Low stock, Movement summary, Adjustments and Transfers.',
      'Audit Trail: who did what, and when.',
    ],
    tip: 'Pick a report from the chips at the top, then the branch and dates (presets like Today, This month or Last month). Every report has Export: Excel, CSV, or a printable PDF with totals.',
    keywords: ['reports', 'sales report', 'which report', 'analytics'],
  },
  {
    id: 'reports-bir',
    category: 'Reports',
    question: 'Where are the BIR reports?',
    answer: 'The Sales Book and the SC / PWD Register are both under Reports.',
    steps: [
      'Sales tab → "Sales Book (BIR)" for the per-invoice sales book. Download it as CSV.',
      'Discounts tab → "SC / PWD Register" for senior citizen and PWD discounts, with names and ID numbers.',
      'For daily readings, see Cash Drawers → X/Z Readings.',
    ],
    keywords: ['bir', 'sales book', 'sc pwd register', 'senior register', 'compliance'],
  },
  {
    id: 'reports-audit',
    category: 'Reports',
    permissions: ['audit.view'],
    question: 'How do I find out who changed something?',
    answer: 'The Audit Trail records changes, voids, cancellations and approvals with the user and time.',
    path: 'Back Office → Reports → Audit Trail',
    keywords: ['audit', 'who changed', 'log', 'history', 'void log'],
  },

  // ── Team & Access ─────────────────────────────────────────────────────
  {
    id: 'add-user',
    category: 'Team & Access',
    question: 'How do I add a user?',
    answer: 'Create their account with a role and the branch they work in.',
    path: 'Back Office → Team → Users',
    steps: [
      'Click "Add User".',
      'Enter Name, Username and Phone, then pick a Role and a Store (shown with its code).',
      'Set a starting password of at least 8 characters, and save.',
    ],
    tip: 'Use the Role filter on the Users list to see everyone with a given role.',
    keywords: ['new user', 'add cashier', 'create account', 'employee'],
  },
  {
    id: 'store-access',
    category: 'Team & Access',
    question: 'How do I let a user work at more than one branch?',
    answer: 'Give them extra branches with the "Store Access" icon on their row.',
    keywords: ['multi store', 'branch access', 'store access', 'other branch'],
  },
  {
    id: 'roles-permissions',
    category: 'Team & Access',
    permissions: ['roles.view'],
    question: 'How do roles and permissions work?',
    answer: 'A role is a set of permissions. Everyone with that role gets exactly those permissions.',
    path: 'Back Office → Team → Roles',
    steps: [
      'Open a role\'s "Permissions" to see or change what it allows.',
      'Use "Add Role" for a custom role, like a stock clerk who only does Inventory.',
    ],
    warning: 'Built-in "System" roles are shared defaults. Change a copy instead of the original if you only want to affect some people.',
    keywords: ['role', 'permission', 'access rights', 'restrict', 'custom role'],
  },

  // ── Settings ──────────────────────────────────────────────────────────
  {
    id: 'setup-guide',
    category: 'Settings',
    permissions: ['stores.view', 'registers.view', 'payment-methods.view', 'invoice-series.view', 'taxes.view', 'units.view', 'companies.manage'],
    question: 'Where do I start when setting up?',
    answer: 'The Setup Guide walks through everything a new company needs, in order.',
    path: 'Back Office → Settings → Setup Guide',
    keywords: ['setup', 'getting started', 'onboarding', 'first time'],
  },
  {
    id: 'opening-cash-mode',
    category: 'Settings',
    permissions: ['stores.view'],
    question: 'How do I set how a terminal\'s opening cash starts?',
    answer: 'Each branch picks one of three ways, and a terminal can override it.',
    path: 'Back Office → Settings → Stores → Opening cash',
    steps: [
      '"Cashier enters it": the cashier counts and types the opening cash.',
      '"Automatic": opens with the set float, with no screen at all.',
      '"Automatic, with confirm": shows the set float and the cashier taps once to start.',
    ],
    keywords: ['opening float', 'opening cash', 'starting cash', 'change fund'],
  },
  {
    id: 'training-mode',
    category: 'Settings',
    permissions: ['registers.view'],
    question: 'What is Training mode on a POS terminal?',
    answer: 'Sales on that terminal become practice only and never count.',
    path: 'Back Office → Settings → POS Terminals → Edit',
    steps: [
      'Receipts are stamped TRAINING and get a TRN- number instead of a real invoice number.',
      'They are left out of every total, report and X/Z reading.',
    ],
    warning: 'Turn it off before the terminal takes real money.',
    keywords: ['training', 'practice', 'test sale', 'demo mode'],
  },
  {
    id: 'security-approvals',
    category: 'Settings',
    permissions: ['companies.manage'],
    question: 'How do I require a supervisor to approve voids or returns?',
    answer: 'Turn on the approvals you want under Settings → Security.',
    path: 'Back Office → Settings → Security',
    steps: [
      '"Voiding a single item": recommended off, since mis-scans are frequent.',
      '"Cancelling an entire sale": recommended on.',
      '"Returns and replacements": recommended on, since a refund hands money back.',
    ],
    tip: 'Either way the cashier picks a reason, and every void and cancellation is recorded in the Audit Trail.',
    keywords: ['supervisor approval', 'void approval', 'cancel approval', 'override'],
  },
  {
    id: 'idle-lock',
    category: 'Settings',
    permissions: ['companies.manage'],
    question: 'How do I make the POS lock itself when left idle?',
    answer: 'Set "Lock after" in minutes under Settings → Security. Use 0 to turn it off.',
    tip: 'Cashiers can always lock the screen themselves from the account menu.',
    keywords: ['auto lock', 'idle', 'screen lock', 'timeout'],
  },
  {
    id: 'tax-settings',
    category: 'Settings',
    permissions: ['taxes.view', 'companies.manage'],
    question: 'Why can\'t I change the tax rates?',
    answer: 'Tax rates affect every invoice, so only a few roles can manage them. Everyone else can only view them.',
    path: 'Back Office → Settings → Tax',
    tip: 'Ask your system administrator if a rate needs to change.',
    keywords: ['tax', 'vat rate', 'tax rate', 'cannot edit tax'],
  },
  {
    id: 'payment-methods',
    category: 'Settings',
    permissions: ['payment-methods.view'],
    question: 'How do I add a payment method like GCash or a card?',
    answer: 'Add it under Payment Methods. Active methods appear on the POS payment screen.',
    path: 'Back Office → Settings → Payment Methods',
    keywords: ['gcash', 'maya', 'card', 'payment type', 'e-wallet'],
  },
];
