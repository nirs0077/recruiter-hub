import { Briefcase, Users, UserCheck, Settings, Send, ListChecks, Star, ArrowLeft, CheckCircle2, AlertCircle, LayoutDashboard } from "lucide-react";

interface Section {
  icon: typeof Briefcase;
  title: string;
  color: string;
  bg: string;
  steps: { title: string; desc: string }[];
}

const sections: Section[] = [
  {
    icon: LayoutDashboard,
    title: "לוח בקרה",
    color: "text-blue-600",
    bg: "bg-blue-50",
    steps: [
      { title: "סקירה מהירה", desc: "לוח הבקרה מציג נתוני מפתח: סה\"כ מועמדים, ממתינים לבדיקה, נשלחו ל-CIVI, ציון ממוצע." },
      { title: "מועמדים לפי קבלן", desc: "ניתן לראות כמה מועמדים כל קבלן הגיש ואיך הם מתפלגים לפי סטטוס." },
    ],
  },
  {
    icon: Briefcase,
    title: "ניהול משרות",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    steps: [
      { title: "הוספת משרה", desc: "הדבק URL של משרה ממקום העבודה — AI מחלץ אוטומטית כותרת, מיקום וסוג העסקה." },
      { title: "שיוך קבלנים", desc: "לחץ 'שייך קבלן' על כל משרה כדי לבחור אילו קבלנים יוכלו להגיש מועמדים אליה. הקבלן מקבל מייל עם לינק הגשה." },
      { title: "סטטוס משרה", desc: "שנה סטטוס משרה: פעיל / מוקפא / סגור. קבלנים רואים רק משרות פעילות." },
      { title: "ספירת מועמדים", desc: "בכל כרטיס משרה מוצג מספר המועמדים שהוגשו עד כה." },
    ],
  },
  {
    icon: Users,
    title: "ניהול קבלנים",
    color: "text-purple-600",
    bg: "bg-purple-50",
    steps: [
      { title: "הוספת קבלן", desc: "שלח הזמנה בדואר — הקבלן מקבל לינק הרשמה ייחודי ויוצר סיסמא." },
      { title: "צפייה בפעילות", desc: "לחץ על קבלן לראות את כל המשרות ומועמדיו, עם ציונים וסטטוסים." },
      { title: "התחברות כקבלן", desc: "כפתור 'כנס כקבלן' מאפשר לראות את המערכת מנקודת מבט הקבלן לצרכי תמיכה." },
    ],
  },
  {
    icon: UserCheck,
    title: "סקירת מועמדים",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    steps: [
      { title: "חיפוש וסינון", desc: "חפש מועמד לפי שם, סנן לפי משרה, קבלן, סטטוס או ציון. ניתן לייצא לCSV." },
      { title: "פרופיל מועמד", desc: "לחץ על מועמד לצפייה בניתוח AI המלא: סיכום, חוזקות, פערים, המלצה וציון." },
      { title: "עדכון סטטוס", desc: "שנה סטטוס מועמד, הוסף הערה ותאריך יעד. כל שינוי נרשם בהיסטוריית הסטטוס." },
      { title: "קורות חיים", desc: "אם הועלו ל-Google Drive, ניתן לפתוח קורות חיים ישירות מפרופיל המועמד." },
    ],
  },
  {
    icon: Star,
    title: "סטטוסים — רשימה מלאה",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    steps: [
      { title: "ממתין", desc: "מועמד חדש — עבר ניתוח AI אך טרם נסקר." },
      { title: "לא ענה / בבדיקה / מועמד מוכר", desc: "סטטוסי ביניים לניהול תהליך הסינון." },
      { title: "בקשה לשליחה אל CIVI", desc: "הסטטוס החשוב — מאפשר לקבלן לשלוח את המועמד. נפתחת משימה אוטומטית לקבלן." },
      { title: "בוצעה שליחה אל CIVI", desc: "הקבלן שלח את המועמד. מייל נשלח ל-talents@connectech.co.il." },
      { title: "נשלח לפגישה ← ראיון ← חוזה ← התחיל לעבוד", desc: "שלבי גיוס מתקדמים — לאחר אישור CIVI." },
      { title: "חלש / נדחה", desc: "מועמד שלא מתאים — מוסר מתהליך הגיוס." },
    ],
  },
  {
    icon: Send,
    title: "תהליך שליחה לCIVI",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    steps: [
      { title: "שלב 1 — בקשת שליחה", desc: "בדף מועמד, שנה סטטוס ל'בקשה לשליחה אל CIVI'. ציון המועמד חייב לעבור את סף CIVI שהוגדר בהגדרות." },
      { title: "שלב 2 — הקבלן מקבל משימה", desc: "אוטומטית נפתחת משימה לקבלן עם תאריך יעד של מחר ומייל התראה." },
      { title: "שלב 3 — הקבלן שולח", desc: "הקבלן פותח את חלון CIVI, מוסיף הערה ו/או קובץ, ושולח." },
      { title: "שלב 4 — תיעוד", desc: "הסטטוס משתנה אוטומטית. המייל שנשלח נשמר ומוצג בפרופיל המועמד." },
    ],
  },
  {
    icon: ListChecks,
    title: "משימות",
    color: "text-green-600",
    bg: "bg-green-50",
    steps: [
      { title: "משימות מערכת", desc: "הלשונית 'משימות מערכת' מציגה משימות שנוצרו אוטומטית מסטטוסים (כמו 'שלח לCIVI')." },
      { title: "משימות ידניות", desc: "צור משימה אישית עם אפשרות לשיוך לקבלן ספציפי, תאריך יעד והערות." },
      { title: "מעקב", desc: "כל המשימות ניתנות לניהול: ממתין → בביצוע → הסתיים / בוטל." },
    ],
  },
  {
    icon: Settings,
    title: "הגדרות המערכת",
    color: "text-gray-600",
    bg: "bg-gray-50",
    steps: [
      { title: "סף ניקוד מועמד", desc: "ציון מינימלי (0-100) לקבלת מועמד לסינון. מועמדים מתחת לסף יסומנו 'חלש' אוטומטית." },
      { title: "סף שליחה לCIVI", desc: "ציון מינימלי לשליחת מועמד ל-CIVI. הקבלן לא יוכל לשלוח מועמד מתחת לסף זה." },
      { title: "Google Drive", desc: "הכנס מזהה תיקיית Google Drive לאחסון קורות חיים. קורות חיים שיועלו ישמרו שם אוטומטית." },
    ],
  },
];

