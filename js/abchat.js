// AB's conversation brain: a small, hand-written knowledge base about Ahmed.
// Replies in the language the visitor writes in (Arabic script → Arabic), keeps
// the last topic so follow-ups like "and when?" / "وبعدين؟" work, and can
// trigger page actions (projects, contact, CV, intro).
const BORN = 2002;
const age = () => new Date().getFullYear() - BORN;

const norm = s => ' ' + s.toLowerCase()
  .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْـ]/g, '')
  .replace(/[?؟!.,،:;"'()]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';

// Each topic: words that point to it (EN + AR, MSA and Saudi), and answers.
const T = [
  { id: 'hello', w: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'salam', 'مرحبا', 'هلا', 'هلا والله', 'السلام', 'سلام', 'اهلين', 'اهلا', 'صباح', 'مساء'],
    en: () => "Hi! I'm AB, Ahmed's assistant. Ask me anything about him: where he studied, his projects, his experience, or how to reach him.",
    ar: () => 'هلا والله! أنا AB، مساعد أحمد. اسألني أي شي عنه: وين درس، مشاريعه، خبراته، أو كيف تتواصل معه.' },
  { id: 'howareyou', w: ['how are you', 'how r u', 'how is it going', 'كيفك', 'كيف حالك', 'شلونك', 'كيف الحال', 'وش اخبارك', 'علومك'],
    en: () => "I'm great, thanks for asking! What would you like to know about Ahmed?",
    ar: () => 'بخير الحمدلله، يسلم سؤالك! وش تحب تعرف عن أحمد؟' },
  { id: 'bot', w: ['who are you', 'what are you', 'who made you', 'who built you', 'مين سواك', 'مين صنعك', 'are you a bot', 'are you ai', 'your name', 'مين انت', 'من انت', 'وش انت', 'انت بوت', 'اسمك'],
    en: () => "I'm AB, a small assistant Ahmed built into his portfolio. I know the facts about him, and I can take you around the site.",
    ar: () => 'أنا AB، مساعد صغير بناه أحمد داخل موقعه. أعرف المعلومات الأساسية عنه، وأقدر أوديك لأي قسم في الموقع.' },
  { id: 'who', w: ['who is', 'about ahmed', 'tell me about ahmed', 'tell me about him', 'introduce', 'what does he do', 'what does ahmed do', 'وش يسوي', 'ايش يسوي', 'وش شغله', 'who s ahmed', 'مين احمد', 'من هو', 'عرفني', 'عن احمد', 'نبذه', 'تعريف'],
    en: () => 'Ahmed Bawazir is a software engineer and Oracle Fusion HCM consultant based in Riyadh. He builds full-stack products, like Codai, UFC Ticketing and EasyCal, and configures enterprise HR systems.',
    ar: () => 'أحمد باوزير مهندس برمجيات ومستشار Oracle Fusion HCM، مقيم في الرياض. يبني منتجات كاملة مثل Codai وUFC Ticketing وEasyCal، ويهيّئ أنظمة الموارد البشرية للشركات.',
    more: { en: () => 'He was born in 2002, studied Software Engineering in Malaysia, and graduated with First Class Honours.', ar: () => 'من مواليد 2002، درس هندسة البرمجيات في ماليزيا، وتخرّج بمرتبة الشرف الأولى.' } },
  { id: 'age', w: ['how old', 'age', 'born', 'birth', 'birthday', 'year of birth', 'كم عمره', 'عمره', 'العمر', 'مواليد', 'ميلاد', 'تولد', 'انولد', 'كم سنه'],
    en: () => `Ahmed was born in 2002, so he's about ${age()}.`,
    ar: () => `أحمد من مواليد عام 2002، يعني عمره تقريباً ${age()} سنة.` },
  { id: 'study', w: ['study', 'studied', 'university', 'uni', 'college', 'degree', 'education', 'graduate', 'graduated', 'school', 'major', 'درس', 'دراسه', 'جامعه', 'الجامعه', 'تخرج', 'تخصص', 'شهادته', 'بكالوريوس', 'كليه'],
    en: () => 'Ahmed studied in Malaysia, at Universiti Tenaga Nasional (UNITEN). He earned a Bachelor of Computer Science (Hons.) in Software Engineering, 2023 to 2026.',
    ar: () => 'درس أحمد في ماليزيا، في جامعة تيناغا الوطنية (UNITEN). أخذ بكالوريوس علوم الحاسب مع مرتبة الشرف، تخصص هندسة البرمجيات، من 2023 إلى 2026.',
    more: { en: () => 'He graduated with First Class Honours, CGPA 3.63 out of 4. His final-year project was Codai.', ar: () => 'تخرّج بمرتبة الشرف الأولى بمعدل 3.63 من 4، ومشروع تخرّجه كان Codai.' } },
  { id: 'country', w: ['which country', 'what country', 'malaysia', 'abroad', 'kuala lumpur', 'kajang', 'باي دوله', 'اي دوله', 'وين درس', 'ماليزيا', 'برا', 'الخارج', 'كوالالمبور'],
    en: () => 'Ahmed studied in Malaysia, at Universiti Tenaga Nasional (UNITEN), near Kuala Lumpur: a Bachelor of Computer Science (Hons.) in Software Engineering.',
    ar: () => 'درس أحمد في ماليزيا، في جامعة تيناغا الوطنية (UNITEN) قريب من كوالالمبور: بكالوريوس علوم الحاسب مع مرتبة الشرف، تخصص هندسة البرمجيات.',
    more: { en: () => 'He graduated in 2026 with First Class Honours, CGPA 3.63 out of 4. His final-year project was Codai.', ar: () => 'تخرّج سنة 2026 بمرتبة الشرف الأولى بمعدل 3.63 من 4، ومشروع تخرّجه كان Codai.' } },
  { id: 'gpa', w: ['gpa', 'cgpa', 'grade', 'grades', 'honours', 'honors', 'first class', 'معدل', 'المعدل', 'درجات', 'تقدير', 'مرتبه الشرف'],
    en: () => 'First Class Honours, with a CGPA of 3.63 out of 4.',
    ar: () => 'مرتبة الشرف الأولى، بمعدل تراكمي 3.63 من 4.' },
  { id: 'where', w: ['where does he live', 'where is he', 'based', 'location', 'live', 'lives', 'city', 'where is he from', 'وين يسكن', 'يسكن', 'ساكن', 'مكانه', 'وين هو', 'مدينه', 'من وين'],
    en: () => "Ahmed is based in Riyadh, Saudi Arabia. That's where he grew up, too.",
    ar: () => 'أحمد مقيم في الرياض، وفيها تربّى بعد.' },
  { id: 'job', w: ['job', 'work', 'experience', 'career', 'company', 'intern', 'internship', 'worked', 'macquires', 'doing now', 'خبره', 'خبرات', 'خبرته', 'وظيفه', 'يشتغل', 'اشتغل', 'شغله', 'تدريب', 'شركه', 'عمل'],
    en: () => 'Most recently, Ahmed was an Oracle Fusion HCM Consultant Intern at Macquires in Riyadh (June to August 2026). Before that, he worked part-time as a Software Engineer for a company in Doha, remotely (February to May 2026).',
    ar: () => 'آخر خبرة لأحمد كانت متدرّب مستشار Oracle Fusion HCM في شركة Macquires بالرياض (من يونيو إلى أغسطس 2026). وقبلها اشتغل مهندس برمجيات بدوام جزئي عن بُعد لشركة في الدوحة (من فبراير إلى مايو 2026).',
    more: { en: () => 'At Macquires he configured Core HR, absence management, payroll links, DFFs, value sets and Groovy triggers, and ran end-to-end testing.', ar: () => 'في Macquires هيّأ Core HR وإدارة الإجازات وربطها بالرواتب، وبنى DFFs وValue Sets وGroovy triggers، وسوّى اختبارات كاملة.' } },
  { id: 'hcm', w: ['oracle', 'hcm', 'fusion', 'hr system', 'payroll', 'اوراكل', 'موارد بشريه', 'رواتب'],
    en: () => 'In Oracle Fusion HCM, Ahmed works on Core HR, Workforce Structures, Absence Management, Documents of Record and Payroll, plus DFFs, value sets, Groovy/ADF, OTBI and BI Publisher.',
    ar: () => 'في Oracle Fusion HCM يشتغل أحمد على Core HR وWorkforce Structures وإدارة الإجازات وDocuments of Record والرواتب، ومعها DFFs وValue Sets وGroovy/ADF وOTBI وBI Publisher.' },
  { id: 'projects', w: ['project', 'projects', 'portfolio', 'built', 'build', 'apps', 'مشاريع', 'المشاريع', 'مشروع', 'اعماله', 'سوى', 'بنى'], act: 'projects',
    en: () => 'His main projects are Codai, an AI assistant for software engineers; UFC Ticketing, a full-stack booking system; and EasyCal, an Android calorie tracker. I’ll scroll you to them.',
    ar: () => 'أبرز مشاريعه: Codai مساعد ذكي لمهندسي البرمجيات، وUFC Ticketing نظام حجز تذاكر كامل، وEasyCal تطبيق أندرويد لحساب السعرات. بوديك لها الحين.' },
  { id: 'codai', w: ['codai', 'final year', 'fyp', 'graduation project', 'كوداي', 'مشروع التخرج'],
    en: () => 'Codai is Ahmed’s final-year project: a web assistant for software engineers. It can generate the project idea itself, then requirements, UML diagrams, a database schema, code and test cases, all in one place.',
    ar: () => 'Codai هو مشروع تخرّج أحمد: مساعد ويب لمهندسي البرمجيات. يقدر يولّد فكرة المشروع نفسها، وبعدها المتطلبات ومخططات UML وتصميم قاعدة البيانات والكود وحالات الاختبار، كلها بمكان واحد.' },
  { id: 'ufc', w: ['ufc', 'ticket', 'ticketing', 'booking', 'تذاكر', 'حجز'],
    en: () => 'UFC Ticketing is a full-stack event booking system in PHP and MySQL, with user and admin sides, seat booking and the back-end logic behind it.',
    ar: () => 'UFC Ticketing نظام حجز فعاليات كامل بـ PHP وMySQL، فيه واجهة للمستخدم ولوحة للأدمن، وحجز مقاعد، والمنطق الخلفي كامل.' },
  { id: 'easycal', w: ['easycal', 'calorie', 'calories', 'maui', 'mobile app', 'android', 'سعرات', 'تطبيق جوال', 'اندرويد'],
    en: () => 'EasyCal is an Android calorie-tracking app Ahmed built with C# and .NET MAUI, from the UI to debugging and testing.',
    ar: () => 'EasyCal تطبيق أندرويد لحساب السعرات، بناه أحمد بـ C# و.NET MAUI، من الواجهة إلى التصحيح والاختبار.' },
  { id: 'skills', w: ['skill', 'skills', 'stack', 'tech', 'technologies', 'languages does he', 'programming', 'react', 'java', 'مهارات', 'المهارات', 'تقنيات', 'لغات البرمجه', 'برمجه', 'يعرف'],
    en: () => 'He codes in Java, C#, C++, JavaScript and PHP, builds with React, Next.js, Node.js and Tailwind, and works with PostgreSQL, MySQL, Oracle and Supabase. Plus Docker, Figma and Tableau.',
    ar: () => 'يبرمج بـ Java وC# وC++ وJavaScript وPHP، ويبني بـ React وNext.js وNode.js وTailwind، ويتعامل مع PostgreSQL وMySQL وOracle وSupabase. ومعها Docker وFigma وTableau.' },
  { id: 'langs', w: ['speak', 'arabic', 'english', 'language', 'languages', 'يتكلم', 'لغات', 'عربي', 'انجليزي', 'انقليزي'],
    en: () => 'Arabic is his native language, and his English is professional.',
    ar: () => 'العربية لغته الأم، والإنجليزية بمستوى احترافي.' },
  { id: 'certs', w: ['certificate', 'certificates', 'certification', 'certified', 'ccna', 'cisco', 'courses', 'شهادات', 'دورات', 'سيسكو'],
    en: () => 'He holds Cisco CCNA: Introduction to Networks, "Build Smarter AI with Embeddings", and AI Singapore’s AI4I Literacy, AI4I Foundations and AI4E courses.',
    ar: () => 'عنده شهادة Cisco CCNA: Introduction to Networks، ودورة Build Smarter AI with Embeddings، ودورات AI Singapore: ‏AI4I Literacy وAI4I Foundations وAI4E.' },
  { id: 'contact', w: ['contact', 'email', 'reach', 'linkedin', 'hire', 'talk to him', 'اوظف', 'توظيف', 'اوظفه', 'get in touch', 'تواصل', 'اتواصل', 'ايميل', 'بريد', 'لينكدان', 'لنكدان', 'اكلمه', 'رقم'], act: 'contact',
    en: () => 'You can email Ahmed at aaa.bawazir0@gmail.com, or find him on LinkedIn. I’ll take you to the contact section.',
    ar: () => 'تقدر تراسل أحمد على aaa.bawazir0@gmail.com، أو تلقاه في LinkedIn. بوديك لقسم التواصل.' },
  { id: 'available', w: ['available', 'open to', 'looking for', 'opportunit', 'hiring', 'freelance', 'full time', 'متاح', 'يدور', 'فرصه', 'فرص', 'وظيفه جديده', 'دوام'],
    en: () => 'Yes, Ahmed is open to opportunities, in software engineering or Oracle Fusion HCM, in Riyadh or remote.',
    ar: () => 'إيه، أحمد متاح للفرص، في هندسة البرمجيات أو Oracle Fusion HCM، في الرياض أو عن بُعد.' },
  { id: 'why', w: ['why hire', 'why should', 'strength', 'strengths', 'what makes', 'ليش اوظفه', 'ليش اختاره', 'مميزاته', 'نقاط قوته', 'وش يميزه'],
    en: () => 'He sits between code and configuration: he can build a full product and also set up an enterprise HR system. And he likes hunting the edge case nobody thought of before users find it.',
    ar: () => 'يجمع بين البرمجة وتهيئة الأنظمة: يقدر يبني منتج كامل، ويهيّئ نظام موارد بشرية لشركة. ويحب يصيد الحالات الغريبة اللي محد انتبه لها قبل ما يواجهها المستخدم.' },
  { id: 'cv', w: ['cv', 'resume', 'résumé', 'سيره', 'السيره', 'سي في'], act: 'cv',
    en: () => 'Here’s Ahmed’s CV, downloading now.',
    ar: () => 'هذي سيرة أحمد الذاتية، جاري التحميل.' },
  { id: 'intro', w: ['intro', 'video', 'film', 'watch', 'فيديو', 'المقطع', 'الفيلم', 'التعريف', 'شوف'], act: 'intro',
    en: () => 'Playing the 85-second intro.',
    ar: () => 'أبشر، هذا التعريف (85 ثانية).' },
  { id: 'origin', w: ['nationality', 'saudi', 'سعودي', 'جنسيته', 'جنسيه', 'اصله'],
    en: () => 'Ahmed grew up in Riyadh, Saudi Arabia, and he’s based there now.',
    ar: () => 'أحمد تربّى في الرياض، وهو مقيم فيها الحين.' },
  { id: 'dark', w: ['dark mode', 'dark theme', 'night mode', 'الوضع الداكن', 'الوضع الليلي', 'داكن', 'غامق'], act: 'dark',
    en: () => 'Done, dark mode.', ar: () => 'تم، الوضع الداكن.' },
  { id: 'light', w: ['light mode', 'light theme', 'الوضع الفاتح', 'فاتح', 'نهاري'], act: 'light',
    en: () => 'Done, light mode.', ar: () => 'تم، الوضع الفاتح.' },
  { id: 'break', w: ['break the page', 'break this page', 'break it', 'اكسر', 'كسر الصفحه'], act: 'break',
    en: () => 'Okay… breaking the page. Don’t worry, it fixes itself.', ar: () => 'طيب… بكسر الصفحة. لا تخاف، ترجع لحالها.' },
  { id: 'thanks', w: ['thanks', 'thank you', 'thx', 'great', 'awesome', 'nice', 'cool', 'شكرا', 'يعطيك العافيه', 'تسلم', 'مشكور', 'حلو', 'رهيب', 'كفو'],
    en: () => 'My pleasure! Anything else you’d like to know?',
    ar: () => 'العفو، حياك! تبي تعرف شي ثاني؟' },
  { id: 'bye', w: ['bye', 'goodbye', 'see you', 'مع السلامه', 'باي', 'سلامات', 'الله يحفظك'],
    en: () => 'Thanks for stopping by! Don’t forget to say hi to Ahmed.',
    ar: () => 'نوّرت! لا تنسى تسلّم على أحمد.' },
];
const MORE = ['more', 'tell me more', 'and', 'what else', 'go on', 'details', 'زياده', 'كمل', 'بعد', 'وبعدين', 'وش بعد', 'تفاصيل', 'اكثر', 'زود'];

const FALLBACK = {
  en: 'I’m not sure about that one. You can ask me when Ahmed was born, where he studied, his experience, his projects, or how to contact him.',
  ar: 'ما عندي معلومة عن هذا. تقدر تسألني: متى انولد أحمد، وين درس، خبراته، مشاريعه، أو كيف تتواصل معه.',
};
const NOMORE = {
  en: 'That’s the main part. Want to hear about his experience, his projects, or how to reach him?',
  ar: 'هذا أهم شي فيها. تبي أكلمك عن خبراته، مشاريعه، أو كيف تتواصل معه؟',
};
export const SUGGEST = {
  en: ['Who is Ahmed?', 'When was he born?', 'Where did he study?', 'His experience', 'Projects', 'Contact'],
  ar: ['مين أحمد؟', 'متى انولد؟', 'وين درس؟', 'خبراته', 'المشاريع', 'التواصل'],
};

let last = null;
const isAr = s => /[؀-ۿ]/.test(s);

/** Answer one visitor message. Returns { text, lang, act }. */
export function answer(input, pageLang) {
  const lang = isAr(input) ? 'ar' : /[a-z]/i.test(input) ? 'en' : pageLang;
  const t = norm(input);
  // short follow-up: "more?", "وبعدين؟"
  if (last && t.trim().split(' ').length <= 4 && MORE.some(w => t.includes(' ' + norm(w).trim() + ' '))) {
    const r = last.more ? last.more[lang]() : NOMORE[lang]; last = null; return { text: r, lang };
  }
  let best = null, score = 0;
  for (const topic of T) {
    let s = 0;
    for (const w of topic.w) {
      const n = norm(w).trim();
      if (!n) continue;
      if ((n.length <= 3 && /^[a-z]+$/.test(n)) ? t.includes(' ' + n + ' ') : t.includes(n)) s += n.length;
    }
    if (s > score) { score = s; best = topic; }
  }
  if (!best) return { text: FALLBACK[lang], lang };
  last = best;
  return { text: best[lang](), lang, act: best.act };
}

/** True when the message matches a topic AB can answer (used by voice routing). */
export function knows(input) {
  const t = norm(input);
  if (last && t.trim().split(' ').length <= 4 && MORE.some(w => t.includes(' ' + norm(w).trim() + ' '))) return true;
  return T.some(topic => topic.w.some(w => { const n = norm(w).trim(); return n && ((n.length <= 3 && /^[a-z]+$/.test(n)) ? t.includes(' ' + n + ' ') : t.includes(n)); }));
}
