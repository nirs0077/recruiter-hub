import type { LucideIcon } from "lucide-react";
import { Briefcase, UserCheck, Send, ListChecks, Star, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

interface Section {
  icon: LucideIcon;
  title: string;
  color: string;
  bg: string;
  steps: { title: string; desc: string }[];
}

const sections: Section[] = [
  {
    icon: Briefcase,
    title: "המשרות שלי",
    color: "text-blue-600",
    bg: "bg-blue-50",
    steps: [
      { title: "צפייה במשרות", desc: "בעמוד הבית תראה את כל המשרות שהאדמין שייך אליך. לחץ על משרה לפרטים נוספים." },
      { title: "לינק הגשה", desc: "בכל משרה יש לינק ייחודי לשליחת קורות חיים. שלח את הלינק למועמדים — הם ממלאים פרטים ומעלים קורות חיים." },
      { title: "ניתוח AI אוטומטי", desc: "המערכת מנתחת כל קורות חיים שמוגשים ומשייכת ציון התאמה (0-100%) בתוך דקות." },
    ],
  },
  {
    icon: UserCheck,
    title: "המועמדים שלי",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    steps: [
      { title: "רשימת מועמדים", desc: "בעמוד 'המועמדים שלי' תראה את כל המועמדים שהגישו קורות חיים דרכך, עם ציון, סטטוס ופרטים בסיסיים." },
      { title: "פרופיל מועמד", desc: "לחץ על מועמד לפרטים מלאים: ניתוח AI, חוזקות, פערים, המלצה, ורקע מקצועי." },
      { title: "פנייה למועמד", desc: "לחץ על שם המועמד ברשימה → נפתח פרופיל מלא. בחלק העליון של הפרופיל תמצא כפתורי 'שלח WhatsApp', 'שלח מייל' ו'קורות חיים (Drive)'. הכפתורים יופיעו רק אם המועמד מילא טלפון / מייל בעת הגשת הקורות חיים." },
    ],
  },
  {
    icon: Star,
    title: "סטטוסים — מה כל אחד אומר",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    steps: [
      { title: "ממתין", desc: "קורות חיים הוגשו והמערכת בדקה — המועמד ממתין לסקירה." },
      { title: "בבדיקה / לא ענה / מועמד מוכר", desc: "האדמין עדכן את הסטטוס בהתאם למצב." },
      { title: "בקשה לשליחה אל CIVI", desc: "האדמין אישר לשלוח את המועמד למערכת CIVI — תתקבל משימה אוטומטית עם כפתור שליחה." },
      { title: "בוצעה שליחה אל CIVI", desc: "שלחת את המועמד בהצלחה. הסטטוס מתעדכן אוטומטית." },
    ],
  },
  {
    icon: Send,
    title: "שליחה למערכת CIVI",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    steps: [
      { title: "מתי ניתן לשלוח?", desc: "רק כשהאדמין הגדיר את הסטטוס ל'בקשה לשליחה אל CIVI' וציון המועמד עובר את הסף שנקבע." },
      { title: "איך שולחים?", desc: "לחץ 'שלח לCIVI' בדף המועמד. ייפתח חלון עם נושא המייל, שדה להערת סוכן, ואפשרות לצרף קובץ (PDF, Word, תמונה)." },
      { title: "מה קורה אחרי השליחה?", desc: "מייל נשלח ל-talents@connectech.co.il עם פרטי המועמד. הסטטוס משתנה אוטומטית ל'בוצעה שליחה'." },
      { title: "שליחה כפולה", desc: "לאחר שליחה מוצלחת, הכפתור נעלם — לא ניתן לשלוח שוב את אותו מועמד." },
    ],
  },
  {
    icon: ListChecks,
    title: "משימות",
    color: "text-green-600",
    bg: "bg-green-50",
    steps: [
      { title: "משימות אוטומטיות", desc: "כשאדמין מסמן מועמד לCIVI — נפתחת משימה אוטומטית עם תאריך יעד של יום המחרת. לחץ 'שלח לCIVI' ישירות מהמשימה." },
      { title: "משימות ידניות", desc: "לחץ 'משימה חדשה' ליצירת משימה אישית עם כותרת, הערות ותאריך יעד." },
      { title: "עדכון סטטוס", desc: "כל משימה ניתן להעביר: ממתין → בביצוע → הסתיים / בוטל." },
      { title: "איחור", desc: "משימות שעבר תאריך היעד שלהן מסומנות באדום." },
    ],
  },
];

export default function ContractorGuide() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-gradient-to-l from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">מדריך למשתמש — סוכן</h1>
        <p className="text-blue-100 text-sm">כל מה שצריך לדעת כדי לעבוד עם מערכת RecruiterHub</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-4">תהליך העבודה בקצרה</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {[
            { label: "קבל משרה מאדמין", color: "bg-blue-100 text-blue-700" },
            { label: "שלח לינק למועמדים", color: "bg-blue-100 text-blue-700" },
            { label: "AI מנתח אוטומטית", color: "bg-purple-100 text-purple-700" },
            { label: "אדמין מאשר לCIVI", color: "bg-amber-100 text-amber-700" },
            { label: "שלח מועמד לCIVI", color: "bg-indigo-100 text-indigo-700" },
            { label: "סיים!", color: "bg-green-100 text-green-700" },
          ].map((step, i, arr) => (
            <span key={i} className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-full font-medium ${step.color}`}>{step.label}</span>
              {i < arr.length - 1 && <ArrowLeft size={14} className="text-gray-300 shrink-0" />}
            </span>
          ))}
        </div>
      </div>

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

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-800">
          <AlertCircle size={16} />
          טיפים חשובים
        </div>
        <ul className="space-y-1.5 text-sm text-amber-700">
          <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" />שמור על הלינק ייחודי לכל משרה — הוא מזהה אותך כסוכן המגיש.</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" />ניתן לצרף קורות חיים בעת שליחה לCIVI — מומלץ לצרף קובץ PDF מעודכן.</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" />שים לב למשימות באיחור — הן מסומנות באדום ומצריכות טיפול.</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" />הוסף הערת סוכן בחלון CIVI — הערות מפורטות מגדילות את סיכויי קבלת המועמד.</li>
        </ul>
      </div>
    </div>
  );
}
