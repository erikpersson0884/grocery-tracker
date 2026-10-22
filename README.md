# Grocery tracker

Upload Willys self-scan receipt PDFs and see which groceries you spend the most on.
Everything runs in your browser; data is stored locally in IndexedDB. No server, no AI, no network calls.

    npm install
    npm run dev

Open the printed localhost URL. Use "Export backup" on the Receipts page now and then,
since clearing browser data deletes the database.

Where things live:
- src/parsing/willys.ts   receipt parser (regex), checks item sum and count against the totals
- src/categorize.ts       keyword lists; edit these to improve automatic categories
- Corrections you make on the review screen are remembered and win over keywords next time