export default function AdminGuide() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-l from-indigo-600 to-purple-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">מדריך למשתמש — מנהל</h1>
        <p className="text-indigo-100 text-sm">כל מה שצריך לדעת לניהול מלא של מערכת RecruiterHub</p>
      </div>

      {/* Flow summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-4">תהליך הגיוס בקצרה</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {[
            { label: "הוסף משרה", color: "bg-blue-100 text-blue-700" },
            { label: "שייך קבלן", color: "bg-blue-100 text-blue-700" },
            { label: "מועמד מוגש + AI", color: "bg-purple-100 text-purple-700" },
            { label: "סקור וסנן", color: "bg-yellow-100 text-yellow-700" },
            { label: "בקש שליחה לCIVI", color: "bg-amber-100 text-amber-700" },
            { label: "הקבלן שולח", color: "bg-indigo-100 text-indigo-700" },
            { label: "גיוס הושלם", color: "bg-green-100 text-green-700" },
          ].map((step, i, arr) => (
            <span key={i} className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-full font-medium ${step.color}`}>{step.label}</span>
              {i < arr.length - 1 && <ArrowLeft size={14} className="text-gray-300 shrink-0" />}
            </span>
          ))}
        </div>
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.title} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className={`px-5 py-3.5 flex items-center gap-3 border-b border-gray-100 ${section.bg}`}>
            <section.icon size={18} className={section.color} />
            <h2 className={`font-bold text-base ${section.color}`}>{section.title}</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {section.steps.map((step, i) => (
              <div key={i} className="px-5 py-3.5 flex gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${section.bg} ${section.color}`}>
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{step.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2 font-bold text-blue-800">
          <AlertCircle size={16} />
          טיפים לניהול יעיל
        </div>
        <ul className="space-y-1.5 text-sm text-blue-700">
          <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" />הגדר את סף ה-CIVI בהגדרות לפני שמתחילים — כברירת מחדל זה 80%.</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" />הוסף תאריך יעד בעת שינוי סטטוס — זה יוצר משימה אוטומטית לקבלן.</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" />השתמש בהערה לכל שינוי סטטוס — ההיסטוריה המלאה נשמרת ונראית לכל.</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" />כנס כקבלן (בדף קבלן) כדי לוודא שהחוויה שלהם תקינה.</li>
        </ul>
      </div>
    </div>
  );
}
