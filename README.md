# ניצוץ

מוצר SaaS שמייצר ליוצרי תוכן ואושיות רשת רעיונות תוכן יומיים מותאמים אישית, בהתבסס על פרופיל אישי, תאריך עברי אמיתי (Hebcal API) ומנוע AI (OpenAI).

## הרצה מקומית

1. התקנת תלויות:

   ```bash
   npm install
   ```

2. יצירת קובץ סביבה:

   ```bash
   cp .env.example .env.local
   ```

   ומילוי `OPENAI_API_KEY`. `DATA_DIR` כברירת מחדל מצביע לתיקיית `./data` המקומית.

3. הרצת שרת הפיתוח:

   ```bash
   npm run dev
   ```

4. פתיחת [http://localhost:3000](http://localhost:3000) בדפדפן.

## סטאק

- **Next.js** (App Router) + **TypeScript**
- **SQLite** (`node:sqlite`) עם דפוס Lazy Proxy לאתחול עצל — ראו `lib/db.ts`
- משתנה `DATA_DIR` קובע איפה נשמר קובץ ה-DB (בפרודקשן ב-Render: נתיב ה-Persistent Disk)
- תמיכה מלאה ב-RTL ועברית מוגדרת גלובלית ב-`app/layout.tsx`
